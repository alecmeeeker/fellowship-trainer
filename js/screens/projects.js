/* projects.js — catalog of every project, sectioned by track:
 *   - "core": exam-faithful 4-level mock exams (the real assessment shape)
 *   - "extended": 6-level deep-dive practice (longer surface for skill-building)
 */
import { el, clear } from "../lib/dom.js";
import { loadManifest, loadCramPath } from "../services/content-loader.js";
import { projectStats } from "../services/progress.js";

let _cramMockSet = null;
function cramMockIds() {
  if (_cramMockSet) return _cramMockSet;
  _cramMockSet = loadCramPath().then((path) => {
    const set = new Set();
    for (const block of path.blocks) {
      for (const step of block.steps) {
        if (step.kind === "mock") set.add(step.id);
      }
    }
    return set;
  }).catch(() => new Set());
  return _cramMockSet;
}

export function mount(outlet) {
  let destroyed = false;
  const screen = el("div", { class: "screen screen--pad" });
  outlet.appendChild(screen);

  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Progressive Projects"),
    el("p", { class: "lead", style: { marginTop: "8px" } },
      "Each project is one evolving codebase. The ", el("b", null, "exam-faithful 4-level mocks"),
      " mirror the real multi-level assessment exactly; the ",
      el("b", null, "Extended 6-level deep dives"),
      " stretch the same archetypes for skill-building. Pass a level's tests to unlock the next; the test suite is the spec."));
  screen.appendChild(wrap);

  const body = el("div", { style: { marginTop: "8px" } });
  wrap.appendChild(body);

  (async () => {
    let manifest, cramSet;
    try { [manifest, cramSet] = await Promise.all([loadManifest(), cramMockIds()]); }
    catch (e) {
      body.appendChild(el("div", { class: "empty" }, "Could not load the catalog: " + e.message));
      return;
    }
    if (destroyed) return;

    body.appendChild(el("a", { href: "#/cram", class: "cram-pointer" },
      el("span", { class: "cram-pointer__flag" }, "▲ EXAM TODAY?"),
      el("span", { class: "cram-pointer__text" },
        "The Cram Path picks one mock for your first untimed run and another for the timed second pass — projects tagged ",
        el("b", null, "ON PATH"),
        " below are the ones it routes you to."),
      el("span", { class: "cram-pointer__cta" }, "Open Cram Path →")));

    const ica = manifest.projects.filter((p) => p.track === "core");
    const extPractice = manifest.projects.filter((p) => p.track === "extended" && p.kind === "practice");
    const extExam = manifest.projects.filter((p) => p.track === "extended" && p.kind === "exam");

    if (ica.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Exam-faithful · 4-level mocks"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "track-banner" },
        el("b", null, "The real format."),
        " Four progressive levels, 250 pts each (1000 max, normalized to 600). 90 minutes on one clock. " +
        "CRUD → queries → timestamps & TTL → capstone. Each mock is built from an archetype " +
        "widely documented in public practice content and candidate writeups. " +
        "Take these untimed first, then under the exam clock."));
      const grid = el("div", { class: "grid grid--auto" });
      body.appendChild(grid);
      for (const p of ica) grid.appendChild(card(p, "core", cramSet.has(p.id)));
    }

    if (extPractice.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Extended · 6-level deep-dive practice"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "track-banner track-banner--extended" },
        el("b", null, "More surface than the real exam."),
        " Same archetypes stretched across six levels (100 pts each) so you can dig into each capability separately. " +
        "Better for learning how a class evolves over a long refactor than for matching the exam's tempo."));
      const grid = el("div", { class: "grid grid--auto" });
      body.appendChild(grid);
      for (const p of extPractice) grid.appendChild(card(p, "extended", false));
    }

    if (extExam.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Extended · 6-level reserved-for-exam"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("p", { class: "muted", style: { fontSize: "12px", marginBottom: "12px" } },
        "These fresh 6-level projects are reserved for timed runs — start them from the Mock Exam screen."));
      const grid = el("div", { class: "grid grid--auto" });
      body.appendChild(grid);
      for (const p of extExam) grid.appendChild(card(p, "extended", false));
    }
  })();

  return () => { destroyed = true; };
}

function card(p, track, onPath) {
  const stats = p.status === "ready" ? projectStats(p.id, p.levels) : null;
  const done = stats && stats.completed === p.levels;

  const trackChip = track === "core"
    ? el("span", { class: "track-chip track-chip--core" },
        el("span", { class: "track-chip__dot" }), "4-LEVEL CORE")
    : el("span", { class: "track-chip track-chip--extended" },
        el("span", { class: "track-chip__dot" }), p.levels + "-LEVEL EXTENDED");

  const head = el("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
    el("span", { class: "card__title", style: { marginBottom: "0" } }, p.title),
    onPath ? el("span", { class: "cram-flag" }, "ON PATH") : null,
    p.status === "soon" ? el("span", { class: "pill" }, "soon") : null,
    done ? el("span", { class: "pill pill--ok" }, "✓ complete") : null);

  const inner = [
    head,
    el("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" } },
      trackChip,
      el("span", { class: "card__meta", style: { marginBottom: "0" } }, p.domain)),
    el("div", { class: "card__body", style: { marginTop: "10px" } }, p.blurb),
  ];

  if (stats) {
    const pct = Math.round((stats.completed / p.levels) * 100);
    inner.push(el("div", { style: { marginTop: "13px" } },
      el("div", { class: "bar" },
        el("div", { class: "bar__fill" + (done ? " bar__fill--ok" : "") }, el("span", { style: { display: "block" } }))),
      el("div", { class: "card__meta", style: { marginTop: "7px" } },
        stats.completed + " / " + p.levels + " levels  ·  score " + stats.score)));
    // set the bar width after creation
    setTimeout(() => {
      const fill = inner[inner.length - 1].querySelector(".bar__fill");
      if (fill) fill.style.width = pct + "%";
    }, 30);
  }

  if (p.status === "ready") {
    return el("a", { class: "card card--link" + (onPath ? " card--cram" : ""), href: "#/projects/" + p.id }, ...inner);
  }
  return el("div", { class: "card" + (onPath ? " card--cram" : ""), style: { opacity: "0.5" } }, ...inner);
}
