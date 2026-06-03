/* project.js — the 6-level progressive project IDE (untimed practice).
 * Owns the scorebar + level nav + the level spec; embeds the reusable IDE. */
import { el, clear, toast } from "../lib/dom.js";
import { runner } from "../engine/runner-client.js";
import { loadProject } from "../services/content-loader.js";
import { getProject, saveProjectCode, recordProjectRun } from "../services/progress.js";
import { createIDE } from "../components/ide.js";
import { renderMarkdown } from "../lib/markdown.js";
import { attachWorkSplitToggle } from "../lib/mobile.js";

export function mount(outlet, params) {
  const id = params.id;
  let project = null, prog = null, ide = null;
  let viewLevel = 1, totalLevels = 0, totalPoints = 0, lastUnlocked = 0;
  let saveTimer = null, running = false, destroyed = false;

  let levelSelect, scoreEl, descEl, nextBtn, runBtn, runAllBtn, solBtn;

  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }),
    el("span", { style: { marginLeft: "10px" } }, "Loading project…")));

  (async () => {
    try {
      project = await loadProject(id);
    } catch (e) {
      clear(outlet);
      outlet.appendChild(el("div", { class: "centered" }, "Could not load this project — " + e.message));
      return;
    }
    if (destroyed) return;
    totalLevels = project.levels.length;
    totalPoints = project.levels.reduce((s, lv) => s + (lv.points || 0), 0);
    prog = getProject(id);
    viewLevel = Math.min(Math.max(prog.unlockedLevel, 1), totalLevels);
    render();
  })();

  const implCode = () => (prog && prog.code != null ? prog.code : project.starterCode);

  function buildFiles(code) {
    const files = [{ name: project.implFile, role: "impl", editable: true, content: code }];
    // Untimed practice: expose every level's tests so any level can be studied + run.
    for (let n = 1; n <= totalLevels; n++) {
      files.push({ name: "level_" + n + ".py", role: "test", editable: false,
        content: project.levels[n - 1].tests });
    }
    return files;
  }

  function render() {
    clear(outlet);

    levelSelect = el("select", { class: "lvlselect" });
    scoreEl = el("span", { class: "scorebar__score" });
    nextBtn = el("button", { class: "btn" }, "Next level ▸");
    runBtn = el("button", { class: "btn btn--primary" }, "Run ▸");
    runAllBtn = el("button", { class: "btn btn--ghost" }, "Run all");
    solBtn = el("button", { class: "btn btn--ghost btn--sm" }, "Solution");

    levelSelect.onchange = () => switchLevel(Number(levelSelect.value));
    nextBtn.onclick = () => { if (viewLevel < totalLevels) switchLevel(viewLevel + 1); };
    runBtn.onclick = () => doRun("current");
    runAllBtn.onclick = () => doRun("all");
    solBtn.onclick = revealSolution;

    descEl = el("div", { class: "desc" });
    ide = createIDE({ onEditImpl: onImplEdit });

    outlet.appendChild(
      el("div", { class: "projscreen" },
        el("div", { class: "scorebar" },
          el("span", { class: "mono muted", style: { fontSize: "10px", letterSpacing: "0.1em" } }, "LEVEL"),
          levelSelect,
          scoreEl,
          el("span", { style: { flex: "1" } }),
          solBtn, runAllBtn, runBtn, nextBtn),
        el("div", { class: "work-split" },
          el("div", { class: "work-split__desc" }, descEl),
          ide.root)));

    attachWorkSplitToggle(outlet.querySelector(".work-split"), ide);
    ide.setFiles(buildFiles(implCode()), project.implFile);
    lastUnlocked = prog.unlockedLevel;
    refreshChrome();
    renderDesc();
    setTimeout(() => ide.refresh(), 40);
  }

  function refreshChrome() {
    clear(levelSelect);
    // Untimed practice shows ALL levels so the full question can be studied;
    // progress (✓) is still tracked. The timed Mock Exam screen gates by unlock.
    for (let n = 1; n <= totalLevels; n++) {
      const done = prog.levels[n] && prog.levels[n].status === "completed";
      levelSelect.appendChild(el("option", { value: String(n) },
        "Level " + n + " — " + project.levels[n - 1].title + (done ? "  ✓" : "")));
    }
    levelSelect.value = String(viewLevel);
    clear(scoreEl);
    scoreEl.append(el("b", null, String(prog.score)), document.createTextNode(" / " + totalPoints));
    nextBtn.style.display = viewLevel < totalLevels ? "" : "none";
  }

  function renderDesc() {
    clear(descEl);
    const lv = project.levels[viewLevel - 1];
    descEl.appendChild(el("div", { class: "desc__head" },
      el("div", { class: "desc__kicker" },
        "Level " + lv.n + " / " + totalLevels + (project.kind === "exam" ? " · mock exam" : "")),
      el("div", { class: "desc__title" }, lv.title)));
    if (lv.changed) {
      descEl.appendChild(el("div", { class: "callout callout--tip", style: { margin: "0 14px 14px" } },
        el("span", { class: "callout__glyph" }, "▸"),
        el("div", null, lv.changed)));
    }
    descEl.appendChild(el("div", { class: "desc__body" }, renderMarkdown(lv.spec)));
    descEl.scrollTop = 0;
  }

  function switchLevel(n) {
    if (!project || n === viewLevel) return;
    const code = ide.getImplCode();
    saveCode(code);
    viewLevel = n;
    ide.setFiles(buildFiles(code), project.implFile);
    refreshChrome();
    renderDesc();
    setTimeout(() => ide.refresh(), 20);
  }

  function onImplEdit(code) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCode(code), 600);
  }
  function saveCode(code) {
    if (prog && !destroyed) saveProjectCode(id, code);
  }

  function revealSolution() {
    const lv = project.levels[viewLevel - 1];
    if (!lv.solution) return;
    const ok = window.confirm(
      "Load the Level " + viewLevel + " reference solution into the editor?\n\n" +
      "It replaces your current code. Try to solve it yourself first — the learning is in the struggle.");
    if (!ok) return;
    ide.setImplCode(lv.solution);
    saveCode(lv.solution);
    toast("Reference solution loaded", "");
  }

  async function doRun(scope) {
    if (running || !ide) return;
    running = true;
    runBtn.disabled = runAllBtn.disabled = true;

    const code = ide.getImplCode();
    saveCode(code);

    const levels = scope === "all"
      ? Array.from({ length: totalLevels }, (_, i) => i + 1)
      : [viewLevel];

    const files = { [project.implFile]: code };
    const tests = [];
    for (const n of levels) {
      files["level_" + n + ".py"] = project.levels[n - 1].tests;
      tests.push({ module: "level_" + n, level: n });
    }
    const mode = levels.some((n) => project.levels[n - 1].mode === "async") ? "async" : "sync";

    ide.setBusy(true);
    let result;
    try {
      result = await runner.runTests({ files, tests, mode });
    } catch (e) {
      result = { fatal: "Run failed: " + e.message, summary: { total: 0, passed: 0 }, tests: [] };
    }
    if (destroyed) return;
    ide.showTests(result);

    const byLevel = {};
    for (const n of levels) byLevel[n] = { passed: 0, total: 0 };
    for (const t of result.tests || []) {
      if (byLevel[t.level]) {
        byLevel[t.level].total += 1;
        if (t.status === "pass") byLevel[t.level].passed += 1;
      }
    }
    const pts = {};
    project.levels.forEach((lv) => { pts[lv.n] = lv.points; });
    const { newlyCompleted, unlocked } = recordProjectRun(id, byLevel, pts, totalLevels);

    if (prog.unlockedLevel !== lastUnlocked) {
      ide.setFiles(buildFiles(ide.getImplCode()), ide.getActiveName() || project.implFile);
      lastUnlocked = prog.unlockedLevel;
    }
    refreshChrome();

    if (!result.fatal && newlyCompleted.includes(viewLevel)) {
      toast("Level " + viewLevel + " solved" +
        (unlocked ? " — Level " + unlocked + " unlocked" : "") + "  ✓", "ok");
    } else if (!result.fatal && newlyCompleted.length) {
      toast("Cleared level " + newlyCompleted.join(", "), "ok");
    }

    running = false;
    runBtn.disabled = runAllBtn.disabled = false;
  }

  return () => {
    destroyed = true;
    clearTimeout(saveTimer);
    if (ide && prog) saveProjectCode(id, ide.getImplCode());
  };
}
