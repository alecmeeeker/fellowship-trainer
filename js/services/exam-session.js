/* exam-session.js — the timed mock-exam state machine. One active exam at a
 * time, stored in store.exams.active so a reload resumes it seamlessly. */
import { store } from "./store.js";

export const EXAM_DURATION_MS = 90 * 60 * 1000;

export function getActiveExam() {
  return store.state.exams.active;
}

export function isExpired(exam) {
  return !!exam && Date.now() >= exam.deadline;
}

export function startExam(project) {
  const now = Date.now();
  const exam = {
    examId: "exam-" + now,
    projectId: project.id,
    projectTitle: project.title,
    startedAt: now,
    deadline: now + EXAM_DURATION_MS,
    durationMs: EXAM_DURATION_MS,
    totalLevels: project.levels.length,
    maxScore: project.levels.reduce((s, l) => s + (l.points || 0), 0),
    code: project.starterCode,
    unlockedLevel: 1,
    viewLevel: 1,
    levels: {},
    score: 0,
  };
  store.state.exams.active = exam;
  store.commitNow();
  return exam;
}

export function saveExamState(patch) {
  const e = store.state.exams.active;
  if (!e) return;
  Object.assign(e, patch);
  store.commit();
}

export function recordExamRun(byLevel, pointsPerLevel) {
  const e = store.state.exams.active;
  if (!e) return { newlyCompleted: [], unlocked: null };
  const newlyCompleted = [];
  let unlocked = null;
  for (const [lvlStr, r] of Object.entries(byLevel)) {
    const lvl = Number(lvlStr);
    const wasComplete = e.levels[lvl] && e.levels[lvl].status === "completed";
    const allPass = r.total > 0 && r.passed === r.total;
    const prev = e.levels[lvl] || {};
    e.levels[lvl] = {
      status: allPass ? "completed" : "attempted",
      passed: r.passed,
      total: r.total,
      points: allPass ? (pointsPerLevel[lvl] || 0) : 0,
      completedAt: allPass ? (prev.completedAt || Date.now()) : (prev.completedAt || 0),
    };
    if (allPass && !wasComplete) newlyCompleted.push(lvl);
  }
  while (e.unlockedLevel < e.totalLevels &&
         e.levels[e.unlockedLevel] && e.levels[e.unlockedLevel].status === "completed") {
    e.unlockedLevel += 1;
    unlocked = e.unlockedLevel;
  }
  e.score = Object.values(e.levels).reduce((s, l) => s + (l.points || 0), 0);
  store.commit();
  return { newlyCompleted, unlocked };
}

export function finishExam(reason) {
  const e = store.state.exams.active;
  if (!e) return null;
  const endedAt = Date.now();
  const perLevel = [];
  let completed = 0;
  for (let n = 1; n <= e.totalLevels; n++) {
    const lv = e.levels[n] || { status: "not attempted", passed: 0, total: 0, points: 0 };
    if (lv.status === "completed") completed += 1;
    perLevel.push({
      level: n, status: lv.status,
      passed: lv.passed || 0, total: lv.total || 0, points: lv.points || 0,
    });
  }
  const record = {
    examId: e.examId,
    projectId: e.projectId,
    projectTitle: e.projectTitle,
    startedAt: e.startedAt,
    endedAt,
    durationUsedMs: Math.min(Math.max(0, endedAt - e.startedAt), e.durationMs),
    timeAllowedMs: e.durationMs,
    score: e.score,
    maxScore: e.maxScore,
    levelsCompleted: completed,
    totalLevels: e.totalLevels,
    reason: reason || "submitted",
    code: e.code,
    perLevel,
  };
  store.state.exams.history.unshift(record);
  store.state.exams.active = null;
  store.recordActivity();
  store.commitNow();
  return record;
}

export function getExamRecord(examId) {
  return store.state.exams.history.find((r) => r.examId === examId) || null;
}
