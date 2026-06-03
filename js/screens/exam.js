/* exam.js — mock-exam config (#/exam) and the timed runner (#/exam/:examId). */
import { el, clear, toast } from "../lib/dom.js";
import { runner } from "../engine/runner-client.js";
import { loadProject, loadManifest } from "../services/content-loader.js";
import { createIDE } from "../components/ide.js";
import { createTimer } from "../components/timer.js";
import { attachWorkSplitToggle } from "../lib/mobile.js";
import { renderMarkdown } from "../lib/markdown.js";
import { navigate } from "../router.js";
import {
  getActiveExam, isExpired, startExam, saveExamState,
  recordExamRun, finishExam,
} from "../services/exam-session.js";

export function mount(outlet, params) {
  if (params && params.id) return mountRunner(outlet, params.id);
  return mountConfig(outlet);
}

/* ---------- config screen ---------- */
function mountConfig(outlet) {
  let destroyed = false;
  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Mock Exam"),
    el("p", { class: "lead", style: { marginTop: "8px" } },
      "A timed 90-minute simulation — one project, one continuous clock. " +
      "The timer keeps running through tab switches and reloads, exactly like the real assessment. ",
      el("b", null, "Pick a 4-level mock"),
      " to rehearse the real multi-level assessment shape; the 6-level extended exams " +
      "are longer but give you more reps on each capability."));
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));

  const active = getActiveExam();
  if (active && isExpired(active)) {
    const rec = finishExam("time");
    wrap.appendChild(el("div", { class: "callout callout--warn", style: { marginTop: "20px" } },
      el("span", { class: "callout__glyph" }, "!"),
      el("div", null, "Your previous exam ran out of time. ",
        el("a", { href: "#/exam/" + rec.examId + "/summary",
          style: { color: "var(--accent)", fontFamily: "var(--mono)" } }, "See the report →"))));
  } else if (active) {
    wrap.appendChild(resumeCard(active));
  }

  const body = el("div");
  wrap.appendChild(body);

  (async () => {
    let manifest;
    try { manifest = await loadManifest(); }
    catch (e) { body.appendChild(el("div", { class: "empty" }, "Could not load: " + e.message)); return; }
    if (destroyed) return;
    const ready = manifest.projects.filter((p) => p.status === "ready");
    const ica = ready.filter((p) => p.track === "core");
    const extExam = ready.filter((p) => p.track === "extended" && p.kind === "exam");
    const extPractice = ready.filter((p) => p.track === "extended" && p.kind === "practice");
    const hasActive = !!getActiveExam() && !isExpired(getActiveExam());

    if (ica.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Exam-faithful · 4-level mocks"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "track-banner" },
        el("b", null, "The real assessment shape."),
        " 4 levels × 250 pts = 1000 max (normalized to 600). ",
        el("b", null, "Recommended for exam rehearsal."),
        " 90 minutes is plenty for L1-L3 if you're moving."));
      body.appendChild(el("div", { class: "grid grid--auto" },
        ica.map((p) => examCard(p, hasActive, "core"))));
    }

    if (extExam.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Extended · 6-level exam-only"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "track-banner track-banner--extended" },
        el("b", null, "Longer than the real exam."),
        " 6 levels × 100 pts = 600 max. Fresh projects you have not seen in the practice catalog — useful for a second exam under the clock."));
      body.appendChild(el("div", { class: "grid grid--auto" },
        extExam.map((p) => examCard(p, hasActive, "extended"))));
    }

    if (extPractice.length) {
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Extended · also runnable as an exam"),
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("p", { class: "muted", style: { fontSize: "12px", marginBottom: "12px" } },
        "You can take any extended practice project under the clock too, though you've likely already drilled them."));
      body.appendChild(el("div", { class: "grid grid--auto" },
        extPractice.map((p) => examCard(p, hasActive, "extended"))));
    }

    body.appendChild(el("div", { class: "callout callout--info", style: { marginTop: "20px" } },
      el("span", { class: "callout__glyph" }, "i"),
      el("div", null,
        "Exam conditions: a single 90-minute timer, no reference solutions, no hints. ",
        "Aim to lock each level before moving on — partial credit on a later level beats none. ",
        "For the truest practice, pick a project you have ", el("b", null, "not"), " already drilled.")));
  })();

  return () => { destroyed = true; };
}

