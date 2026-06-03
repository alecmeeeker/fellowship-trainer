/* runner-client.js — main-thread wrapper around the Pyodide worker.
 *
 * Requests are SERIALIZED: only one runs at a time, the rest queue. This is
 * required for correctness — the worker hands the payload to Python through a
 * shared global, so overlapping runs would clobber each other. Serializing
 * also means a timeout can safely terminate + respawn the worker without
 * stranding other in-flight work. */

function emptySummary() {
  return { total: 0, passed: 0, failed: 0, errored: 0, skipped: 0 };
}

class Runner {
  constructor() {
    this._queue = [];
    this._inFlight = null;
    this._nextId = 1;
    this._listeners = {};
    this._state = "loading";
    this._spawn();
  }

  _spawn() {
    this._worker = new Worker(new URL("./pyodide.worker.js", import.meta.url), { type: "module" });
    this._state = "loading";
    this.ready = new Promise((res) => { this._resolveReady = res; });
    this._emit("status", { state: "loading" });
    this._worker.onmessage = (e) => this._onMessage(e.data);
    this._worker.onerror = (e) => {
      this._state = "error";
      this._emit("status", { state: "error", message: e.message || "worker error" });
    };
  }

  _onMessage(msg) {
    if (!msg) return;
    if (msg.type === "ready") {
      this._state = "ready";
      this._resolveReady(true);
      this._emit("status", { state: "ready" });
      return;
    }
    if (msg.type === "booterror") {
      this._state = "error";
      this._emit("status", { state: "error", message: msg.payload && msg.payload.message });
      this._resolveReady(false);
      return;
    }
    if (msg.type === "result" || msg.type === "error") {
      const job = this._inFlight;
      if (!job || job.id !== msg.id) return;
      clearTimeout(job.timer);
      this._inFlight = null;
      if (msg.type === "result") job.resolve(msg.payload);
      else job.reject(new Error((msg.payload && msg.payload.message) || "Run failed"));
      this._pump();
    }
  }

  get state() { return this._state; }

  on(evt, fn) { (this._listeners[evt] || (this._listeners[evt] = [])).push(fn); return fn; }
  off(evt, fn) {
    if (this._listeners[evt]) this._listeners[evt] = this._listeners[evt].filter((x) => x !== fn);
  }
  _emit(evt, data) {
    for (const fn of this._listeners[evt] || []) { try { fn(data); } catch (_) {} }
  }

  _request(type, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      this._queue.push({ type, payload, timeoutMs, resolve, reject });
      this._pump();
    });
  }

  _pump() {
    if (this._inFlight || this._queue.length === 0) return;
    const job = this._queue.shift();
    job.id = this._nextId++;
    this._inFlight = job;

    const send = () => {
      if (this._inFlight !== job) return;
      job.timer = setTimeout(() => {
        if (this._inFlight !== job) return;
        this._inFlight = null;
        try { this._worker.terminate(); } catch (_) {}
        this._spawn();              // a fresh worker — only terminate() stops an infinite loop
        const err = new Error("TIMEOUT");
        err.code = "TIMEOUT";
        job.reject(err);
        this._pump();
      }, job.timeoutMs);
      this._worker.postMessage({ type: job.type, id: job.id, payload: job.payload });
    };

    // arm the timeout only once the worker is actually ready to run
    if (this._state === "ready") send();
    else this.ready.then(send);
  }

  /* Run a unittest suite.
   * opts = { files:{name:src}, tests:[{module,level}], mode:"sync"|"async", timeoutMs } */
  async runTests(opts) {
    await this.ready;
    const timeoutMs = opts.timeoutMs || 15000;
    const payload = {
      files: opts.files,
      tests: opts.tests,
      mode: opts.mode || "sync",
      timeoutSec: Math.max(3, Math.floor((timeoutMs - 2500) / 1000)),
    };
    try {
      const res = await this._request("run", payload, timeoutMs);
      if (res && res.fatal) {
        return { tests: [], stdout: "", summary: emptySummary(), fatal: res.fatal, traceback: res.traceback || "" };
      }
      return res;
    } catch (err) {
      if (err.code === "TIMEOUT") {
        return {
          tests: [], stdout: "", summary: emptySummary(),
          fatal: "Your code ran too long and was stopped — most likely an infinite loop. The Python engine has been restarted.",
        };
      }
      return { tests: [], stdout: "", summary: emptySummary(), fatal: "The run failed: " + err.message };
    }
  }

  /* Run a free Python script (lesson snippet). Supports top-level await.
   * Returns { status:"ok"|"error", stdout, traceback }. */
  async runScript(code, timeoutMs = 10000) {
    await this.ready;
    try {
      return await this._request("runScript", { code }, timeoutMs);
    } catch (err) {
      if (err.code === "TIMEOUT") {
        return { status: "error", stdout: "", traceback: "Stopped — the code ran too long (possible infinite loop). The engine has been restarted." };
      }
      return { status: "error", stdout: "", traceback: err.message };
    }
  }
}

export const runner = new Runner();
