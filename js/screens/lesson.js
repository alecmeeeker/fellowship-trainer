/* lesson.js — renders one lesson. Path-aware: when the lesson belongs to the
 * Foundations → Mastery Path, the header shows the step number and "continue"
 * follows the path's order rather than raw module order. */
import { el, clear } from "../lib/dom.js";
import { loadCurriculum } from "../services/content-loader.js";
import { renderMarkdown } from "../lib/markdown.js";
import { createEditor } from "../components/editor.js";
import { renderTestResults } from "../components/test-panel.js";
import { runner } from "../engine/runner-client.js";
import { store } from "../services/store.js";
import { recordExercise, getExercise } from "../services/progress.js";
import { navigate } from "../router.js";

export function mount(outlet, params) {
  let destroyed = false;
  const editors = [];
  let exLessonId = null, exSeq = 0;   // identify each "Your turn" exercise as "<lessonId>#<index>"

  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }), el("span", { style: { marginLeft: "10px" } }, "Loading lesson…")));

  (async () => {
    let cur;
    try { cur = await loadCurriculum(); }
    catch (e) { clear(outlet); outlet.appendChild(el("div", { class: "centered" }, "Could not load — " + e.message)); return; }
    if (destroyed) return;
    const flat = [];
    cur.modules.forEach((m) => m.lessons.forEach((l) => flat.push({ l, m })));
    const idx = flat.findIndex((x) => x.l.id === params.id);
    if (idx < 0) {
      clear(outlet);
      outlet.appendChild(el("div", { class: "centered" },
        el("a", { class: "btn", href: "#/learn" }, "Lesson not found — back to Curriculum")));
      return;
    }
    render(cur, flat, idx);
  })();

  function render(cur, flat, idx) {
    clear(outlet);
    const { l, m } = flat[idx];
    const wrap = el("div", { class: "screen__wrap reveal", style: { maxWidth: "760px" } });
    outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));

    const path = cur.paths && cur.paths[0];
    const pathSteps = [];
    if (path) path.groups.forEach((g) => g.lessons.forEach((id) => pathSteps.push(id)));
    const pathIdx = pathSteps.indexOf(l.id);
    const inPath = pathIdx >= 0;

    wrap.append(
      el("a", { href: "#/learn", class: "mono muted", style: { fontSize: "11px" } }, "← Curriculum"),
      el("div", { class: "section-head__kicker", style: { display: "block", marginTop: "16px" } },
        inPath ? "★ Path · step " + (pathIdx + 1) + " of " + pathSteps.length : m.title),
      el("div", { class: "h1", style: { marginTop: "6px" } }, l.title));

    if (l.tags && l.tags.includes("black-box")) {
      wrap.append(el("a", {
        href: "#/cram/black-box",
        class: "mono",
        title: "Part of the Black Box Path — the guided route to the DNS-resolver problem",
        style: {
          display: "inline-block", marginTop: "10px", fontSize: "11px", textDecoration: "none",
          color: "var(--accent)", border: "1px solid var(--accent)",
          borderRadius: "20px", padding: "3px 12px", letterSpacing: "0.08em",
        },
      }, "◆ BLACK BOX PATH"));
    }

    const bodyEl = el("div");
    wrap.appendChild(bodyEl);
    exLessonId = l.id;
    exSeq = 0;
    for (const b of l.blocks) bodyEl.appendChild(renderBlock(b));

    // "next" follows the path when the lesson is in it, else raw module order
    let nextId = null, nextLabel = "";
    if (inPath && pathIdx + 1 < pathSteps.length) {
      nextId = pathSteps[pathIdx + 1];
      const nl = flat.find((x) => x.l.id === nextId);
      nextLabel = nl ? nl.l.title : "";
    } else if (!inPath && flat[idx + 1]) {
      nextId = flat[idx + 1].l.id;
      nextLabel = flat[idx + 1].l.title;
    }

    const doneBtn = el("button", { class: "btn btn--primary" },
      nextId ? "Mark complete & continue ▸" : "Mark complete ✓");
    doneBtn.onclick = () => {
      store.state.lessons[l.id] = { status: "completed", at: Date.now() };
      store.recordActivity();
      store.commit();
      navigate(nextId ? "#/learn/" + nextId : "#/learn");
    };
    const footer = el("div",
      { style: { marginTop: "32px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" } },
      doneBtn);
    if (nextId) {
      footer.appendChild(el("span", { class: "muted mono", style: { fontSize: "11px" } },
        (inPath ? "Next in path — " : "Next — ") + nextLabel));
    } else if (inPath) {
      footer.appendChild(el("span", { class: "mono", style: { fontSize: "11px", color: "var(--ok)" } },
        "Final step of the path ✓"));
    }
    wrap.appendChild(footer);

    setTimeout(() => editors.forEach((e) => e.refresh()), 60);
  }

  function renderBlock(b) {
    if (b.type === "text") return el("div", null, renderMarkdown(b.value));
    if (b.type === "note") {
      const kind = b.kind || "info";
      const glyph = kind === "warn" ? "!" : kind === "tip" ? "▸" : "i";
      return el("div", { class: "callout callout--" + kind, style: { margin: "15px 0" } },
        el("span", { class: "callout__glyph" }, glyph),
        renderMarkdown(b.value));
    }
    if (b.type === "code") {
      return b.run ? runnable(b.value) : el("pre", { class: "md__pre", style: { margin: "13px 0" } }, el("code", null, b.value));
    }
    if (b.type === "quiz") return quiz(b);
    if (b.type === "exercise") return exercise(b);
    return el("span");
  }

  function runnable(code) {
    const host = el("div", { class: "runnable__editor" });
    const ed = createEditor(host, { value: code });
    ed.cm.setOption("viewportMargin", Infinity);
    editors.push(ed);
    const out = el("pre", { class: "runnable__out", hidden: true });
    const btn = el("button", { class: "btn btn--sm btn--primary" }, "▸ Run");
    let busy = false;
    btn.onclick = async () => {
      if (busy) return;
      busy = true;
      btn.disabled = true;
      btn.textContent = "running…";
      const res = await runner.runScript(ed.getValue());
      if (destroyed) return;
      busy = false;
      btn.disabled = false;
      btn.textContent = "▸ Run";
      out.hidden = false;
      clear(out);
      const text = (res.stdout || "") + (res.traceback ? (res.stdout ? "\n" : "") + res.traceback : "");
      out.appendChild(document.createTextNode(text.trim() || "(ran — no output)"));
      out.classList.toggle("runnable__out--err", res.status === "error");
    };
    return el("div", { class: "runnable" },
      el("div", { class: "runnable__bar" },
        el("span", { class: "mono", style: { fontSize: "9px", letterSpacing: "0.12em", color: "var(--ink-faint)" } }, "PYTHON · EDITABLE"),
        el("span", { style: { flex: "1" } }),
        btn),
      host, out);
  }

  function quiz(b) {
    const box = el("div", { class: "quiz" });
    box.appendChild(el("div", { class: "quiz__q" }, b.q));
    const explain = el("div", { class: "quiz__explain", hidden: true });
    let answered = false;
    b.options.forEach((opt, i) => {
      const btn = el("button", { class: "quiz__opt" }, opt);
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        [...box.querySelectorAll(".quiz__opt")].forEach((o, j) => {
          if (j === b.answer) o.classList.add("is-correct");
          else if (j === i) o.classList.add("is-wrong");
          o.disabled = true;
        });
        explain.hidden = false;
        explain.textContent = (i === b.answer ? "Correct.  " : "Not quite.  ") + (b.explain || "");
      };
      box.appendChild(btn);
    });
    box.appendChild(explain);
    return box;
  }

  // A "Your turn" exercise: a blank editor + hidden tests + a Check button,
  // and a reference answer hidden behind "Show answer". Mirrors runnable().
  function exercise(b) {
    const exId = exLessonId + "#" + (exSeq++);
    const host = el("div", { class: "exercise__editor" });
    const ed = createEditor(host, { value: "" });   // blank — no starter code
    ed.cm.setOption("viewportMargin", Infinity);
    editors.push(ed);                               // rides the post-render refresh

    const results = el("div", { class: "exercise__results" });
    renderTestResults(results, null);

    const answer = el("pre", { class: "md__pre exercise__answer", hidden: true },
      el("code", null, (b.solution || "").trim()));
    const ansBtn = el("button", { class: "btn btn--ghost btn--sm" }, "Show answer");
    ansBtn.onclick = () => {
      answer.hidden = !answer.hidden;
      ansBtn.textContent = answer.hidden ? "Show answer" : "Hide answer";
    };

    const solved = el("span", { class: "exercise__solved", hidden: true }, "✓ solved");
    if (getExercise(exId).status === "solved") solved.hidden = false;

    const checkBtn = el("button", { class: "btn btn--sm btn--primary" }, "Check");
    let busy = false;
    checkBtn.onclick = async () => {
      if (busy) return;
      busy = true;
      checkBtn.disabled = true;
      checkBtn.textContent = "checking…";
      let res;
      try {
        res = await runner.runTests({
          files: { "solution.py": ed.getValue(), "exercise_tests.py": b.tests },
          tests: [{ module: "exercise_tests", level: 1 }],
          mode: b.mode || "sync",
        });
      } catch (e) {
        res = { fatal: "The check could not run: " + e.message };
      }
      if (destroyed) return;
      busy = false;
      checkBtn.disabled = false;
      checkBtn.textContent = "Check";
      renderTestResults(results, res, { fresh: true, expandFirstFail: true });
      if (res && !res.fatal && res.summary && recordExercise(exId, res.summary)) {
        solved.hidden = false;
      }
    };

    const KIND = { recall: "RECALL", applied: "APPLIED", cumulative: "CUMULATIVE" };
    return el("div", { class: "exercise exercise--" + (b.kind || "recall") },
      el("div", { class: "exercise__bar" },
        el("span", { class: "mono exercise__kind" }, KIND[b.kind] || "EXERCISE"),
        solved,
        el("span", { style: { flex: "1" } }),
        ansBtn, checkBtn),
      el("div", { class: "exercise__prompt" }, renderMarkdown(b.prompt)),
      host,
      results,
      answer);
  }

  return () => { destroyed = true; };
}
