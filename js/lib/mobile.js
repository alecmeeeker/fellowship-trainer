/* mobile.js — small shared helpers for the responsive (phone) layout.
 *
 * isMobile() mirrors the 760px breakpoint used in css/mobile.css so JS and CSS
 * agree on when the phone layout is active.
 *
 * attachWorkSplitToggle() turns the desktop side-by-side ".work-split"
 * (instructions | IDE) into a tabbed pane on phones: it injects an
 * Instructions / Code segmented control as the work-split's first child. CSS
 * hides the control on desktop, so this is a no-op there. Instructions show
 * first (read the problem, then code).
 */
import { el } from "./dom.js";

const MOBILE_QUERY = "(max-width: 760px)";

export function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function attachWorkSplitToggle(workSplit, ide) {
  if (!workSplit) return;
  // idempotent — never inject a second toggle bar
  if (workSplit.querySelector(":scope > .ws-toggle")) return;

  const bInstr = el("button", { class: "ws-toggle__btn is-active" }, "Instructions");
  const bCode = el("button", { class: "ws-toggle__btn" }, "Code");
  const bar = el("div", { class: "ws-toggle" }, bInstr, bCode);

  function show(code) {
    workSplit.classList.toggle("show-code", code);
    bInstr.classList.toggle("is-active", !code);
    bCode.classList.toggle("is-active", code);
    // CodeMirror measures lazily; remeasure once it becomes visible
    if (code && ide && typeof ide.refresh === "function") {
      setTimeout(() => ide.refresh(), 0);
    }
  }

  bInstr.onclick = () => show(false);
  bCode.onclick = () => show(true);

  workSplit.insertBefore(bar, workSplit.firstChild);
  show(false);
}
