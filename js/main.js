/* main.js — application entry point. */
import { buildShell } from "./app-shell.js";
import { startRouter } from "./router.js";
import { runner } from "./engine/runner-client.js";
import { themeManager } from "./services/theme-manager.js";
import { loadProject, loadManifest, loadDrills, loadCurriculum } from "./services/content-loader.js";

const root = document.getElementById("app");
root.removeAttribute("aria-busy");

// Reconcile <head> (webfont, meta) + <html> attributes with the saved theme.
// The inline boot script in index.html already set the attributes pre-paint;
// this injects the active theme's webfont and wires the X-Files flashlight beam.
themeManager.init();

const shell = buildShell(root);
startRouter(shell);

// The runner is constructed on import, so Pyodide is already downloading in
// its worker — by the time the user reaches an IDE it is usually warm.
void runner;

// Debug / content-QA hook: lets a test harness drive the engine directly.
window.__fellowship = { runner, themeManager, loadProject, loadManifest, loadDrills, loadCurriculum };
