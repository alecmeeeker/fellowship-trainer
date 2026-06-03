/* sources.js — the Sources screen.
 *
 * A curated bibliography of every public URL the trainer is built from.
 * Visual design: a "research log" feel — sticky category index on the left,
 * citation-card rows on the right. Each row carries a kind chip (OFFICIAL,
 * REPO, WRITEUP, FORUM, AGGREGATOR, SPEC), a quoted blurb, and a terminal-
 * style URL prompt at the bottom that's click-to-open and visually marks
 * "this is the source — go verify."
 *
 * Designed to feel distinct from the Reference cheatsheets (which are code
 * snippets) — Sources is for chasing primary evidence, not for skimming
 * syntax under pressure.
 */
import { el, clear } from "../lib/dom.js";
import { loadSources } from "../services/content-loader.js";

const KIND_LABELS = {
  official:   "OFFICIAL",
  repo:       "REPO",
  writeup:    "WRITEUP",
  aggregator: "GUIDE",
  forum:      "FORUM",
  spec:       "SPEC",
};

export function mount(outlet) {
  let destroyed = false;
  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }),
    el("span", { style: { marginLeft: "10px" } }, "Loading sources…")));

  (async () => {
    let categories;
    try { categories = await loadSources(); }
    catch (e) {
      clear(outlet);
      outlet.appendChild(el("div", { class: "centered" }, "Could not load — " + e.message));
      return;
    }
    if (destroyed) return;
    clear(outlet);
    render(outlet, categories);
  })();

  return () => { destroyed = true; };
}

function render(outlet, categories) {
  const totalSources = categories.reduce((sum, c) => sum + c.sources.length, 0);

  const head = el("div", { class: "src__head" },
    el("div", { class: "src__head-kicker" }, "Trainer bibliography"),
    el("h1", { class: "src__head-title" }, "Sources"),
    el("p", { class: "src__head-lead" },
      "Every public link the trainer is built from. ",
      el("b", null, totalSources + " sources"),
      " across " + categories.length + " categories — official CodeSignal docs, " +
      "Anthropic primary pages, GitHub practice repos, candidate writeups, " +
      "company-specific guides, and forum anecdotes."),
    el("p", { class: "src__head-disclaimer" },
      "Anthropic does NOT publicly name CodeSignal or \"ICA\" on official pages — " +
      "every claim the trainer makes about the assessment shape is sourced to ", el("br"),
      "either CodeSignal's own KB or to third-party candidate reports. Each citation says which."));

  const layout = el("div", { class: "src__layout" });
  const sidebar = el("aside", { class: "src__sidebar" });
  const main = el("div", { class: "src__main" });
  layout.append(sidebar, main);

  const sidebarLinks = {};
  sidebar.appendChild(el("div", { class: "src__sidebar-kicker" }, "Categories"));
  for (const c of categories) {
    const a = el("a", { class: "src__nav", href: "#sources-" + c.id },
      el("span", { class: "src__nav-bullet" }),
      el("span", { class: "src__nav-label" }, c.title),
      el("span", { class: "src__nav-count" }, String(c.sources.length)));
    sidebarLinks[c.id] = a;
    sidebar.appendChild(a);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById("sources-" + c.id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#/sources");
      }
    });
  }

  for (const category of categories) {
    main.appendChild(renderCategory(category));
  }

  // The outlet itself has `overflow: hidden`; the `.screen` child is the
  // scroll container. Wrap our content in `.screen` and bind scroll-spy to
  // it (not the outlet).
  const scroller = el("div", { class: "screen" }, el("div", { class: "src" }, head, layout));
  outlet.appendChild(scroller);

  // simple scroll-spy: highlight the closest section above the viewport
  const sectionEls = categories.map((c) => ({
    id: c.id,
    node: document.getElementById("sources-" + c.id),
  })).filter((s) => s.node);

  function updateSpy() {
    const top = scroller.scrollTop + 80;
    let active = sectionEls[0];
    for (const s of sectionEls) {
      if (s.node.offsetTop <= top) active = s;
    }
    for (const id in sidebarLinks) {
      sidebarLinks[id].classList.toggle("is-active", id === active.id);
    }
  }
  scroller.addEventListener("scroll", updateSpy, { passive: true });
  updateSpy();
}

function renderCategory(category) {
  const section = el("section", { class: "src__section", id: "sources-" + category.id });
  section.appendChild(el("div", { class: "src__section-head" },
    el("div", { class: "src__section-kicker" }, "§ " + category.id),
    el("h2", { class: "src__section-title" }, category.title),
    el("p", { class: "src__section-blurb" }, category.blurb)));

  const grid = el("div", { class: "src__grid" });
  for (const source of category.sources) {
    grid.appendChild(renderSource(source));
  }
  section.appendChild(grid);
  return section;
}

function renderSource(s) {
  const kindLabel = KIND_LABELS[s.kind] || s.kind.toUpperCase();
  const card = el("a", {
    class: "src__card src__card--" + s.kind,
    href: s.url,
    target: "_blank",
    rel: "noopener noreferrer",
  });
  card.appendChild(el("div", { class: "src__card-top" },
    el("span", { class: "src__kind src__kind--" + s.kind }, kindLabel)));
  card.appendChild(el("div", { class: "src__card-title" }, s.title));
  card.appendChild(el("div", { class: "src__card-blurb" }, s.blurb));
  card.appendChild(el("div", { class: "src__card-url" },
    el("span", { class: "src__card-url-prompt" }, "↗"),
    el("span", { class: "src__card-url-text" }, shortenUrl(s.url))));
  return card;
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    const full = u.host + path;
    return full.length > 64 ? full.slice(0, 61) + "…" : full;
  } catch {
    return url;
  }
}
