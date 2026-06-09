/* theme-manager.js — the single source of truth for the app's appearance.
 *
 * A "theme" is a set of CSS-custom-property overrides scoped to
 * :root[data-theme="ID"] in css/themes/<id>.css. This module only ever mutates
 * three things at runtime: the data-* attributes on <html>, the <head> (font
 * <link> + <meta>), and store.state.settings — all the visual work is CSS.
 *
 * IMPORTANT: an inline boot script in index.html <head> sets data-theme +
 * data-font-scale + data-motion BEFORE first paint (FOUC kill). The VALID ids,
 * the default, and the per-theme themeColor in that inline script MUST stay in
 * sync with the THEMES registry / DEFAULT_ID below. */

import { store } from "./store.js";

/* The registry. `fontHref` is the theme's Google Fonts stylesheet, injected
 * lazily on first activation (null = no webfont / already in index.html).
 * `swatch` drives the live mini-preview chips in the settings panel. */
const THEMES = [
  {
    id: "dark",
    label: "Focused Dark (original)",
    colorScheme: "dark",
    themeColor: "#0d1015",
    fontHref: null, // JetBrains Mono + IBM Plex Sans are already linked in index.html
    swatch: { bg: "#14181f", accent: "#4fe3c7", ink: "#e7ebf2", font: "'JetBrains Mono', monospace" },
  },
  {
    id: "win95",
    label: "Windows 95",
    colorScheme: "light",
    themeColor: "#008080",
    fontHref: "https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap",
    swatch: { bg: "#d4d0c8", accent: "#000080", ink: "#000000", font: "'Tahoma', Verdana, sans-serif" },
  },
  {
    id: "springbreak95",
    label: "Spring Break '95",
    colorScheme: "light",
    themeColor: "#ff1f8f",
    fontHref: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Baloo+2:wght@400;500;600;700&family=Bungee&family=Space+Mono:wght@400;700&display=swap",
    swatch: { bg: "#fff6e9", accent: "#ff1f8f", ink: "#1a0e2e", font: "'Fredoka', system-ui, sans-serif" },
  },
  {
    id: "xfiles",
    label: "X-Files: Case File",
    colorScheme: "light",
    themeColor: "#16221b",
    fontHref: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Special+Elite&family=JetBrains+Mono:wght@400;500;700&family=Public+Sans:wght@400;500;600;700&display=swap",
    swatch: { bg: "#e7e0ce", accent: "#1f9c5a", ink: "#1c2420", font: "'Special Elite', monospace" },
  },
];

const DEFAULT_ID = "win95";
const FONT_SCALES = { s: "s", m: "m", l: "l" };

const byId = Object.fromEntries(THEMES.map((t) => [t.id, t]));
const injectedFonts = new Set();
const listeners = new Set();
const docEl = document.documentElement;

/* ---- helpers ---- */

function get(id) {
  return byId[id] || byId[DEFAULT_ID];
}

function ensureFont(theme) {
  if (!theme.fontHref || injectedFonts.has(theme.id)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = theme.fontHref;
  link.id = "theme-font-" + theme.id;
  document.head.appendChild(link);
  injectedFonts.add(theme.id);
}

function setMeta(name, content) {
  let m = document.querySelector('meta[name="' + name + '"]');
  if (!m) {
    m = document.createElement("meta");
    m.setAttribute("name", name);
    document.head.appendChild(m);
  }
  m.setAttribute("content", content);
}

function emit() {
  const detail = {
    id: docEl.dataset.theme || DEFAULT_ID,
    colorScheme: get(docEl.dataset.theme).colorScheme,
  };
  for (const fn of listeners) { try { fn(detail); } catch (_) {} }
  // editors and any other CSS-metric-sensitive widgets listen on window
  window.dispatchEvent(new CustomEvent("themechange", { detail }));
}

/* ---- X-Files flashlight beam ----
 * The xfiles theme gates its green aura to a warm spotlight that tracks the
 * cursor (body::before uses --beam-x/--beam-y). The listener exists only while
 * xfiles is active, the pointer is fine, and motion is allowed. */
let beamRaf = 0;
function beamMove(e) {
  if (beamRaf) return;
  const x = e.clientX, y = e.clientY;
  beamRaf = requestAnimationFrame(() => {
    beamRaf = 0;
    docEl.style.setProperty("--beam-x", x + "px");
    docEl.style.setProperty("--beam-y", y + "px");
  });
}
function syncBeam() {
  const wantBeam =
    docEl.dataset.theme === "xfiles" &&
    docEl.dataset.motion !== "reduce" &&
    window.matchMedia("(pointer: fine)").matches;
  window.removeEventListener("mousemove", beamMove);
  if (wantBeam) window.addEventListener("mousemove", beamMove, { passive: true });
}

/* ---- public API ---- */

/** Apply a theme by id. `persist:false` skips the store write (used at boot). */
function apply(id, { persist = true } = {}) {
  const theme = get(id);
  ensureFont(theme);
  docEl.dataset.theme = theme.id;
  docEl.style.colorScheme = theme.colorScheme;
  setMeta("theme-color", theme.themeColor);
  setMeta("color-scheme", theme.colorScheme);
  syncBeam();
  if (persist) {
    store.state.settings.theme = theme.id;
    store.commit();
  }
  emit();
  return theme.id;
}

/** Text size: "s" | "m" | "l". "m" clears the attribute (zoom 1). */
function applyFontScale(scale, { persist = true } = {}) {
  const s = FONT_SCALES[scale] ? scale : "m";
  if (s === "m") delete docEl.dataset.fontScale;
  else docEl.dataset.fontScale = s;
  // The editor opts out of the root zoom and instead scales via font-size (see
  // css/settings.css). Changing font-size changes glyph metrics, so every
  // mounted CodeMirror must re-measure or its caret goes stale. Editors listen
  // for "themechange" and call cm.refresh(); reuse that channel here.
  window.dispatchEvent(new CustomEvent("themechange", { detail: { reason: "fontScale", scale: s } }));
  if (persist) {
    store.state.settings.fontScale = s;
    store.commit();
  }
  return s;
}

/** Reduce motion on/off. */
function applyMotion(reduce, { persist = true } = {}) {
  if (reduce) docEl.dataset.motion = "reduce";
  else delete docEl.dataset.motion;
  syncBeam();
  if (persist) {
    store.state.settings.reduceMotion = !!reduce;
    store.commit();
  }
  return !!reduce;
}

/** Reconcile <html> + <head> with persisted settings at startup. Idempotent —
 * the inline FOUC script already set the attributes; this injects the webfont,
 * fixes the meta tags, and wires the beam. */
function init() {
  const s = store.state.settings || {};
  apply(s.theme || DEFAULT_ID, { persist: false });
  applyFontScale(s.fontScale || "m", { persist: false });
  applyMotion(!!s.reduceMotion, { persist: false });
}

function current() {
  return get(docEl.dataset.theme || (store.state.settings && store.state.settings.theme)).id;
}

function list() {
  return THEMES.map((t) => ({ id: t.id, label: t.label, swatch: t.swatch }));
}

function currentFontScale() {
  return (store.state.settings && store.state.settings.fontScale) || "m";
}

function currentMotion() {
  return !!(store.state.settings && store.state.settings.reduceMotion);
}

/** Subscribe to theme changes; returns an unsubscribe fn. */
function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const themeManager = {
  apply,
  applyFontScale,
  applyMotion,
  init,
  current,
  currentFontScale,
  currentMotion,
  list,
  get: (id) => get(id),
  on,
  DEFAULT_ID,
};
