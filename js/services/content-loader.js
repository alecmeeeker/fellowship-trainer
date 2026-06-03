/* content-loader.js — loads the content modules under /content and caches them.
 * Content lives in .js modules (not .json) so Python source can be written as
 * template literals without escaping. Each exports a default data object. */

const cache = new Map();

async function loadModule(relPath) {
  if (cache.has(relPath)) return cache.get(relPath);
  const url = new URL(relPath, import.meta.url).href;
  const mod = await import(url);
  cache.set(relPath, mod.default);
  return mod.default;
}

export function loadManifest()   { return loadModule("../../content/manifest.js"); }
export function loadProject(id)  { return loadModule("../../content/projects/" + id + ".js"); }
export function loadDrills()     { return loadModule("../../content/drills.js"); }
export function loadCurriculum() { return loadModule("../../content/curriculum.js"); }
export function loadReference()  { return loadModule("../../content/reference.js"); }
export function loadSources()    { return loadModule("../../content/sources.js"); }
const CRAM_PATHS = {
  "exam-today": "../../content/cram-path.js",
  "black-box":  "../../content/cram-blackbox.js",
};
export function loadCramPath(id)  { return loadModule(CRAM_PATHS[id] || CRAM_PATHS["exam-today"]); }
export const CRAM_PATH_IDS = ["exam-today", "black-box"];
