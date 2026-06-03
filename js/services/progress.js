/* progress.js — domain logic over the store for projects and drills. */
import { store } from "./store.js";

/* ---- projects ---- */

export function getProject(id) {
  let p = store.state.projects[id];
  if (!p) {
    p = { code: null, unlockedLevel: 1, levels: {}, score: 0, updatedAt: 0 };
    store.state.projects[id] = p;
  }
  return p;
}

export function saveProjectCode(id, code) {
  const p = getProject(id);
  p.code = code;
  p.updatedAt = Date.now();
  store.commit();
}

/* Record a run. `byLevel` maps level number -> {passed, total}. A level whose
 * tests ALL passed is marked completed; completing the highest unlocked level
 * unlocks the next. Returns { newlyCompleted:[levels], unlocked:level|null }. */
export function recordProjectRun(id, byLevel, pointsPerLevel, totalLevels) {
  const p = getProject(id);
  const newlyCompleted = [];
  let unlocked = null;

  for (const [lvlStr, r] of Object.entries(byLevel)) {
    const lvl = Number(lvlStr);
    const wasComplete = p.levels[lvl] && p.levels[lvl].status === "completed";
    const allPass = r.total > 0 && r.passed === r.total;
    const prev = p.levels[lvl] || {};
    p.levels[lvl] = {
      status: allPass ? "completed" : "attempted",
      passed: r.passed,
      total: r.total,
      points: allPass ? (pointsPerLevel[lvl] || 0) : 0,
      bestPassed: Math.max(prev.bestPassed || 0, r.passed),
      completedAt: allPass ? (prev.completedAt || Date.now()) : (prev.completedAt || 0),
    };
    if (allPass && !wasComplete) newlyCompleted.push(lvl);
  }

  // unlock: the next level after the highest contiguous completed level
  while (p.unlockedLevel < totalLevels &&
         p.levels[p.unlockedLevel] && p.levels[p.unlockedLevel].status === "completed") {
    p.unlockedLevel += 1;
    unlocked = p.unlockedLevel;
  }

  p.score = Object.values(p.levels).reduce((s, lv) => s + (lv.points || 0), 0);
  p.updatedAt = Date.now();
  store.recordActivity();
  store.commit();
  return { newlyCompleted, unlocked };
}

export function projectStats(id, totalLevels) {
  const p = getProject(id);
  let completed = 0;
  for (let n = 1; n <= totalLevels; n++) {
    if (p.levels[n] && p.levels[n].status === "completed") completed += 1;
  }
  return { completed, unlockedLevel: p.unlockedLevel, score: p.score };
}

/* ---- drills ---- */

export function getDrill(id) {
  let d = store.state.drills[id];
  if (!d) {
    d = { status: "new", code: null, best: { passed: 0, total: 0 }, attempts: 0, lastRunAt: 0 };
    store.state.drills[id] = d;
  }
  return d;
}

export function saveDrillCode(id, code) {
  getDrill(id).code = code;
  store.commit();
}

export function recordDrillRun(id, summary) {
  const d = getDrill(id);
  d.attempts += 1;
  d.lastRunAt = Date.now();
  const allPass = summary.total > 0 && summary.passed === summary.total;
  if (summary.passed >= (d.best.passed || 0)) d.best = { passed: summary.passed, total: summary.total };
  if (allPass) d.status = "solved";
  else if (d.status !== "solved") d.status = "attempted";
  store.recordActivity();
  store.commit();
  return allPass;
}

/* ---- curriculum "Your turn" exercises ---- */

/* An exercise's id is "<lessonId>#<index>", index being its ordinal among
 * the exercise blocks of that lesson. */
export function getExercise(id) {
  let e = store.state.exercises[id];
  if (!e) {
    e = { status: "new", best: { passed: 0, total: 0 }, attempts: 0, lastRunAt: 0 };
    store.state.exercises[id] = e;
  }
  return e;
}

/* Record a Check run. `summary` is the engine's { total, passed, ... }.
 * An exercise whose tests ALL pass is "solved". Returns true when this run
 * solved it. */
export function recordExercise(id, summary) {
  const e = getExercise(id);
  e.attempts += 1;
  e.lastRunAt = Date.now();
  const passed = (summary && summary.passed) || 0;
  const total = (summary && summary.total) || 0;
  const allPass = total > 0 && passed === total;
  if (passed >= (e.best.passed || 0)) e.best = { passed, total };
  if (allPass) e.status = "solved";
  else if (e.status !== "solved") e.status = "attempted";
  store.recordActivity();
  store.commit();
  return allPass;
}
