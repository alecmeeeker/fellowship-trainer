/* pyodide.worker.js — ES-module Web Worker that owns Pyodide.
 *
 * Runs the user's Python and unittest suites off the main thread so the UI and
 * the exam timer never freeze, and so an infinite loop can be killed by the
 * main thread via worker.terminate() (the runner-client then respawns a fresh
 * worker). The basic Pyodide build needs no COOP/COEP headers, so the app
 * works on any plain static host.
 *
 * Two test paths:
 *   sync  — standard unittest, run per-test for clean per-test results.
 *   async — a custom await-based runner (NOT unittest.IsolatedAsyncioTestCase,
 *           which relies on asyncio.run() — unreliable in Pyodide).
 */

// To pin a different Pyodide release, change the version in BOTH the import
// URL below and PYODIDE_INDEX (the import target must be a string literal).
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs";

const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

/* ---- the in-Pyodide harness (String.raw keeps regex backslashes intact) ---- */
const HARNESS = String.raw`
import sys, os, io, json, time, importlib, traceback, shutil, contextlib, re, inspect

_WORK = "/work"

def _prepare(files):
    """Write the project's files into Pyodide's in-memory FS, fresh each run."""
    if os.path.isdir(_WORK):
        shutil.rmtree(_WORK, ignore_errors=True)
    os.makedirs(_WORK, exist_ok=True)
    for name, src in files.items():
        path = os.path.join(_WORK, name)
        parent = os.path.dirname(path)
        if parent and not os.path.isdir(parent):
            os.makedirs(parent, exist_ok=True)
        with open(path, "w") as fh:
            fh.write(src)
    if _WORK not in sys.path:
        sys.path.insert(0, _WORK)
    # Drop any module previously imported from /work so edited source is re-read.
    for mod_name in list(sys.modules.keys()):
        mod = sys.modules.get(mod_name)
        fpath = getattr(mod, "__file__", None)
        if isinstance(fpath, str) and fpath.startswith(_WORK):
            del sys.modules[mod_name]

def _friendly(method_name):
    """testLevel103DeleteNumber -> 'Delete Number';  test_set_then_get -> 'Set then get'."""
    n = method_name
    m = re.match(r"^test_?[Ll]evel\d+", n)
    if m:
        n = n[m.end():]
    elif n.startswith("test_"):
        n = n[5:]
    elif n.startswith("test"):
        n = n[4:]
    n = n.lstrip("_0123456789")
    if not n:
        return method_name
    n = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", n)
    n = n.replace("_", " ").strip()
    if not n:
        return method_name
    return n[0].upper() + n[1:]

def _summary(rows):
    count = lambda s: sum(1 for r in rows if r["status"] == s)
    return {"total": len(rows), "passed": count("pass"), "failed": count("fail"),
            "errored": count("error"), "skipped": count("skip")}

def _flatten(suite):
    import unittest
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            for x in _flatten(item):
                yield x
        else:
            yield item

def _import_error_row(module_name, level):
    return {"id": module_name, "name": "Could not load tests", "raw": module_name,
            "level": level, "status": "error",
            "message": ("This test file failed to import — usually a syntax error "
                        "or a bug in your code, or a name the tests expect that is missing."),
            "traceback": traceback.format_exc(), "durationMs": 0.0}

def _harness_run_sync(payload_json):
    import unittest
    payload = json.loads(payload_json)
    try:
        _prepare(payload["files"])
    except Exception as exc:
        return json.dumps({"fatal": "Could not set up files: %s" % exc,
                           "traceback": traceback.format_exc()})
    rows = []
    captured = io.StringIO()
    loader = unittest.TestLoader()
    with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
        for spec in payload["tests"]:
            module_name = spec["module"]
            level = spec.get("level")
            sys.modules.pop(module_name, None)
            try:
                mod = importlib.import_module(module_name)
                suite = loader.loadTestsFromModule(mod)
            except Exception:
                rows.append(_import_error_row(module_name, level))
                continue
            for test in _flatten(suite):
                tr = unittest.TestResult()
                t0 = time.perf_counter()
                try:
                    test.run(tr)
                except Exception:
                    pass
                dt = (time.perf_counter() - t0) * 1000.0
                method = getattr(test, "_testMethodName", None) or str(test)
                if tr.errors:
                    status, tb, msg = "error", tr.errors[0][1], "Raised an error."
                elif tr.failures:
                    status, tb, msg = "fail", tr.failures[0][1], "Assertion failed."
                elif tr.skipped:
                    status, tb, msg = "skip", "", (tr.skipped[0][1] if tr.skipped else "")
                else:
                    status, tb, msg = "pass", "", ""
                rows.append({"id": "%s.%s" % (module_name, method),
                             "name": _friendly(method), "raw": method, "level": level,
                             "status": status, "message": msg, "traceback": tb,
                             "durationMs": round(dt, 1)})
    return json.dumps({"tests": rows, "stdout": captured.getvalue(),
                       "summary": _summary(rows)})

async def _run_one_async(cls, cls_name, method_name, module_name, level, timeout):
    import asyncio
    t0 = time.perf_counter()
    status, msg, tb = "pass", "", ""
    try:
        try:
            inst = cls(method_name)        # unittest.TestCase subclass
        except TypeError:
            inst = cls()                   # plain class
        for nm in ("asyncSetUp", "setUp"):
            fn = getattr(inst, nm, None)
            if fn is not None:
                res = fn()
                if inspect.isawaitable(res):
                    await res
                break
        res = getattr(inst, method_name)()
        if inspect.isawaitable(res):
            await asyncio.wait_for(res, timeout=timeout)
        for nm in ("asyncTearDown", "tearDown"):
            fn = getattr(inst, nm, None)
            if fn is not None:
                res = fn()
                if inspect.isawaitable(res):
                    await res
                break
    except AssertionError as exc:
        status, msg, tb = "fail", (str(exc) or "Assertion failed."), traceback.format_exc()
    except asyncio.TimeoutError:
        status, msg = "error", "Timed out — an await never completed (deadlock or a missing task)."
    except Exception as exc:
        status, msg, tb = "error", "%s: %s" % (type(exc).__name__, exc), traceback.format_exc()
    dt = (time.perf_counter() - t0) * 1000.0
    return {"id": "%s.%s.%s" % (module_name, cls_name, method_name),
            "name": _friendly(method_name), "raw": method_name, "level": level,
            "status": status, "message": msg, "traceback": tb, "durationMs": round(dt, 1)}

async def _harness_run_async(payload_json):
    payload = json.loads(payload_json)
    timeout = payload.get("timeoutSec", 8)
    try:
        _prepare(payload["files"])
    except Exception as exc:
        return json.dumps({"fatal": "Could not set up files: %s" % exc,
                           "traceback": traceback.format_exc()})
    rows = []
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
        for spec in payload["tests"]:
            module_name = spec["module"]
            level = spec.get("level")
            sys.modules.pop(module_name, None)
            try:
                mod = importlib.import_module(module_name)
            except Exception:
                rows.append(_import_error_row(module_name, level))
                continue
            found = []
            for cls_name in sorted(dir(mod)):
                cls = getattr(mod, cls_name)
                if not isinstance(cls, type):
                    continue
                if getattr(cls, "__module__", None) != module_name:
                    continue
                methods = sorted(m for m in dir(cls) if m.startswith("test"))
                if methods:
                    found.append((cls, cls_name, methods))
            for cls, cls_name, methods in found:
                for method_name in methods:
                    rows.append(await _run_one_async(cls, cls_name, method_name,
                                                     module_name, level, timeout))
    return json.dumps({"tests": rows, "stdout": captured.getvalue(),
                       "summary": _summary(rows)})
`;

