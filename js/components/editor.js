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
