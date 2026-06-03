/* cram.js — the prescribed-path "Exam Today" screen.
 *
 * Sequential, single-column checklist. Each step is one of: lesson, drill,
 * mock, break. Progress persists in its own localStorage key so the user can
 * close the tab and resume.
 *
 * Designed for the panicked one-day learner: hard urgency cues (orange-tinted
 * header, time-remaining counter), but every step links straight to the
 * relevant lesson/drill/mock so the user never has to navigate manually.
 */
import { el, clear } from "../lib/dom.js";
import { loadCramPath } from "../services/content-loader.js";

const STORAGE_BASE = "fellowship-trainer:cram-checkboxes:v1";
const EXAM_AT_KEY = "fellowship-trainer:cram-exam-at:v1";

/* Each cram path tracks its own checkbox progress. "exam-today" keeps the
 * original un-suffixed key for backward compatibility; other paths namespace. */
const KNOWN_PATHS = {
  "exam-today": { flag: "EXAM TODAY", label: "Exam-Today Cram" },
  "black-box":  { flag: "BLACK BOX",  label: "Black Box Path" },
};
let activePathId = "exam-today";
function checksKey() {
  return activePathId === "exam-today" ? STORAGE_BASE : STORAGE_BASE + ":" + activePathId;
}

function loadChecks() {
  try {
    const raw = localStorage.getItem(checksKey());
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveChecks(checks) {
  try { localStorage.setItem(checksKey(), JSON.stringify(checks)); }
  catch (_) {}
}

function pathSwitcher() {
  const row = el("div", { class: "cram__switch", style: { display: "flex", gap: "8px", margin: "14px 0 2px" } });
  for (const id of Object.keys(KNOWN_PATHS)) {
    const active = id === activePathId;
    row.appendChild(el("a", {
      href: "#/cram/" + id,
      style: {
        fontFamily: "var(--mono)", fontSize: "12px", textDecoration: "none",
        padding: "6px 14px", borderRadius: "8px",
        border: "1px solid " + (active ? "var(--accent)" : "var(--line)"),
        color: active ? "var(--accent)" : "var(--ink-2, #aab0be)",
        background: active ? "rgba(255,77,94,.08)" : "transparent",
      },
    }, KNOWN_PATHS[id].label));
  }
  return row;
}

function loadExamAt() {
  try { return localStorage.getItem(EXAM_AT_KEY) || ""; }
  catch { return ""; }
}

function saveExamAt(value) {
  try {
    if (value) localStorage.setItem(EXAM_AT_KEY, value);
    else localStorage.removeItem(EXAM_AT_KEY);
  } catch (_) {}
}

function stepKey(blockId, stepIndex) { return blockId + ":" + stepIndex; }

/* A step counts toward REQUIRED time iff it is load_bearing AND not a break.
 * Breaks count as recovery, not as cram time — they belong to neither bucket. */
function isRequired(step) { return !!step.load_bearing && step.kind !== "break"; }
function isOptional(step) { return !step.load_bearing && step.kind !== "break"; }

function hrefForStep(step) {
  if (step.kind === "lesson") return "#/learn/" + step.id;
  if (step.kind === "drill")  return "#/drills/" + step.id;
  if (step.kind === "mock")   return "#/projects/" + step.id;
  return null;
}

function kindLabel(step) {
  if (step.kind === "lesson") return "LESSON";
  if (step.kind === "drill")  return "DRILL";
  if (step.kind === "mock")   return "MOCK EXAM";
  if (step.kind === "break")  return "BREAK";
  return step.kind.toUpperCase();
}

export function mount(outlet, params) {
  let destroyed = false;
  activePathId = (params && params.id && KNOWN_PATHS[params.id]) ? params.id : "exam-today";
  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }),
    el("span", { style: { marginLeft: "10px" } }, "Loading cram path…")));

  (async () => {
    let path;
    try { path = await loadCramPath(activePathId); }
    catch (e) {
      clear(outlet);
      outlet.appendChild(el("div", { class: "centered" }, "Could not load — " + e.message));
      return;
    }
    if (destroyed) return;
    clear(outlet);
    render(outlet, path);
  })();

  return () => {
    destroyed = true;
    if (outlet._cramCleanup) { try { outlet._cramCleanup(); } catch (_) {} }
  };
}

