/* ide.js — the reusable IDE widget: file tree + editor + results/terminal panel.
 * Used by the project screen, drills, and the mock-exam runner. The host screen
 * owns the run buttons / level nav and calls into this widget. */
import { el, clear } from "../lib/dom.js";
import { createEditor } from "./editor.js";
import { renderTestResults } from "./test-panel.js";

export function createIDE(opts = {}) {
  let onEditImpl = opts.onEditImpl || null;

  const files = {};      // name -> { name, role, editable }
  const content = {};    // name -> current source text
  let order = [];
  let active = null;

  const fileTree = el("div", { class: "filetree" });
  const editorHost = el("div", { class: "ide__editorwrap" });
  const runbar = el("div", { class: "runbar" });
  const testsBody = el("div", { class: "testlist" });
  const terminalBody = el("div", { class: "terminal" },
    el("span", { class: "terminal__empty" }, "Program output and tracebacks appear here."));

  const testsView = el("div",
    { style: { display: "flex", flexDirection: "column", minHeight: "0", flex: "1" } },
    runbar, testsBody);

  const panelBody = el("div",
    { style: { display: "flex", flexDirection: "column", minHeight: "0", flex: "1" } },
    testsView);

  const tabTests = el("button", { class: "tab is-active" }, "Unit Tests");
  const tabTerm = el("button", { class: "tab" }, "Terminal");
  function showTab(which) {
    tabTests.classList.toggle("is-active", which === "tests");
    tabTerm.classList.toggle("is-active", which === "term");
    clear(panelBody);
    panelBody.appendChild(which === "tests" ? testsView : terminalBody);
  }
  tabTests.onclick = () => showTab("tests");
  tabTerm.onclick = () => showTab("term");

  const gutter = el("div", { class: "ide__gutter", title: "Drag to resize" });
  const work = el("div", { class: "ide__work" },
    editorHost,
    gutter,
    el("div", { class: "ide__panel" }, el("div", { class: "tabs" }, tabTests, tabTerm), panelBody));

  const root = el("div", { class: "ide" },
    el("div", { class: "ide__side" },
      el("div", { class: "panel-head" }, el("span", null, "Files")),
      fileTree),
    work);

  const editor = createEditor(editorHost, {
    value: "",
    onChange: (val) => {
      if (active && files[active] && files[active].editable) {
        content[active] = val;
        if (onEditImpl && files[active].role === "impl") onEditImpl(val);
      }
    },
  });

  renderRunbar(null);
  renderTestResults(testsBody, null);

  /* ---- gutter resize (pointer events → works for mouse, touch, and pen) ---- */
  gutter.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { gutter.setPointerCapture(e.pointerId); } catch (_) {}
    const startY = e.clientY;
    const rows = getComputedStyle(work).gridTemplateRows.split(" ");
    // preserve the handle thickness from CSS (8px desktop / 16px mobile)
    const gutterRow = rows.length >= 3 ? rows[1] : "8px";
    const startPanel = parseFloat(rows[rows.length - 1]) || 220;
    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      const h = Math.max(110, Math.min(work.clientHeight - 170, startPanel + delta));
      work.style.gridTemplateRows = "1fr " + gutterRow + " " + h + "px";
      editor.refresh();
    };
    const onUp = (ev) => {
      try { gutter.releasePointerCapture(ev.pointerId); } catch (_) {}
      gutter.removeEventListener("pointermove", onMove);
      gutter.removeEventListener("pointerup", onUp);
      gutter.removeEventListener("pointercancel", onUp);
    };
    gutter.addEventListener("pointermove", onMove);
    gutter.addEventListener("pointerup", onUp);
    gutter.addEventListener("pointercancel", onUp);
  });

  /* ---- file tree ---- */
  function fileNode(name) {
    const f = files[name];
    const glyph = f.role === "impl" ? "◆" : f.role === "test" ? "≡" : "○";
    const node = el("button",
      { class: "filenode filenode--" + f.role + (name === active ? " is-active" : "") },
      el("span", { class: "filenode__glyph" }, glyph),
      el("span", null, name),
      el("span", { class: "filenode__tag muted" }, f.editable ? "edit" : "read"));
    node.onclick = () => setActive(name);
    return node;
  }
  function renderFileTree() {
    clear(fileTree);
    const mains = order.filter((n) => files[n].role !== "test");
    const tests = order.filter((n) => files[n].role === "test");
    for (const n of mains) fileTree.appendChild(fileNode(n));
    if (tests.length) {
      fileTree.appendChild(el("div", { class: "filetree__group" }, "tests/"));
      for (const n of tests) fileTree.appendChild(fileNode(n));
    }
  }

  function setActive(name) {
    if (!files[name]) return;
    if (active && files[active] && files[active].editable) {
      content[active] = editor.getValue();
    }
    active = name;
    editor.setValue(content[name] || "");
    editor.setReadOnly(!files[name].editable);
    renderFileTree();
    setTimeout(() => editor.refresh(), 0);
  }

  /* ---- runbar ---- */
  function renderRunbar(result, busy) {
    clear(runbar);
    if (busy) {
      runbar.append(el("span", { class: "spinner" }),
        el("span", { class: "muted" }, "Running tests…"));
      return;
    }
    if (!result) {
      runbar.append(el("span", { class: "muted" }, "No run yet — write code and press Run."));
      return;
    }
    if (result.fatal) {
      runbar.append(el("span", { class: "runbar__score runbar__score--bad" }, "Run failed"));
      return;
    }
    const s = result.summary || { total: 0, passed: 0 };
    const ok = s.total > 0 && s.passed === s.total;
    // .filter(Boolean): raw DOM .append() stringifies null -> "null"; drop the
    // empty failed/errored slots instead of rendering "passednullnull".
    runbar.append(...[
      el("span", { class: "runbar__score " + (ok ? "runbar__score--ok" : "runbar__score--bad") },
        s.passed + " / " + s.total + " passed"),
      (s.failed ? el("span", { class: "muted" }, s.failed + " failed") : null),
      (s.errored ? el("span", { class: "muted" }, s.errored + " error" + (s.errored > 1 ? "s" : "")) : null),
      el("span", { style: { flex: "1" } }),
      el("span", { class: "muted", style: { fontSize: "10px" } },
        ok ? "all green" : "keep going"),
    ].filter(Boolean));
  }

  /* ---- public API ---- */
  return {
    root,

    setFiles(list, activeName) {
      for (const k of Object.keys(files)) delete files[k];
      for (const k of Object.keys(content)) delete content[k];
      order = [];
      for (const f of list) {
        files[f.name] = { name: f.name, role: f.role || "test", editable: !!f.editable };
        content[f.name] = f.content == null ? "" : String(f.content);
        order.push(f.name);
      }
      active = null;
      setActive(activeName || (list[0] && list[0].name));
    },

    getImplCode() {
      const implName = order.find((n) => files[n].role === "impl");
      if (!implName) return "";
      if (active === implName) content[implName] = editor.getValue();
      return content[implName] || "";
    },

    setImplCode(code) {
      const implName = order.find((n) => files[n].role === "impl");
      if (!implName) return;
      content[implName] = code;
      if (active === implName) editor.setValue(code);
    },

    getActiveName() { return active; },
    setActive,

    showTests(result, runOpts) {
      renderRunbar(result, false);
      renderTestResults(testsBody, result, Object.assign({ fresh: true, expandFirstFail: true }, runOpts || {}));
      showTab("tests");
    },

    showTerminal(text) {
      clear(terminalBody);
      if (!text || !text.trim()) {
        terminalBody.appendChild(el("span", { class: "terminal__empty" }, "(no output)"));
      } else {
        terminalBody.appendChild(document.createTextNode(text));
      }
      showTab("term");
    },

    setBusy(busy) {
      renderRunbar(null, busy);
      if (busy) {
        clear(testsBody);
        testsBody.appendChild(el("div", { class: "empty" },
          el("span", { class: "spinner" }), " running…"));
      }
    },

    refresh() { editor.refresh(); },
    focusEditor() { editor.focus(); },
    setOnEditImpl(fn) { onEditImpl = fn; },
  };
}
