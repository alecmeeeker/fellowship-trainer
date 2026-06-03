/* test-panel.js — renders an engine result object as grouped pass/fail rows. */
import { el, clear } from "../lib/dom.js";

const ICON = { pass: "✓", fail: "✕", error: "!", skip: "‒" };

export function renderTestResults(container, result, opts = {}) {
  clear(container);
  delete container._expanded;

  if (!result) {
    container.appendChild(el("div", { class: "empty" }, "Run your code to check it against the tests."));
    return;
  }
  if (result.fatal) {
    container.appendChild(
      el("div", { class: "trace", style: { margin: "12px" } },
        el("div", { class: "trace__msg" }, result.fatal),
        result.traceback ? result.traceback : "")
    );
    return;
  }
  const tests = result.tests || [];
  if (!tests.length) {
    container.appendChild(el("div", { class: "empty" }, "No tests were found to run."));
    return;
  }

  const groups = new Map();
  for (const t of tests) {
    const k = t.level == null ? 0 : t.level;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }

  for (const key of [...groups.keys()].sort((a, b) => a - b)) {
    const rows = groups.get(key);
    const passed = rows.filter((r) => r.status === "pass").length;
    const ok = passed === rows.length;
    container.appendChild(
      el("div", { class: "testgroup__head" },
        el("span", { class: "dot " + (ok ? "dot--ok" : "dot--bad") }),
        el("span", null, key ? "Level " + key : "Tests"),
        el("span", { class: "testgroup__count" }, passed + " / " + rows.length))
    );
    for (const t of rows) {
      const row = el("div", { class: "testrow testrow--" + t.status + (opts.fresh ? " is-fresh" : "") },
        el("span", { class: "testrow__icon" }, ICON[t.status] || "?"),
        el("span", { class: "testrow__name" }, t.name || t.raw || "test"),
        el("span", { class: "testrow__time" }, t.durationMs != null ? t.durationMs + " ms" : ""));
      container.appendChild(row);

      if ((t.status === "fail" || t.status === "error") && (t.traceback || t.message)) {
        const trace = el("div", { class: "trace", hidden: true },
          t.message ? el("div", { class: "trace__msg" }, t.message) : null,
          t.traceback || "");
        container.appendChild(trace);
        row.style.cursor = "pointer";
        row.title = "Click to show/hide the traceback";
        row.addEventListener("click", () => { trace.hidden = !trace.hidden; });
        if (opts.expandFirstFail && !container._expanded) {
          trace.hidden = false;
          container._expanded = true;
        }
      }
    }
  }
}
