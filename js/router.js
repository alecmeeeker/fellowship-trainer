/* router.js — hash routing. Each screen module exports mount(outlet, params)
 * and may return a cleanup function. Routes for screens not yet built point at
 * the placeholder; they are swapped in as later build phases land. */

import { clear } from "./lib/dom.js";
import * as dashboard from "./screens/dashboard.js";
import * as curriculum from "./screens/curriculum.js";
import * as lesson from "./screens/lesson.js";
import * as drills from "./screens/drills.js";
import * as drill from "./screens/drill.js";
import * as projects from "./screens/projects.js";
import * as project from "./screens/project.js";
import * as exam from "./screens/exam.js";
import * as examSummary from "./screens/exam-summary.js";
import * as reference from "./screens/reference.js";
import * as sources from "./screens/sources.js";
import * as cram from "./screens/cram.js";
import * as stats from "./screens/stats.js";

const ROUTES = [
  { re: /^#?\/?$/,                    screen: dashboard,   nav: "dashboard", title: "Dashboard" },
  { re: /^#\/dashboard\/?$/,          screen: dashboard,   nav: "dashboard", title: "Dashboard" },
  { re: /^#\/learn\/?$/,              screen: curriculum,  nav: "learn",     title: "Curriculum" },
  { re: /^#\/learn\/([^/]+)\/?$/,     screen: lesson,      nav: "learn",     title: "Lesson",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/drills\/?$/,             screen: drills,      nav: "drills",    title: "Drills" },
  { re: /^#\/drills\/([^/]+)\/?$/,    screen: drill,       nav: "drills",    title: "Drill",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/projects\/?$/,           screen: projects,    nav: "projects",  title: "Projects" },
  { re: /^#\/projects\/([^/]+)\/?$/,  screen: project,     nav: "projects",  title: "Project",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/exam\/?$/,               screen: exam,        nav: "exam",      title: "Mock Exam" },
  { re: /^#\/exam\/([^/]+)\/summary\/?$/, screen: examSummary, nav: "exam",  title: "Exam Report",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/exam\/([^/]+)\/?$/,      screen: exam,        nav: "exam",      title: "Mock Exam",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/reference\/?$/,          screen: reference,   nav: "reference", title: "Reference" },
  { re: /^#\/reference\/([^/]+)\/?$/, screen: reference,   nav: "reference", title: "Reference",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/sources\/?$/,            screen: sources,     nav: "sources",   title: "Sources" },
  { re: /^#\/cram\/([\w-]+)\/?$/,     screen: cram,        nav: "cram",      title: "Cram Path",
    params: (m) => ({ id: m[1] }) },
  { re: /^#\/cram\/?$/,               screen: cram,        nav: "cram",      title: "Cram Path" },
  { re: /^#\/stats\/?$/,              screen: stats,       nav: "stats",     title: "Stats" },
];

let currentCleanup = null;

export function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

export function startRouter(shell) {
  window.addEventListener("hashchange", () => render(shell));
  render(shell);
}

let _shell = null;

function render(shell) {
  if (shell) _shell = shell;
  shell = _shell;
  const hash = location.hash || "#/";
  let route = null;
  let match = null;
  for (const r of ROUTES) {
    const m = hash.match(r.re);
    if (m) { route = r; match = m; break; }
  }
  if (!route) { route = ROUTES[0]; match = []; }

  const params = route.params ? route.params(match) : {};

  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch (_) {}
  }
  currentCleanup = null;

  clear(shell.outlet);
  shell.setActive(route.nav);
  shell.setTitle(route.title);
  shell.outlet.scrollTop = 0;

  try {
    const cleanup = route.screen.mount(shell.outlet, params);
    if (typeof cleanup === "function") currentCleanup = cleanup;
  } catch (err) {
    console.error("screen mount failed", err);
    shell.outlet.appendChild(
      Object.assign(document.createElement("div"), {
        className: "centered",
        textContent: "This screen failed to load: " + err.message,
      })
    );
  }
}