function render(outlet, path) {
  let checks = loadChecks();
  let examAt = loadExamAt();   // ISO datetime-local string

  /* compute totals — required vs optional separated */
  let totalSteps = 0, requiredMin = 0, optionalMin = 0;
  for (const block of path.blocks) {
    for (const step of block.steps) {
      totalSteps += 1;
      const m = step.minutes || 0;
      if (isRequired(step)) requiredMin += m;
      else if (isOptional(step)) optionalMin += m;
    }
  }

  const progressEl = el("div", { class: "cram__progress" });
  const remainEl = el("div", { class: "cram__remain" });
  const examEl = el("div", { class: "cram__exam" });
  let countdownTimer = null;

  function paintProgress() {
    let done = 0, doneReqMin = 0, doneOptMin = 0;
    for (const block of path.blocks) {
      block.steps.forEach((step, i) => {
        if (checks[stepKey(block.id, i)]) {
          done += 1;
          const m = step.minutes || 0;
          if (isRequired(step)) doneReqMin += m;
          else if (isOptional(step)) doneOptMin += m;
        }
      });
    }
    const pct = totalSteps ? Math.round((done / totalSteps) * 100) : 0;
    clear(progressEl);
    progressEl.appendChild(el("div", { class: "cram__progress-bar" },
      el("div", { class: "cram__progress-fill", style: { width: pct + "%" } })));
    progressEl.appendChild(el("div", { class: "cram__progress-meta" },
      el("span", null,
        el("b", null, done + " / " + totalSteps),
        " steps complete"),
      el("span", null,
        fmtHM(doneReqMin) + " of " + fmtHM(requiredMin) + " required logged · ",
        el("span", { class: "cram__progress-opt" }, "+" + fmtHM(optionalMin) + " optional available"))));

    const remainingReq = Math.max(0, requiredMin - doneReqMin);
    const remainingOpt = Math.max(0, optionalMin - doneOptMin);
    clear(remainEl);
    remainEl.appendChild(el("div", { class: "cram__remain-big" }, fmtHM(remainingReq)));
    remainEl.appendChild(el("div", { class: "cram__remain-label" }, "REQUIRED REMAINING"));
    remainEl.appendChild(el("div", { class: "cram__remain-opt" },
      "+ " + fmtHM(remainingOpt) + " optional"));
  }

  /* exam countdown — independent of progress, updates every minute */
  function paintExam() {
    clear(examEl);
    const examInput = el("input", {
      type: "datetime-local",
      class: "cram__exam-input",
      value: examAt || "",
      "aria-label": "Exam date and time",
    });
    examInput.addEventListener("change", () => {
      examAt = examInput.value;
      saveExamAt(examAt);
      paintExam();
    });
    examEl.appendChild(el("div", { class: "cram__exam-label" }, "EXAM AT"));
    examEl.appendChild(examInput);
    if (examAt) {
      const examMs = new Date(examAt).getTime();
      const nowMs = Date.now();
      const diffMin = Math.round((examMs - nowMs) / 60000);
      const badge = el("div", { class: "cram__exam-count" });
      const remainingReq = Math.max(0,
        requiredMin - Object.entries(checks).reduce((s, [k, v]) => {
          if (!v) return s;
          // find the step by key — cheap because total steps small
          for (const block of path.blocks) {
            for (let i = 0; i < block.steps.length; i++) {
              if (stepKey(block.id, i) === k) {
                return s + (isRequired(block.steps[i]) ? (block.steps[i].minutes || 0) : 0);
              }
            }
          }
          return s;
        }, 0));
      if (diffMin <= 0) {
        badge.textContent = "EXAM TIME — go take it";
        badge.classList.add("cram__exam-count--now");
      } else {
        const slack = diffMin - remainingReq;
        const slackLabel = slack >= 0
          ? "+" + fmtHM(slack) + " slack"
          : fmtHM(-slack) + " OVER required time";
        badge.appendChild(el("span", { class: "cram__exam-count-big" }, fmtHM(diffMin)));
        badge.appendChild(el("span", { class: "cram__exam-count-sub" },
          "until exam · ",
          el("b", { class: slack >= 0 ? "ok" : "tight" }, slackLabel)));
        if (slack < 0) badge.classList.add("cram__exam-count--tight");
      }
      examEl.appendChild(badge);
    }
  }

  function startCountdown() {
    if (countdownTimer) return;
    countdownTimer = setInterval(paintExam, 60_000);
  }

  const wrap = el("div", { class: "cram" });

  /* header */
  wrap.appendChild(el("header", { class: "cram__head" },
    el("div", { class: "cram__head-left" },
      el("div", { class: "cram__head-flag" }, (KNOWN_PATHS[activePathId] || KNOWN_PATHS["exam-today"]).flag),
      el("h1", { class: "cram__head-title" }, path.title),
      el("p", { class: "cram__head-sub" }, path.subtitle),
      pathSwitcher(),
      el("p", { class: "cram__head-intro" }, path.intro)),
    el("div", { class: "cram__head-right" }, remainEl, examEl)));

  wrap.appendChild(progressEl);

  /* legend */
  wrap.appendChild(el("div", { class: "cram__legend" },
    el("span", { class: "cram__legend-item" },
      el("span", { class: "cram__chip cram__chip--required" }, "REQUIRED"),
      "non-negotiable — skip and you'll feel it on the exam"),
    el("span", { class: "cram__legend-item" },
      el("span", { class: "cram__chip cram__chip--optional" }, "OPTIONAL"),
      "valuable; skim if the clock is tight"),
    el("span", { class: "cram__legend-item" },
      el("span", { class: "cram__kind cram__kind--lesson" }, "LESSON"),
      el("span", { class: "cram__kind cram__kind--drill" }, "DRILL"),
      el("span", { class: "cram__kind cram__kind--mock" }, "MOCK"),
      el("span", { class: "cram__kind cram__kind--break" }, "BREAK"))));

  /* blocks */
  for (const block of path.blocks) {
    const blockEl = el("section", { class: "cram__block" });
    // Derive the kicker from the title's leading "Block X" prefix so it matches
    // exactly what the title says — earlier kickers used the raw id which
    // showed "Block 2b" / "Block 2c" above titles labeled "Block 2.5" / "Block 2.75".
    const kickerMatch = block.title.match(/^Block\s+[\d.]+/);
    const kicker = kickerMatch ? kickerMatch[0].toUpperCase() : block.id.replace("block-", "Block ");
    blockEl.appendChild(el("div", { class: "cram__block-head" },
      el("div", { class: "cram__block-kicker" }, kicker),
      el("h2", { class: "cram__block-title" }, block.title),
      el("div", { class: "cram__block-meta" }, fmtHM(block.minutes) + " · " + block.steps.length + " steps"),
      el("p", { class: "cram__block-blurb" }, block.blurb)));

    const stepList = el("ol", { class: "cram__steps" });
    block.steps.forEach((step, i) => {
      stepList.appendChild(renderStep(block.id, i, step, checks, () => {
        saveChecks(checks);
        paintProgress();
      }));
    });
    blockEl.appendChild(stepList);
    wrap.appendChild(blockEl);
  }

  /* footer */
  wrap.appendChild(el("footer", { class: "cram__foot" },
    el("p", null,
      "When the cram path is done, ", el("b", null, "close every Claude / ChatGPT / Copilot tab"),
      " and open the real assessment on its own. The assessment's rules forbid AI assistance during the screen."),
    el("p", { style: { marginTop: "8px" } },
      "Source verification for every claim above: ",
      el("a", { href: "#/sources", style: { color: "var(--accent)" } }, "Sources tab →"))));

  // The outlet itself has `overflow: hidden`; scrolling lives on a `.screen`
  // child. Wrap cram in `.screen` so the page scrolls.
  outlet.appendChild(el("div", { class: "screen" }, wrap));
  paintProgress();
  paintExam();
  startCountdown();
  // tear down the countdown when the screen is replaced
  outlet._cramCleanup = () => { if (countdownTimer) clearInterval(countdownTimer); };
}

