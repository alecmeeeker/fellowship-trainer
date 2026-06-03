# Fellowship Trainer

A browser-based training program for a **multi-level, project-based coding
assessment**: one project, **four progressive levels**, 90 minutes, Python +
`unittest`.

It runs **real Python in your browser** (via Pyodide / WebAssembly), with a
live unit-test runner that mirrors the real platform. Nothing is sent
anywhere; all your progress stays in this browser.

---

## What the real assessment is

The format: **one domain-agnostic, project-based question with 4 progressive
levels.** You implement one class; each level adds requirements to the same
code. Scoring is **250 points per level → 1000 max**, normalized to a 600
scale. 90 minutes on a single clock. Sequential unlock — pass a level's tests
to see the next — but you can always go back to fix earlier code.

The recurring four-stage arc, verified across official docs, prep writeups,
and public solution repos:

1. **Level 1 — CRUD.** Basic operations + corner cases. ~10–15 min.
2. **Level 2 — Queries.** Scans, filters, aggregation, format-as-string
   output. ~20–30 min.
3. **Level 3 — Timestamps & TTL.** The refactor — every method gets an
   `_at` variant, fields can expire. ~30 min.
4. **Level 4 — Capstone.** Backup/restore (with TTL re-anchoring),
   entity-merge, rollback, or domain-specific extension. ~30 min.

> AI assistance is explicitly forbidden during the real screen.
> Train here. Take it solo.

---

## Two practice tracks

This trainer carries **two parallel tracks** so you can drill the exact
exam shape and also dig deeper for skill-building:

- **Mock Exams — 4-level (exam-faithful).** Six brand-new projects in the
  canonical 4-level shape (CRUD → Queries → Timestamps → Capstone) with
  250-pt-per-level scoring. Each is built directly from a documented
  archetype widely discussed in public practice content and candidate
  writeups. Use these to rehearse the real exam.
- **Extended Practice — 6-level deep dives.** The original seven
  projects, stretched across six levels each. Same archetypes, more
  surface area — better for learning *how* an evolving codebase grows
  than for matching the exam clock. Use these for depth, not for timed
  rehearsal.

---

## Running it

The app uses an ES-module Web Worker, which browsers will not load from a
`file://` URL — so it must be served over HTTP. One command:

```bash
bash serve.sh
```

Then open **http://localhost:8000**. (Pass a different port: `bash serve.sh 9000`.)

- **First load** downloads the Python runtime (~10 MB from a CDN) — needs
  an internet connection once, then the browser caches it.
- Use a current browser (Chrome, Firefox, Safari, Edge).
- Deployable as-is to any static host (GitHub Pages, Netlify, Vercel) —
  no build step.

---

## What's inside

- **Curriculum** — a 13-module learning track: Python fluency, the
  progressive-level pattern, concurrency (asyncio + threading), exam
  strategy, and **M12 — the canonical 4-level assessment anatomy**. Lessons
  have runnable, editable code.
- **Drills** — 30+ short single-skill exercises with instant test
  feedback, including format-as-string output, TTL re-anchoring, entity
  merge, rollback replay, and compression/eviction.
- **Mock Exams (4-level)** — six exam-faithful projects: *In-Memory DB*,
  *In-Memory DB (merge variant)*, *Banking System*, *Banking System
  (rollback variant)*, *Cloud Storage*, *File Storage*. Any can be taken
  under a timed 90-minute clock.
- **Extended Practice (6-level)** — seven deeper projects: *Integer
  Container* (a common practice task), *In-Memory Database*,
  *Banking System*, *Cloud Storage*, *Async Job Scheduler* (concurrency),
  *Inventory & Warehouse*, and *In-Memory File System*. Same archetypes,
  more levels, more skill-building.
- **Mock Exam runner** — a timed 90-minute simulation with a single
  continuous clock that survives tab-switches and reloads. Any project
  can be taken as an exam.
- **Reference** — quick cheatsheets: `unittest`, `asyncio`, `threading`,
  stdlib.
- **Sources** — every public link the trainer is built from: official
  docs, GitHub practice repos, and candidate writeups. Verify any claim
  against its primary source.
- **Stats** — progress, streaks, exam history, and progress export /
  import.

A suggested 5-day path: Curriculum modules 0–7 + Drills → a 4-level Mock
Exam end to end → modules 8–11 → M12 (4-level anatomy) → another 4-level
Mock Exam under the clock → optional 6-level Extended Practice for depth.

> This is a study tool for use **before** the assessment. The assessment's
> rules forbid AI assistance during the real test — train here, then take
> it solo.

---

## Project layout

```
index.html            entry; loads CodeMirror + fonts, mounts js/main.js
serve.sh              the local static server
css/                  reset, theme tokens, layout, components, mobile
js/
  main.js  router.js  app-shell.js
  engine/             pyodide.worker.js (the Web Worker) + runner-client.js
  components/         ide.js, editor.js, test-panel.js, timer.js
  screens/            one module per screen (includes sources.js)
  services/           store.js, progress.js, exam-session.js, content-loader.js
  lib/                dom.js, markdown.js, mobile.js
content/              ALL learning content, as data modules
  manifest.js         the index of projects (tracks: core / extended)
  projects/<id>.js    one project per file (4-level mocks or 6-level extended)
  drills.js  curriculum.js  reference.js  sources.js
```

## Adding content

Content is **data, not code** — adding it touches no `js/`.

**A new project** — copy an existing `content/projects/<id>.js`. It
exports an object with `id`, `title`, `implFile` (`"solution.py"`),
`starterCode`, and a `levels` array. Each level has `spec` (markdown),
`tests` (a `unittest` module that does `from solution import <Class>`),
`solution` (the reference impl at that level), `points` (250 for 4-level
mocks, 100 for 6-level extended), and `mode` (`"sync"` or `"async"`).
Then add an entry to `content/manifest.js` with `status: "ready"` and
`track: "core" | "extended"`.

All projects (six 4-level mocks + seven 6-level extended) ship ready.

**Async test files** use a plain class with `async def test_*` methods
(not `unittest.IsolatedAsyncioTestCase`, which is unreliable under
Pyodide). The custom runner discovers and awaits them.

**A new drill** — add an object to the `content/drills.js` array.

**A new lesson** — add a lesson to a module in `content/curriculum.js`.
Blocks are `text` (markdown), `code` (`run: true` to make it runnable),
`note`, `quiz`, `exercise`.

**A new source link** — add an entry to a category in
`content/sources.js`.

---

## How the engine works

`pyodide.worker.js` loads Pyodide in a Web Worker and exposes two test
paths: a standard synchronous `unittest` runner, and a custom await-based
runner for `asyncio` tests. `runner-client.js` serializes requests and
enforces a wall-clock timeout — an infinite loop is stopped by
terminating and respawning the worker, so the tab never hangs.
