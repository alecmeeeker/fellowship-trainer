/* curriculum.js — the Foundations → Mastery Path (featured) + the full module
 * library. The Path is a guided, ordered route through the five named topics.
 * Progress is tracked two ways: lessons marked complete, and "Your turn"
 * exercises solved (an exercise id is "<lessonId>#<index>"). */
import { el } from "../lib/dom.js";
import { loadCurriculum, loadCramPath } from "../services/content-loader.js";
import { store } from "../services/store.js";

/* Build a set of lesson ids that appear on the cram path so we can flag them
 * in the catalog. Memoize the promise so we only resolve once per screen mount. */
let _cramLessonSet = null;
function cramLessonIds() {
  if (_cramLessonSet) return _cramLessonSet;
  _cramLessonSet = loadCramPath().then((path) => {
    const set = new Set();
    for (const block of path.blocks) {
      for (const step of block.steps) {
        if (step.kind === "lesson") set.add(step.id);
      }
    }
    return set;
  }).catch(() => new Set());
  return _cramLessonSet;
}

export function mount(outlet) {
  let destroyed = false;
  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Curriculum"),
    el("p", { class: "lead", style: { marginTop: "8px" } },
      "A guided path from the absolute basics to mastery of the five skills the assessment names — and the full module library beyond it."));
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));

  const body = el("div");
  wrap.appendChild(body);

  (async () => {
    let cur, cramSet;
    try {
      [cur, cramSet] = await Promise.all([loadCurriculum(), cramLessonIds()]);
    }
    catch (e) { body.appendChild(el("div", { class: "empty" }, "Could not load the curriculum — " + e.message)); return; }
    if (destroyed) return;

    const done = store.state.lessons;
    const isDone = (id) => !!(done[id] && done[id].status === "completed");
    const onCram = (id) => cramSet.has(id);
    const lessonById = {};
    cur.modules.forEach((m) => m.lessons.forEach((l) => { lessonById[l.id] = l; }));

    /* a tiny banner above the catalog telling the user about the cram path */
    body.appendChild(el("a", { href: "#/cram", class: "cram-pointer" },
      el("span", { class: "cram-pointer__flag" }, "▲ EXAM TODAY?"),
      el("span", { class: "cram-pointer__text" },
        "Skip the catalog and follow the guided ",
        el("b", null, "Cram Path"),
        " — lessons below are flagged ON-PATH for that plan."),
      el("span", { class: "cram-pointer__cta" }, "Open Cram Path →")));

    // "Your turn" exercise progress: how many exercise blocks a lesson has,
    // and how many of them carry a "solved" record in the store.
    const ex = {
      total: (l) => (l ? l.blocks.filter((b) => b.type === "exercise").length : 0),
      solved: (id, total) => {
        let n = 0;
        for (let i = 0; i < total; i++) {
          const e = store.state.exercises[id + "#" + i];
          if (e && e.status === "solved") n += 1;
        }
        return n;
      },
    };

    if (cur.paths && cur.paths.length) {
      body.appendChild(renderPath(cur.paths[0], lessonById, isDone, ex));
    }

    body.appendChild(el("div", { class: "section-head" },
      el("span", { class: "section-head__kicker" }, "All modules"),
      el("span", { class: "section-head__rule" })));

    let total = 0, complete = 0, exTotal = 0, exSolved = 0;
    cur.modules.forEach((m) => m.lessons.forEach((l) => {
      total += 1;
      if (isDone(l.id)) complete += 1;
      const t = ex.total(l);
      exTotal += t;
      exSolved += ex.solved(l.id, t);
    }));
    body.appendChild(el("div", { class: "mono muted", style: { fontSize: "11px", marginBottom: "4px" } },
      complete + " / " + total + " lessons complete  ·  " +
      exSolved + " / " + exTotal + " exercises solved across the full library"));

    cur.modules.forEach((m, mi) => {
      const mDone = m.lessons.every((l) => isDone(l.id));
      body.appendChild(el("div", { class: "section-head" },
        el("span", { class: "section-head__kicker" }, "Module " + mi),
        mDone ? el("span", { class: "pill pill--ok" }, "done") : null,
        el("span", { class: "section-head__rule" })));
      body.appendChild(el("div", { class: "h2", style: { marginBottom: "3px" } }, m.title));
      body.appendChild(el("p", { class: "muted", style: { fontSize: "12.5px", marginBottom: "11px" } }, m.blurb));
      body.appendChild(el("div", { class: "grid", style: { gap: "6px" } },
        m.lessons.map((l) => lessonRow(l, isDone, ex, onCram))));
    });
  })();

  return () => { destroyed = true; };
}

