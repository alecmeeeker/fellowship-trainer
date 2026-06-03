/* exam-summary.js — the scored report for a finished mock exam. */
import { el } from "../lib/dom.js";
import { getExamRecord, startExam } from "../services/exam-session.js";
import { loadProject } from "../services/content-loader.js";
import { navigate } from "../router.js";

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m + "m " + String(s % 60).padStart(2, "0") + "s";
}

export function mount(outlet, params) {
  const rec = getExamRecord(params.id);
  const wrap = el("div", { class: "screen__wrap reveal" });
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));

  if (!rec) {
    wrap.append(
      el("div", { class: "h1" }, "Exam Report"),
      el("p", { class: "lead", style: { marginTop: "8px" } }, "That exam report could not be found."),
      el("a", { class: "btn", href: "#/exam", style: { marginTop: "16px", display: "inline-flex" } },
        "Back to Mock Exam"));
    return;
  }

  const pct = rec.maxScore ? Math.round((rec.score / rec.maxScore) * 100) : 0;

  wrap.append(
    el("div", { class: "section-head__kicker", style: { display: "block", marginBottom: "6px" } },
      rec.reason === "time" ? "Time expired" : "Exam submitted"),
    el("div", { class: "h1" }, rec.projectTitle + " — Report"));

  // hero score
  wrap.appendChild(
    el("div", { class: "card card--accent summary-hero", style: { marginTop: "18px", display: "flex", gap: "30px", flexWrap: "wrap" } },
      stat(rec.score + " / " + rec.maxScore, "Score · " + pct + "%"),
      stat(rec.levelsCompleted + " / " + rec.totalLevels, "Levels fully cleared"),
      stat(fmtDuration(rec.durationUsedMs), "Time used of 90m")));

  // per-level table
  wrap.appendChild(el("div", { class: "section-head" },
    el("span", { class: "section-head__kicker" }, "By level"),
    el("span", { class: "section-head__rule" })));
  const rows = rec.perLevel.map((lv) => {
    const ok = lv.status === "completed";
    const cls = ok ? "pill--ok" : lv.status === "attempted" ? "pill--warn" : "";
    return el("div", { class: "card lvl-row", style: { display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px" } },
      el("span", { class: "mono", style: { fontWeight: "700", width: "70px" } }, "Level " + lv.level),
      el("span", { class: "pill " + cls },
        ok ? "complete" : lv.status === "attempted" ? "partial" : "not reached"),
      el("span", { class: "muted mono", style: { fontSize: "11px" } },
        (lv.total ? lv.passed + " / " + lv.total + " tests" : "—")),
      el("span", { style: { flex: "1" } }),
      el("span", { class: "mono", style: { color: ok ? "var(--accent)" : "var(--ink-faint)" } },
        "+" + lv.points));
  });
  wrap.appendChild(el("div", { class: "grid", style: { gap: "8px" } }, rows));

  // the code written
  if (rec.code) {
    const details = el("details", { style: { marginTop: "22px" } },
      el("summary", { class: "mono", style: { cursor: "pointer", fontSize: "12px", color: "var(--ink-dim)" } },
        "View the code you wrote"),
      el("pre", { class: "md__pre", style: { marginTop: "10px", maxHeight: "420px", overflow: "auto" } },
        el("code", null, rec.code)));
    wrap.appendChild(details);
  }

  // coaching
  wrap.appendChild(el("div", { class: "callout callout--tip", style: { marginTop: "20px" } },
    el("span", { class: "callout__glyph" }, "▸"),
    el("div", null, coachingNote(rec))));

  // actions
  const retake = el("button", { class: "btn btn--primary" }, "Retake this exam");
  retake.onclick = async () => {
    retake.disabled = true;
    try {
      const project = await loadProject(rec.projectId);
      const exam = startExam(project);
      navigate("#/exam/" + exam.examId);
    } catch (e) {
      retake.disabled = false;
    }
  };
  wrap.appendChild(el("div", { style: { marginTop: "22px", display: "flex", gap: "10px", flexWrap: "wrap" } },
    retake,
    el("a", { class: "btn btn--ghost", href: "#/exam" }, "Another exam"),
    el("a", { class: "btn btn--ghost", href: "#/projects/" + rec.projectId }, "Practice this untimed"),
    el("a", { class: "btn btn--ghost", href: "#/stats" }, "All exam history")));
}

function stat(big, label) {
  return el("div", null,
    el("div", { class: "mono", style: { fontSize: "26px", fontWeight: "700" } }, big),
    el("div", { class: "card__meta", style: { marginTop: "3px" } }, label));
}

function coachingNote(rec) {
  if (rec.levelsCompleted >= rec.totalLevels) {
    return "All levels cleared. Now chase speed — retake and beat your time, then try a different project cold.";
  }
  if (rec.reason === "time") {
    return "Time ran out. Look at where it went: the Level 4 timestamp refactor is the usual sink. Practice that level untimed, then retake.";
  }
  const next = rec.perLevel.find((l) => l.status !== "completed");
  return "You cleared " + rec.levelsCompleted + " level" + (rec.levelsCompleted === 1 ? "" : "s") +
    ". Open Level " + (next ? next.level : "?") + " in untimed practice, get it solid, then retake the exam.";
}
