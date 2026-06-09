/* settings-panel.js — the "toggles for updating the UI" the user asked for.
 *
 * createSettings() returns { trigger, panel } — app-shell drops `trigger` into
 * the header and `panel` onto <body>. The panel is built from the app's own
 * tokenized component classes (.card/.btn/.pill/.tab), so it is automatically
 * re-skinned by whichever theme is active (Win95 bevels it, Spring Break turns
 * it into a sticker, X-Files makes it a manila form). */

import { el, clear, toast } from "../lib/dom.js";
import { store } from "../services/store.js";
import { themeManager } from "../services/theme-manager.js";

const SCALES = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
];

export function createSettings() {
  let open = false;

  /* ---- header trigger: a ghost button with a live accent swatch ---- */
  const swatch = el("span", { class: "settings-trigger__swatch", "aria-hidden": "true" });
  const trigger = el("button", {
    class: "btn btn--ghost btn--sm settings-trigger",
    type: "button",
    "aria-haspopup": "dialog",
    "aria-expanded": "false",
    "aria-label": "Theme & display settings",
    title: "Theme & display",
  }, swatch, el("span", { class: "settings-trigger__label" }, "Theme"));

  /* ---- the popover ---- */
  const themesWrap = el("div", { class: "settings-themes", role: "radiogroup", "aria-label": "Theme" });
  const scaleWrap = el("div", { class: "tabs settings-seg", role: "radiogroup", "aria-label": "Text size" });
  const motionSwitch = el("button", {
    class: "settings-switch__btn",
    type: "button",
    role: "switch",
    "aria-checked": "false",
  }, el("span", { class: "settings-switch__knob", "aria-hidden": "true" }));

  const panel = el("div", {
    class: "settings-pop card",
    role: "dialog",
    "aria-label": "Theme & display settings",
    hidden: true,
  },
    el("div", { class: "settings-pop__sec" },
      el("div", { class: "settings-pop__label" }, "Theme"),
      themesWrap),
    el("div", { class: "settings-pop__sec" },
      el("div", { class: "settings-pop__label" }, "Text size"),
      scaleWrap),
    el("div", { class: "settings-pop__sec settings-pop__sec--row" },
      el("div", { class: "settings-pop__label settings-pop__label--inline" }, "Reduce motion"),
      el("div", { class: "settings-switch" }, motionSwitch)),
    el("div", { class: "settings-pop__sep" }),
    el("div", { class: "settings-pop__sec" },
      el("div", { class: "settings-pop__label" }, "Your data"),
      buildDataRow()));

  /* ---- theme swatches ---- */
  function renderThemes() {
    clear(themesWrap);
    const active = themeManager.current();
    for (const t of themeManager.list()) {
      const selected = t.id === active;
      const chip = el("span", { class: "theme-swatch__chip", style: { background: t.swatch.bg } },
        el("span", { class: "theme-swatch__accent", style: { background: t.swatch.accent } }),
        el("span", {
          class: "theme-swatch__aa",
          style: { color: t.swatch.ink, fontFamily: t.swatch.font },
        }, "Aa"));
      const btn = el("button", {
        class: "theme-swatch" + (selected ? " is-selected" : ""),
        type: "button",
        role: "radio",
        "aria-checked": String(selected),
        tabindex: selected ? "0" : "-1",
        onClick: () => {
          themeManager.apply(t.id);
          renderThemes();
          renderScales();
          syncTrigger();
        },
        onKeydown: (e) => rove(e, themesWrap),
      }, chip, el("span", { class: "theme-swatch__name" }, t.label));
      themesWrap.appendChild(btn);
    }
  }

  /* ---- text-size segmented control ---- */
  function renderScales() {
    clear(scaleWrap);
    const active = themeManager.currentFontScale();
    for (const s of SCALES) {
      const on = s.id === active;
      scaleWrap.appendChild(el("button", {
        class: "tab settings-seg__tab" + (on ? " is-active" : ""),
        type: "button",
        role: "radio",
        "aria-checked": String(on),
        tabindex: on ? "0" : "-1",
        onClick: () => { themeManager.applyFontScale(s.id); renderScales(); },
        onKeydown: (e) => rove(e, scaleWrap),
      }, s.label));
    }
  }

  /* ---- reduce-motion switch ---- */
  function renderMotion() {
    const on = themeManager.currentMotion();
    motionSwitch.setAttribute("aria-checked", String(on));
    motionSwitch.classList.toggle("is-on", on);
  }
  motionSwitch.addEventListener("click", () => {
    const next = !themeManager.currentMotion();
    themeManager.applyMotion(next);
    renderMotion();
  });

  /* ---- live accent chip on the header trigger ---- */
  function syncTrigger() {
    // the swatch background is the live --accent of the active theme (CSS),
    // so nothing to compute here beyond marking state for styling hooks.
    trigger.dataset.theme = themeManager.current();
  }

  /* roving-tabindex arrow-key nav within a radiogroup of buttons */
  function rove(e, group) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(group.querySelectorAll('[role="radio"]'));
    const i = items.indexOf(e.currentTarget);
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    const next = items[(i + (fwd ? 1 : -1) + items.length) % items.length];
    if (next) { next.focus(); next.click(); }
  }

  /* ---- open / close ---- */
  function setOpen(v) {
    open = v;
    panel.hidden = !v;
    trigger.setAttribute("aria-expanded", String(v));
    trigger.classList.toggle("is-open", v);
    if (v) {
      renderThemes(); renderScales(); renderMotion(); syncTrigger();
      const sel = panel.querySelector(".theme-swatch.is-selected") || panel.querySelector(".theme-swatch");
      if (sel) sel.focus();
    }
  }
  function toggle() { setOpen(!open); }
  function close() { if (open) { setOpen(false); trigger.focus(); } }

  trigger.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  // outside-click / Escape / navigation all dismiss, mirroring the nav drawer
  document.addEventListener("pointerdown", (e) => {
    if (!open) return;
    if (!panel.contains(e.target) && !trigger.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", () => { if (open) setOpen(false); });

  // keep selection state fresh if the theme changes from elsewhere
  themeManager.on(() => { syncTrigger(); if (open) { renderThemes(); renderScales(); } });
  syncTrigger();

  return { trigger, panel };
}

/* Export / import / reset — surfaces the store's already-built data APIs. */
function buildDataRow() {
  const fileInput = el("input", { type: "file", accept: "application/json", style: { display: "none" } });
  fileInput.onchange = () => {
    const f = fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { store.importJSON(String(reader.result)); toast("Progress imported", "ok"); }
      catch (err) { toast("Import failed — " + err.message, "bad"); }
    };
    reader.readAsText(f);
    fileInput.value = "";
  };

  const exportBtn = el("button", { class: "btn btn--ghost btn--sm" }, "Export");
  exportBtn.onclick = () => {
    const blob = new Blob([store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "fellowship-trainer-progress.json" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBtn = el("button", { class: "btn btn--ghost btn--sm" }, "Import");
  importBtn.onclick = () => fileInput.click();

  const resetBtn = el("button", { class: "btn btn--danger btn--sm" }, "Reset");
  resetBtn.onclick = () => {
    if (window.confirm("Erase ALL progress — lessons, drills, projects, and exam history? This cannot be undone.")) {
      store.reset();
      toast("All progress reset", "");
    }
  };

  return el("div", { class: "settings-data" }, exportBtn, importBtn, resetBtn, fileInput);
}