function renderStep(blockId, index, step, checks, onChange) {
  const key = stepKey(blockId, index);
  const checked = !!checks[key];
  const href = hrefForStep(step);

  const li = el("li", {
    class: "cram__step cram__step--" + step.kind + (checked ? " is-done" : "") +
           (step.load_bearing ? " is-required" : " is-optional"),
  });

  const cb = el("input", {
    type: "checkbox",
    class: "cram__step-cb",
    checked: checked ? "checked" : undefined,
    "aria-label": "Mark step done",
  });
  cb.addEventListener("change", () => {
    if (cb.checked) checks[key] = Date.now();
    else delete checks[key];
    li.classList.toggle("is-done", cb.checked);
    onChange();
  });

  const body = el("div", { class: "cram__step-body" });
  const top = el("div", { class: "cram__step-top" },
    el("span", { class: "cram__kind cram__kind--" + step.kind }, kindLabel(step)),
    step.load_bearing
      ? el("span", { class: "cram__chip cram__chip--required" }, "REQUIRED")
      : el("span", { class: "cram__chip cram__chip--optional" }, "OPTIONAL"),
    el("span", { class: "cram__step-time" }, "~" + step.minutes + " min"));
  body.appendChild(top);

  if (href) {
    body.appendChild(el("a", { class: "cram__step-label", href: href }, step.label));
  } else {
    body.appendChild(el("div", { class: "cram__step-label cram__step-label--break" }, step.label));
  }

  if (step.why) {
    body.appendChild(el("div", { class: "cram__step-why" },
      el("span", { class: "cram__step-why-glyph" }, "▸"),
      el("span", null, step.why)));
  }

  if (href) {
    body.appendChild(el("a", { class: "cram__step-go", href: href }, "Go to step →"));
  }

  li.append(cb, body);
  return li;
}

function fmtHM(min) {
  if (min < 60) return min + "m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? h + "h" : h + "h " + m + "m";
}
