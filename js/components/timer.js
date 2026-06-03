/* timer.js — a deadline-based countdown. Reads wall-clock time every tick, so
 * it never drifts and survives tab-blur throttling and reloads. */
import { el } from "../lib/dom.js";

export function createTimer(deadline, onExpire) {
  const node = el("div", { class: "timer" }, "90:00");
  let fired = false;

  function tick() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    node.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    node.classList.toggle("is-low", remaining <= 600000 && remaining > 120000);
    node.classList.toggle("is-critical", remaining <= 120000 && remaining > 0);
    if (remaining <= 0 && !fired) {
      fired = true;
      clearInterval(iv);
      if (onExpire) onExpire();
    }
  }

  tick();
  const iv = setInterval(tick, 250);

  return {
    node,
    stop() { clearInterval(iv); },
  };
}
