/* app-shell.js — the persistent chrome: left rail, header, screen outlet. */
import { el, clear } from "./lib/dom.js";
import { store } from "./services/store.js";
import { runner } from "./engine/runner-client.js";

const NAV = [
  { key: "dashboard", label: "Dashboard",  glyph: "◈", href: "#/dashboard" },
  { key: "cram",      label: "Cram Path",  glyph: "▲", href: "#/cram", urgent: true },
  { key: "learn",     label: "Curriculum", glyph: "▤", href: "#/learn" },
  { key: "drills",    label: "Drills",     glyph: "◇", href: "#/drills" },
  { key: "projects",  label: "Projects",   glyph: "▦", href: "#/projects" },
  { key: "exam",      label: "Mock Exam",  glyph: "◷", href: "#/exam" },
  { key: "reference", label: "Reference",  glyph: "✦", href: "#/reference" },
  { key: "sources",   label: "Sources",    glyph: "❉", href: "#/sources" },
  { key: "stats",     label: "Stats",      glyph: "◴", href: "#/stats" },
];

export function buildShell(root) {
  const title = el("span", { class: "header__title" }, "Dashboard");
  const engine = el("span", { class: "engine is-loading" });
  const streakWrap = el("span", { class: "streak" });
  const outlet = el("section", { class: "outlet" });

  const navEls = {};
  const navItems = NAV.map((n) => {
    const cls = "navitem" + (n.urgent ? " navitem--urgent" : "");
    const item = el("a", { class: cls, href: n.href },
      el("span", { class: "navitem__glyph" }, n.glyph),
      el("span", null, n.label));
    navEls[n.key] = item;
    return item;
  });

  // Mobile nav drawer: a hamburger in the header toggles the rail (which CSS
  // turns into an off-canvas drawer below 760px) and a full-screen backdrop.
  const hamburger = el("button", {
    class: "hamburger",
    type: "button",
    "aria-label": "Open navigation",
    "aria-expanded": "false",
  }, "☰");
  const backdrop = el("div", { class: "nav-backdrop", "aria-hidden": "true" });

  const rail = el("aside", { class: "rail" },
    el("div", { class: "rail__brand" },
      el("div", { class: "rail__mark" }, "FELLOWSHIP TRAINER"),
      el("div", { class: "rail__sub" }, "Multi-level coding assessment")),
    el("nav", { class: "rail__nav" },
      el("div", { class: "nav-group-label" }, "Train"),
      navItems),
    el("div", { class: "rail__foot" },
      el("div", { class: "muted mono", style: { fontSize: "9.5px", lineHeight: "1.5" } },
        "Practice tool — used before the assessment. The real test allows no AI.")));

  const shellEl = el("div", { class: "shell" },
    rail,
    el("div", { class: "main" },
      el("header", { class: "header" },
        hamburger,
        title,
        el("span", { class: "header__spacer" }),
        streakWrap,
        engine),
      outlet),
    backdrop);

  function setNav(open) {
    shellEl.classList.toggle("nav-open", open);
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }
  hamburger.addEventListener("click", () => setNav(!shellEl.classList.contains("nav-open")));
  backdrop.addEventListener("click", () => setNav(false));
  // a nav tap navigates (hashchange) — but also close on same-route taps
  rail.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  window.addEventListener("hashchange", () => setNav(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });

  clear(root);
  root.appendChild(shellEl);

  function setEngine(state, message) {
    engine.className = "engine is-" + state;
    clear(engine);
    if (state === "ready") {
      engine.appendChild(el("span", { class: "dot dot--ok" }));
      engine.appendChild(el("span", null, "Python ready"));
    } else if (state === "error") {
      engine.appendChild(el("span", { class: "dot dot--bad" }));
      engine.appendChild(el("span", null, "Engine error"));
      engine.title = message || "";
    } else {
      engine.appendChild(el("span", { class: "dot dot--warn dot--live" }));
      engine.appendChild(el("span", null, "Python loading"));
    }
  }
  setEngine(runner.state || "loading");
  runner.on("status", (s) => setEngine(s.state, s.message));

  function renderStreak() {
    clear(streakWrap);
    const cur = (store.state.stats.streak && store.state.stats.streak.current) || 0;
    if (cur > 0) {
      streakWrap.append(
        el("span", { class: "streak__flame" }, "▲"),
        el("span", { class: "streak__n" }, String(cur)),
        el("span", { class: "muted", style: { fontSize: "10px" } }, "day streak")
      );
    }
  }
  renderStreak();
  store.onChange(renderStreak);

  return {
    outlet,
    setTitle(t) { title.textContent = t; },
    setActive(navKey) {
      for (const [k, node] of Object.entries(navEls)) {
        node.classList.toggle("is-active", k === navKey);
      }
    },
  };
}