let pyodide = null;

async function boot() {
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX });
  pyodide.runPython(HARNESS);
  self.postMessage({ type: "ready" });
}

const booted = boot().catch((err) => {
  self.postMessage({ type: "booterror", payload: { message: String((err && err.message) || err) } });
  throw err;
});

self.onmessage = async (e) => {
  const { type, id, payload } = e.data || {};
  try {
    await booted;
    if (type === "run") {
      pyodide.globals.set("_PAYLOAD", JSON.stringify(payload));
      let outJson;
      if (payload.mode === "async") {
        outJson = await pyodide.runPythonAsync("await _harness_run_async(_PAYLOAD)");
      } else {
        outJson = pyodide.runPython("_harness_run_sync(_PAYLOAD)");
      }
      self.postMessage({ type: "result", id, payload: JSON.parse(outJson) });
    } else if (type === "runScript") {
      // capture stdout/stderr Python-side: reliable, and works across top-level await
      pyodide.runPython(
        "import io as _io, sys as _sys\n" +
        "_cap = _io.StringIO()\n" +
        "_save_o, _save_e = _sys.stdout, _sys.stderr\n" +
        "_sys.stdout = _cap; _sys.stderr = _cap"
      );
      let status = "ok";
      let trace = "";
      try {
        await pyodide.runPythonAsync(payload.code);
      } catch (err) {
        status = "error";
        trace = String((err && err.message) || err);
      }
      const out = pyodide.runPython(
        "_sys.stdout = _save_o; _sys.stderr = _save_e\n_cap.getvalue()"
      );
      self.postMessage({ type: "result", id, payload: { status, stdout: out, traceback: trace } });
    } else if (type === "ping") {
      self.postMessage({ type: "result", id, payload: { ok: true } });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      id,
      payload: { message: String((err && err.message) || err) },
    });
  }
};
