/* store.js — all progress in one versioned localStorage key.
 * Synchronous reads via store.state; debounced writes via store.commit(). */

const KEY = "fellowship-trainer:v1";

function freshState() {
  return {
    schemaVersion: 1,
    settings: { daysUntilExam: null },
    lessons: {},   // lessonId  -> { status, completedAt }
    exercises: {}, // exId "<lessonId>#<i>" -> { status, best:{passed,total}, attempts, lastRunAt }
    drills: {},    // drillId   -> { status, code, best:{passed,total}, attempts, lastRunAt }
    projects: {},  // projectId -> { code, unlockedLevel, levels:{n:{status,passed,total,points,timeMs,completedAt}}, score }
    exams: { history: [], active: null },
    stats: {
      streak: { current: 0, longest: 0, lastDate: null },
      activity: {},   // "YYYY-MM-DD" -> run count
      totalRuns: 0,
    },
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

class Store {
  constructor() {
    this._state = this._load();
    this._listeners = [];
    this._timer = null;
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === 1) {
          return Object.assign(freshState(), parsed);
        }
      }
    } catch (e) {
      console.warn("store: could not load saved progress —", e);
    }
    return freshState();
  }

  get state() {
    return this._state;
  }

  /* notify listeners + schedule a debounced write */
  commit() {
    this._notify();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._persist(), 450);
  }

  /* notify + write immediately (use before navigations that may unload) */
  commitNow() {
    clearTimeout(this._timer);
    this._persist();
    this._notify();
  }

  _persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this._state));
    } catch (e) {
      console.warn("store: could not save progress —", e);
    }
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this._state); } catch (_) {}
    }
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter((x) => x !== fn); };
  }

  reset() {
    this._state = freshState();
    this.commitNow();
  }

  exportJSON() {
    return JSON.stringify(this._state, null, 2);
  }

  importJSON(text) {
    const parsed = JSON.parse(text);
    this._state = Object.assign(freshState(), parsed, { schemaVersion: 1 });
    this.commitNow();
  }

  /* record a unit of activity today and advance the daily streak */
  recordActivity() {
    const today = todayStr();
    const s = this._state.stats;
    s.activity[today] = (s.activity[today] || 0) + 1;
    s.totalRuns += 1;
    if (s.streak.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      s.streak.current = s.streak.lastDate === yesterday ? s.streak.current + 1 : 1;
      s.streak.longest = Math.max(s.streak.longest, s.streak.current);
      s.streak.lastDate = today;
    }
  }
}

export const store = new Store();
