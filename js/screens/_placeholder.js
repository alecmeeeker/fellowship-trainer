/* _placeholder.js — shared stub for screens that later build phases fill in.
 * Each screen file replaces its own contents when that phase lands. */
import { el } from "../lib/dom.js";

export function placeholder(title, note) {
  return function mount(outlet) {
    outlet.appendChild(
      el("div", { class: "screen screen--pad" },
        el("div", { class: "screen__wrap reveal" },
          el("div", { class: "h1" }, title),
          el("p", { class: "lead", style: { marginTop: "8px" } }, note),
          el("div", { class: "callout callout--info", style: { marginTop: "24px" } },
            el("span", { class: "callout__glyph" }, "i"),
            el("div", null,
              "This section comes online in a later build step — the Python engine and core IDE are wired first so the practice loop works end to end."
            )
          )
        )
      )
    );
  };
}
