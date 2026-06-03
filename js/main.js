/* main.js — application entry point. */
import { buildShell } from "./app-shell.js";
import { startRouter } from "./router.js";
import { runner } from "./engine/runner-client.js";
import { loadProject, loadManifest, loadDrills, loadCurriculum } from "./services/content-loader.js";

const root = document.getElementById("app");
root.removeAttribute("aria-busy");

const shell = buildShell(root);
startRouter(shell);

// The runner is constructed on import, so Pyodide is already downloading in
// its worker — by the time the user reaches an IDE it is usually warm.
void runner;

// Debug / content-QA hook: lets a test harness drive the engine directly.
window.__fellowship = { runner, loadProject, loadManifest, loadDrills, loadCurriculum };