function resumeCard(exam) {
  const left = Math.max(0, exam.deadline - Date.now());
  const mins = Math.floor(left / 60000);
  return el("div", { class: "card card--accent", style: { marginTop: "20px" } },
    el("div", { class: "card__title" }, "Exam in progress — " + exam.projectTitle),
    el("div", { class: "card__body" },
      "About " + mins + " minute" + (mins === 1 ? "" : "s") + " left on the clock. " +
      "Levels cleared: " + Object.values(exam.levels).filter((l) => l.status === "completed").length +
      " / " + exam.totalLevels + "."),
    el("div", { style: { marginTop: "12px" } },
      el("a", { class: "btn btn--primary", href: "#/exam/" + exam.examId }, "Resume exam ▸")));
}

function examCard(p, hasActive, track) {
  const start = el("button", { class: "btn btn--primary" }, "Start 90-min exam");
  start.disabled = hasActive;
  start.onclick = async () => {
    start.disabled = true;
    start.textContent = "Loading…";
    try {
      const project = await loadProject(p.id);
      const exam = startExam(project);
      navigate("#/exam/" + exam.examId);
    } catch (e) {
      toast("Could not start: " + e.message, "bad");
      start.disabled = false;
      start.textContent = "Start 90-min exam";
    }
  };
  const trackChip = track === "core"
    ? el("span", { class: "track-chip track-chip--core" },
        el("span", { class: "track-chip__dot" }), "4-LEVEL CORE")
    : el("span", { class: "track-chip track-chip--extended" },
        el("span", { class: "track-chip__dot" }), p.levels + "-LEVEL EXTENDED");
  return el("div", { class: "card" },
    el("div", { class: "card__title" }, p.title),
    el("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" } },
      trackChip,
      el("span", { class: "card__meta", style: { marginBottom: "0" } }, p.domain)),
    el("div", { class: "card__body", style: { marginTop: "10px" } }, p.blurb),
    el("div", { style: { marginTop: "13px" } }, start),
    hasActive ? el("div", { class: "card__meta", style: { marginTop: "8px" } },
      "Finish your active exam first.") : null);
}

