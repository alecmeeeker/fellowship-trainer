/* drill.js — a single focused exercise in a mini-IDE. */
import { el, clear, toast } from "../lib/dom.js";
import { runner } from "../engine/runner-client.js";
import { loadDrills } from "../services/content-loader.js";
import { getDrill, saveDrillCode, recordDrillRun } from "../services/progress.js";
import { createIDE } from "../components/ide.js";
import { renderMarkdown } from "../lib/markdown.js";
import { attachWorkSplitToggle } from "../lib/mobile.js";

export function mount(outlet, params) {
  let drill = null, ide = null, prog = null;
  let saveTimer = null, running = false, destroyed = false;
  let runBtn, solBtn;

  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }), el("span", { style: { marginLeft: "10px" } }, "Loading drill…")));

  (async () => {
    let drills;
    try { drills = await loadDrills(); }
    catch (e) { return fail("Could not load drills — " + e.message); }
    drill = drills.find((d) => d.id === params.id);
    if (!drill) return fail("That drill could not be found.");
    if (destroyed) return;
    prog = getDrill(drill.id);
    render();
  })();

  function fail(msg) {
    clear(outlet);
    outlet.appendChild(el("div", { class: "centered" },
      el("div", { style: { textAlign: "center" } },
        el("p", { class: "muted mono" }, msg),
        el("a", { class: "btn", href: "#/drills", style: { marginTop: "14px", display: "inline-flex" } }, "Back to Drills"))));
  }

  function render() {
    clear(outlet);
    runBtn = el("button", { class: "btn btn--primary" }, "Run tests ▸");
    solBtn = el("button", { class: "btn btn--ghost btn--sm" }, "Solution");
    runBtn.onclick = doRun;
    solBtn.onclick = revealSolution;

    ide = createIDE({ onEditImpl: onEdit });

    const desc = el("div", { class: "desc" },
      el("div", { class: "desc__head" },
        el("div", { class: "desc__kicker" },
          drill.topic + " · difficulty " + drill.difficulty + (drill.mode === "async" ? " · asyncio" : "")),
        el("div", { class: "desc__title" }, drill.title)),
      el("div", { class: "desc__body" }, renderMarkdown(drill.prompt)));

    outlet.appendChild(el("div", { class: "projscreen" },
      el("div", { class: "scorebar" },
        el("a", { class: "btn btn--ghost btn--sm", href: "#/drills" }, "← Drills"),
        el("span", { class: "mono", style: { fontSize: "12px", fontWeight: "700" } }, drill.title),
        prog.status === "solved" ? el("span", { class: "pill pill--ok" }, "✓ solved") : null,
        el("span", { style: { flex: "1" } }),
        solBtn, runBtn),
      el("div", { class: "work-split" },
        el("div", { class: "work-split__desc" }, desc),
        ide.root)));

    attachWorkSplitToggle(outlet.querySelector(".work-split"), ide);
    const code = prog.code != null ? prog.code : drill.starterCode;
    ide.setFiles([
      { name: "solution.py", role: "impl", editable: true, content: code },
      { name: "drill_tests.py", role: "test", editable: false, content: drill.tests },
    ], "solution.py");
    setTimeout(() => ide.refresh(), 40);
  }

  function onEdit(code) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (!destroyed) saveDrillCode(drill.id, code); }, 600);
  }

  function revealSolution() {
    if (!drill.solution) return;
    if (!window.confirm("Load the reference solution? It replaces your code in the editor.")) return;
    ide.setImplCode(drill.solution);
    saveDrillCode(drill.id, drill.solution);
    toast("Reference solution loaded", "");
  }

  async function doRun() {
    if (running || !ide) return;
    running = true;
    runBtn.disabled = true;
    const code = ide.getImplCode();
    saveDrillCode(drill.id, code);
    ide.setBusy(true);
    let result;
    try {
      result = await runner.runTests({
        files: { "solution.py": code, "drill_tests.py": drill.tests },
        tests: [{ module: "drill_tests", level: 1 }],
        mode: drill.mode || "sync",
      });
    } catch (e) {
      result = { fatal: "Run failed: " + e.message, summary: { total: 0, passed: 0 }, tests: [] };
    }
    if (destroyed) return;
    ide.showTests(result);
    if (!result.fatal) {
      const solved = recordDrillRun(drill.id, result.summary);
      if (solved) toast("Drill solved  ✓", "ok");
    }
    running = false;
    runBtn.disabled = false;
  }

  return () => {
    destroyed = true;
    clearTimeout(saveTimer);
    if (ide && drill) saveDrillCode(drill.id, ide.getImplCode());
  };
}