/* one labelled progress bar — used for "lessons" and for "exercises" */
function metricBar(label, done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const ok = total > 0 && done === total;
  const fill = el("div", { class: "bar__fill" + (ok ? " bar__fill--ok" : "") });
  setTimeout(() => { fill.style.width = pct + "%"; }, 30);
  return el("div", { class: "pathmetric" },
    el("span", { class: "pathmetric__label mono" }, label),
    el("div", { class: "bar" }, fill),
    el("span", { class: "pathmetric__count mono" }, done + " / " + total));
}

function renderPath(path, lessonById, isDone, ex) {
  const flat = [];
  path.groups.forEach((g) => g.lessons.forEach((id) => flat.push(id)));
  const doneN = flat.filter(isDone).length;
  const allDone = doneN === flat.length;
  const nextId = flat.find((id) => !isDone(id)) || flat[flat.length - 1];

  // exercise totals across only the path's lessons
  let exTot = 0, exDone = 0;
  flat.forEach((id) => {
    const t = ex.total(lessonById[id]);
    exTot += t;
    exDone += ex.solved(id, t);
  });

  const panel = el("div", { class: "pathpanel reveal" });

  panel.append(
    el("div", { class: "pathpanel__head" },
      el("div", null,
        el("div", { class: "pathpanel__kicker" }, "★ Guided Path"),
        el("div", { class: "pathpanel__title" }, path.title)),
      el("a", { class: "btn btn--primary", href: "#/learn/" + nextId },
        doneN === 0 ? "Begin the path ▸" : allDone ? "Review the path ▸" : "Continue the path ▸")),
    el("p", { class: "pathpanel__blurb" }, path.blurb),
    metricBar("lessons", doneN, flat.length),
    metricBar("exercises", exDone, exTot));

  const groups = el("div", { class: "pathgroups" });
  path.groups.forEach((g, gi) => {
    const gd = g.lessons.filter(isDone).length;
    const steps = el("ol", { class: "pathsteps" });
    g.lessons.forEach((id) => {
      const l = lessonById[id];
      const d = isDone(id);
      const isNext = id === nextId && !allDone;
      const et = ex.total(l);
      const es = ex.solved(id, et);
      steps.appendChild(
        el("li", null,
          el("a", {
            class: "pathstep" + (d ? " is-done" : "") + (isNext ? " is-next" : ""),
            href: "#/learn/" + id,
          },
            el("span", { class: "pathstep__mark" }, d ? "✓" : isNext ? "▸" : "○"),
            el("span", { class: "pathstep__name" }, l ? l.title : id),
            et ? el("span", { class: "pathstep__ex mono" + (es === et ? " is-done" : "") },
              es + "/" + et) : null)));
    });
    groups.appendChild(
      el("div", { class: "pathgroup" },
        el("div", { class: "pathgroup__head" },
          el("span", { class: "pathgroup__num" }, String(gi + 1)),
          el("span", { class: "pathgroup__title" }, g.title),
          el("span", { style: { flex: "1" } }),
          el("span", { class: "mono muted", style: { fontSize: "10px" } }, gd + " / " + g.lessons.length)),
        steps));
  });
  panel.appendChild(groups);
  return panel;
}

function lessonRow(l, isDone, ex, onCram) {
  const d = isDone(l.id);
  const onPath = onCram ? onCram(l.id) : false;
  const et = ex.total(l);
  const es = ex.solved(l.id, et);
  return el("a", { class: "card card--link lesson-row" + (onPath ? " card--cram" : ""),
    href: "#/learn/" + l.id,
    style: { display: "flex", alignItems: "center", gap: "13px", padding: "11px 16px" } },
    el("span", { class: "mono", style: { color: d ? "var(--ok)" : "var(--ink-faint)", width: "14px" } },
      d ? "✓" : "○"),
    el("span", { style: { flex: "1", fontSize: "13.5px" } }, l.title),
    onPath ? el("span", { class: "cram-flag" }, "ON PATH") : null,
    et ? el("span", { class: "pathstep__ex mono" + (es === et ? " is-done" : "") }, es + "/" + et + " ex") : null,
    el("span", { class: "muted mono", style: { fontSize: "10px" } }, (l.minutes || 5) + " min"));
}
