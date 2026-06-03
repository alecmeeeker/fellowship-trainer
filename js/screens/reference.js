/* reference.js — cheatsheet index (#/reference) and single sheet (#/reference/:id). */
import { el, clear } from "../lib/dom.js";
import { loadReference } from "../services/content-loader.js";

export function mount(outlet, params) {
  let destroyed = false;
  outlet.appendChild(el("div", { class: "centered" },
    el("span", { class: "spinner" }), el("span", { style: { marginLeft: "10px" } }, "Loading…")));

  (async () => {
    let sheets;
    try { sheets = await loadReference(); }
    catch (e) { clear(outlet); outlet.appendChild(el("div", { class: "centered" }, "Could not load — " + e.message)); return; }
    if (destroyed) return;
    clear(outlet);
    if (params && params.id) {
      const sheet = sheets.find((s) => s.id === params.id);
      sheet ? renderSheet(outlet, sheet) : renderIndex(outlet, sheets);
    } else {
      renderIndex(outlet, sheets);
    }
  })();

  return () => { destroyed = true; };
}

function renderIndex(outlet, sheets) {
  const wrap = el("div", { class: "screen__wrap reveal" },
    el("div", { class: "h1" }, "Reference"),
    el("p", { class: "lead", style: { marginTop: "8px" } },
      "Compact cheatsheets for the APIs you reach for under time pressure. Skim one before a project."),
    el("div", { class: "grid grid--auto", style: { marginTop: "20px" } },
      sheets.map((s) =>
        el("a", { class: "card card--link", href: "#/reference/" + s.id },
          el("div", { class: "card__title" }, s.title),
          el("div", { class: "card__body" }, s.blurb)))));
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));
}

function renderSheet(outlet, sheet) {
  const wrap = el("div", { class: "screen__wrap reveal", style: { maxWidth: "780px" } },
    el("a", { href: "#/reference", class: "mono muted", style: { fontSize: "11px" } }, "← Reference"),
    el("div", { class: "h1", style: { marginTop: "14px" } }, sheet.title),
    el("p", { class: "lead", style: { marginTop: "6px" } }, sheet.blurb));

  for (const section of sheet.sections) {
    wrap.appendChild(el("div", { class: "section-head" },
      el("span", { class: "section-head__kicker" }, section.heading),
      el("span", { class: "section-head__rule" })));
    for (const entry of section.entries) {
      wrap.appendChild(el("div", { style: { marginBottom: "12px" } },
        el("pre", { class: "md__pre", style: { margin: "0 0 5px" } }, el("code", null, entry.code)),
        el("div", { class: "muted", style: { fontSize: "12px", paddingLeft: "2px" } }, entry.note)));
    }
  }
  outlet.appendChild(el("div", { class: "screen screen--pad" }, wrap));
}