/* ---------- timed runner ---------- */
function mountRunner(outlet, examId) {
  const exam = getActiveExam();
  if (!exam || exam.examId !== examId) {
    outlet.appendChild(el("div", { class: "centered" },
      el("div", { style: { textAlign: "center" } },
        el("p", { class: "muted mono" }, "That exam is not active."),
        el("a", { class: "btn", href: "#/exam", style: { marginTop: "14px", display: "inline-flex" } },
          "Back to Mock Exam"))));
    return;
  }
  if (isExpired(exam)) {
    const rec = finishExam("time");
    navigate("#/exam/" + rec.examId + "/summary");
    return;
  }

  let project = null, ide = null, timer = null;
  let totalLevels = exam.totalLevels, totalPoints = exam.maxScore;
  let lastUnlocked = exam.unlockedLevel;
  let saveTimer = null, running = false, destroyed = false;
  let levelSelect, scoreEl, descEl, nextBtn, runBtn, runAllBtn;

  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }),
    el("span", { style: { marginLeft: "10px" } }, "Loading exam…")));

  (async () => {
    try { project = await loadProject(exam.projectId); }
    catch (e) {
      clear(outlet);
      outlet.appendChild(el("div", { class: "centered" }, "Could not load the exam project — " + e.message));
      return;
    }
    if (destroyed) return;
    render();
  })();

  function buildFiles(code) {
    const files = [{ name: project.implFile, role: "impl", editable: true, content: code }];
    for (let n = 1; n <= exam.unlockedLevel; n++) {
      files.push({ name: "level_" + n + ".py", role: "test", editable: false,
        content: project.levels[n - 1].tests });
    }
    return files;
  }

  function render() {
    clear(outlet);

    timer = createTimer(exam.deadline, onTimeUp);
    levelSelect = el("select", { class: "lvlselect" });
    scoreEl = el("span", { class: "scorebar__score" });
    nextBtn = el("button", { class: "btn" }, "Next ▸");
    runBtn = el("button", { class: "btn btn--primary" }, "Run ▸");
    runAllBtn = el("button", { class: "btn btn--ghost" }, "Run all");
    const endBtn = el("button", { class: "btn btn--danger btn--sm" }, "End exam");

    levelSelect.onchange = () => switchLevel(Number(levelSelect.value));
    nextBtn.onclick = () => { if (exam.viewLevel < totalLevels) switchLevel(exam.viewLevel + 1); };
    runBtn.onclick = () => doRun("current");
    runAllBtn.onclick = () => doRun("all");
    endBtn.onclick = endExam;

    descEl = el("div", { class: "desc" });
    ide = createIDE({ onEditImpl: onImplEdit });

    outlet.appendChild(
      el("div", { class: "projscreen" },
        el("div", { class: "scorebar" },
          timer.node,
          el("span", { class: "mono muted", style: { fontSize: "10px" } }, "LEVEL"),
          levelSelect,
          scoreEl,
          el("span", { style: { flex: "1" } }),
          endBtn, runAllBtn, runBtn, nextBtn),
        el("div", { class: "work-split" },
          el("div", { class: "work-split__desc" }, descEl),
          ide.root)));

    attachWorkSplitToggle(outlet.querySelector(".work-split"), ide);
    ide.setFiles(buildFiles(exam.code), project.implFile);
    lastUnlocked = exam.unlockedLevel;
    refreshChrome();
    renderDesc();
    setTimeout(() => ide.refresh(), 40);
  }

  function refreshChrome() {
    clear(levelSelect);
    for (let n = 1; n <= exam.unlockedLevel; n++) {
      const done = exam.levels[n] && exam.levels[n].status === "completed";
      levelSelect.appendChild(el("option", { value: String(n) },
        "Level " + n + " — " + project.levels[n - 1].title + (done ? "  ✓" : "")));
    }
    levelSelect.value = String(exam.viewLevel);
    clear(scoreEl);
    scoreEl.append(el("b", null, String(exam.score)), document.createTextNode(" / " + totalPoints));
    const curDone = exam.levels[exam.viewLevel] && exam.levels[exam.viewLevel].status === "completed";
    nextBtn.style.display = curDone && exam.viewLevel < totalLevels ? "" : "none";
  }

  function renderDesc() {
    clear(descEl);
    const lv = project.levels[exam.viewLevel - 1];
    descEl.appendChild(el("div", { class: "desc__head" },
      el("div", { class: "desc__kicker" }, "Level " + lv.n + " / " + totalLevels + " · timed exam"),
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
    if (n === exam.viewLevel) return;
    const code = ide.getImplCode();
    saveExamState({ code, viewLevel: n });
    ide.setFiles(buildFiles(code), project.implFile);
    refreshChrome();
    renderDesc();
    setTimeout(() => ide.refresh(), 20);
  }

  function onImplEdit(code) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (!destroyed) saveExamState({ code }); }, 600);
  }

  async function doRun(scope) {
    if (running || !ide) return;
    running = true;
    runBtn.disabled = runAllBtn.disabled = true;

    const code = ide.getImplCode();
    saveExamState({ code });

    const levels = scope === "all"
      ? Array.from({ length: exam.unlockedLevel }, (_, i) => i + 1)
      : [exam.viewLevel];
    const files = { [project.implFile]: code };
    const tests = [];
    for (const n of levels) {
      files["level_" + n + ".py"] = project.levels[n - 1].tests;
      tests.push({ module: "level_" + n, level: n });
    }
    const mode = levels.some((n) => project.levels[n - 1].mode === "async") ? "async" : "sync";

    ide.setBusy(true);
    let result;
    try { result = await runner.runTests({ files, tests, mode }); }
    catch (e) { result = { fatal: "Run failed: " + e.message, summary: { total: 0, passed: 0 }, tests: [] }; }
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
    const { newlyCompleted, unlocked } = recordExamRun(byLevel, pts);

    if (exam.unlockedLevel !== lastUnlocked) {
      ide.setFiles(buildFiles(ide.getImplCode()), ide.getActiveName() || project.implFile);
      lastUnlocked = exam.unlockedLevel;
    }
    refreshChrome();
    if (!result.fatal && newlyCompleted.includes(exam.viewLevel)) {
      toast("Level " + exam.viewLevel + " locked in" + (unlocked ? " — Level " + unlocked + " open" : ""), "ok");
    }

    running = false;
    runBtn.disabled = runAllBtn.disabled = false;
  }

  function onTimeUp() {
    if (destroyed) return;
    if (ide) saveExamState({ code: ide.getImplCode() });
    const rec = finishExam("time");
    toast("Time! The exam has been submitted.", "");
    navigate("#/exam/" + rec.examId + "/summary");
  }

  function endExam() {
    const ok = window.confirm(
      "End the exam now?\n\nYour score is locked in and you'll see the report. " +
      "Finishing early is fine — it cannot be resumed afterwards.");
    if (!ok) return;
    if (ide) saveExamState({ code: ide.getImplCode() });
    const rec = finishExam("submitted");
    navigate("#/exam/" + rec.examId + "/summary");
  }

  return () => {
    destroyed = true;
    clearTimeout(saveTimer);
    if (timer) timer.stop();
    if (ide && getActiveExam()) saveExamState({ code: ide.getImplCode() });
  };
}
