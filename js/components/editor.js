/* editor.js — thin wrapper over CodeMirror 5 (loaded globally from the CDN). */
import { isMobile } from "../lib/mobile.js";

export function createEditor(parent, opts = {}) {
  const cm = window.CodeMirror(parent, {
    value: opts.value || "",
    mode: "python",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    smartIndent: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true,
    // wrap long lines on phones so code never forces horizontal page scroll
    lineWrapping: opts.lineWrapping != null ? opts.lineWrapping : isMobile(),
    scrollbarStyle: "native",
    readOnly: opts.readOnly ? "nocursor" : false,
    extraKeys: {
      Tab: (cmi) => {
        if (cmi.somethingSelected()) cmi.execCommand("indentMore");
        else cmi.replaceSelection("    ", "end");
      },
      "Shift-Tab": (cmi) => cmi.execCommand("indentLess"),
      "Cmd-/": "toggleComment",
      "Ctrl-/": "toggleComment",
    },
  });

  let onChange = opts.onChange || null;
  let suppress = false;
  cm.on("change", () => { if (onChange && !suppress) onChange(cm.getValue()); });

  // Themes swap the editor font (Lucida Console / Space Mono / Special Elite),
  // which changes glyph advance-width — re-measure so the cursor stays aligned.
  // Guarded by isConnected so a detached editor's stale listener is a no-op.
  const onThemeChange = () => { if (cm.getWrapperElement().isConnected) cm.refresh(); };
  window.addEventListener("themechange", onThemeChange);

  // Webfont themes (Space Mono, Special Elite, …) load asynchronously. The
  // editor first measures against the fallback face; when the real face swaps
  // in, the browser reflows to new glyph widths but CM keeps the stale metrics,
  // so the caret/selection misaligns until something re-measures. The
  // themechange refresh above fires in the same tick the font <link> is added —
  // before download — so re-measure once fonts are actually ready, and again
  // whenever any later face finishes loading.
  if (typeof document !== "undefined" && document.fonts) {
    document.fonts.ready.then(() => { if (cm.getWrapperElement().isConnected) cm.refresh(); });
    if (document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone",
        () => { if (cm.getWrapperElement().isConnected) cm.refresh(); });
    }
  }

  return {
    cm,
    getValue: () => cm.getValue(),
    setValue(v) {
      suppress = true;
      cm.setValue(v == null ? "" : String(v));
      cm.clearHistory();
      suppress = false;
    },
    setReadOnly: (ro) => cm.setOption("readOnly", ro ? "nocursor" : false),
    setOnChange: (fn) => { onChange = fn; },
    focus: () => cm.focus(),
    refresh: () => cm.refresh(),
  };
}
