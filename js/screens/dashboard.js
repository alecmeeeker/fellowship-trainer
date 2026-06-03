/* dashboard.js — landing screen. Runs a live engine self-test (the Step-0
 * capability check) through the real harness, and routes into the trainer. */
import { el, clear } from "../lib/dom.js";
import { runner } from "../engine/runner-client.js";
import { store } from "../services/store.js";
import { getActiveExam, isExpired } from "../services/exam-session.js";

/* Self-test: a 3-test sync suite + a 1-test asyncio suite, run through the
 * real worker harness — proves the whole pipeline before any practice. */
const SYNC_PROBE = {
  files: {
    "solution.py": "class Probe:\n    def double(self, x):\n        return x * 2\n",
    "selftest_sync.py": [
      "import unittest",
      "from solution import Probe",
      "",
      "class SelfTest(unittest.TestCase):",
      "    def testLevel101_double(self):",
      "        self.assertEqual(Probe().double(21), 42)",
      "    def testLevel102_double_zero(self):",
      "        self.assertEqual(Probe().double(0), 0)",
      "    def testLevel103_double_negative(self):",
      "        self.assertEqual(Probe().double(-5), -10)",
      "",
    ].join("\n"),
  },
  tests: [{ module: "selftest_sync", level: 1 }],
  mode: "sync",
};

const ASYNC_PROBE = {
  files: {
    "selftest_async.py": [
      "import asyncio",
      "",
      "class SelfTest:",
      "    async def test_gather(self):",
      "        async def square(n):",
      "            await asyncio.sleep(0)",
      "            return n * n",
      "        out = await asyncio.gather(*[square(i) for i in range(5)])",
      "        assert out == [0, 1, 4, 9, 16], out",
      "",
    ].join("\n"),
  },
  tests: [{ module: "selftest_async", level: 1 }],
  mode: "async",
};

const STARTERS = [
  { glyph: "▤", title: "Curriculum", href: "#/learn",
    body: "48 modules — Python fundamentals to mastery, the full algorithm-pattern catalog (two pointers, sliding window, trees, graphs, DP, heaps, backtracking, tries…), concurrency, the 4-level assessment anatomy (M12), and black-box/resolver mastery (M46)." },
  { glyph: "◇", title: "Drills", href: "#/drills",
    body: "30+ short exercises with instant feedback — including the Exam-Patterns set (format-as-string, TTL re-anchor, rollback)." },
  { glyph: "▦", title: "Projects", href: "#/projects",
    body: "Six 4-level exam-faithful mock exams + seven 6-level extended deep dives. Sectioned and labeled in the catalog." },
  { glyph: "◷", title: "Mock Exam", href: "#/exam",
    body: "A timed 90-minute simulation. Pick a 4-level mock for the real exam shape; 6-level for longer reps." },
  { glyph: "❉", title: "Sources", href: "#/sources",
    body: "Every public URL the trainer is built from — official docs, GitHub practice repos, and candidate writeups." },
];

export function mount(outlet) {
  let cancelled = false;

  const engineBody = el("div", { class: "engine-card__body" });
  const engineCard = el("div", { class: "card card--accent reveal reveal-1" },
    el("div", { class: "section-head", style: { margin: "0 0 12px" } },
      el("span", { class: "section-head__kicker" }, "Engine"),
      el("span", { class: "section-head__rule" })),
    engineBody);

  function renderEngine(phase, detail) {
    clear(engineBody);
    if (phase === "boot" || phase === "verify") {
      engineBody.append(
        el("div", { style: { display: "flex", alignItems: "center", gap: "11px" } },
          el("span", { class: "spinner" }),
          el("span", { class: "mono", style: { fontSize: "13px" } },
            phase === "boot" ? "Starting the Python engine…" : "Verifying the test runner…")),
        el("p", { class: "muted", style: { fontSize: "12px", marginTop: "9px" } },
          phase === "boot"
            ? "Pyodide (CPython compiled to WebAssembly) is loading in a Web Worker. First load fetches ~10 MB, then the browser caches it."
            : "Running a sync unittest suite and an asyncio suite through the real harness.")
      );
    } else if (phase === "ok") {
      engineBody.append(
        el("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
          el("span", { class: "pill pill--ok" }, "● Verified"),
          el("span", { class: "mono", style: { fontSize: "13px", fontWeight: "700" } },
            "Python engine ready")),
        el("p", { class: "muted", style: { fontSize: "12px", marginTop: "9px" } }, detail)
      );
    } else {
      engineBody.append(
        el("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
          el("span", { class: "pill pill--bad" }, "● Failed"),
          el("span", { class: "mono", style: { fontSize: "13px", fontWeight: "700" } },
            "Engine self-test failed")),
        el("p", { class: "muted", style: { fontSize: "12px", marginTop: "9px" } }, detail),
        el("p", { class: "muted", style: { fontSize: "11px", marginTop: "6px" } },
          "Make sure you opened the app over http:// (run ./serve.sh) and have a network connection for the first load.")
      );
    }
  }
  renderEngine("boot");

  const screen = el("div", { class: "screen screen--pad" },
    el("div", { class: "screen__wrap" },
      el("div", { class: "reveal" },
        el("div", { class: "section-head__kicker", style: { display: "block", marginBottom: "8px" } },
          "A multi-level, project-based coding assessment"),
        el("div", { class: "h1" }, "Fellowship Trainer"),
        el("p", { class: "lead", style: { marginTop: "10px" } },
          "Practice the assessment's real format — ",
          el("b", null, "one project, four progressive levels"),
          ", a live unittest runner — until the pattern is second nature. " +
          "This trainer also ships 6-level extended deep dives for stretching the same archetypes.")),
      cramHero(),
      engineCard,
      resumeBanner(),
      el("div", { class: "section-head reveal reveal-2" },
        el("span", { class: "section-head__kicker" }, "Start here"),
        el("span", { class: "section-head__rule" })),
      el("div", { class: "grid grid--auto reveal reveal-2" },
        STARTERS.map((s) =>
          el("a", { class: "card card--link", href: s.href },
            el("div", { class: "card__title" },
              el("span", { style: { color: "var(--accent)", marginRight: "9px" } }, s.glyph),
              s.title),
            el("div", { class: "card__body" }, s.body)))),
      el("div", { class: "callout callout--tip reveal reveal-3", style: { marginTop: "22px" } },
        el("span", { class: "callout__glyph" }, "→"),
        el("div", null,
          el("b", null, "Your path: "),
          "Foundations (M0–M17) → Python fundamentals to mastery (M18–M24) → the algorithm-pattern catalog (M25–M45: pointers, windows, prefix sums, stacks, queues/BFS, linked lists, binary search, trees, graphs, union-find, topo-sort, backtracking, DP, greedy, heaps, intervals, bits, math, grids, tries, strings) → black-box & resolver mastery (M46) → drills + 4-level mock exams under the 90-min clock. Every exercise runs against hidden tests in the browser.")),
      el("div", { class: "callout callout--info reveal reveal-3", style: { marginTop: "14px" } },
        el("span", { class: "callout__glyph" }, "i"),
        el("div", null,
          "This is a study tool for use ", el("b", null, "before"), " the assessment. ",
          "The assessment's rules forbid AI assistance during the real test — train here, then take it on your own."))));

  outlet.appendChild(screen);

  (async () => {
    try {
      await runner.ready;
      if (cancelled) return;
      if (runner.state === "error") {
        renderEngine("fail", "The Python engine could not start.");
        return;
      }
      renderEngine("verify");
      const sync = await runner.runTests({ ...SYNC_PROBE, timeoutMs: 25000 });
      if (cancelled) return;
      const syncOk = !sync.fatal && sync.summary && sync.summary.passed === 3 &&
                     sync.summary.failed === 0 && sync.summary.errored === 0;
      const asyncRes = await runner.runTests({ ...ASYNC_PROBE, timeoutMs: 25000 });
      if (cancelled) return;
      const asyncOk = !asyncRes.fatal && asyncRes.summary && asyncRes.summary.passed === 1 &&
                      asyncRes.summary.failed === 0 && asyncRes.summary.errored === 0;
      if (syncOk && asyncOk) {
        const ms = Math.round((sync.summary.total ? sync.tests.reduce((a, t) => a + (t.durationMs || 0), 0) : 0));
        renderEngine("ok",
          "Ran 3 synchronous and 1 asyncio unit test in-browser, all passing" +
          (ms ? " (" + ms + " ms)" : "") +
          ". The full practice pipeline is live.");
      } else {
        const why = sync.fatal || asyncRes.fatal ||
          "Unexpected results: sync " + (sync.summary ? sync.summary.passed + "/" + sync.summary.total : "?") +
          ", async " + (asyncRes.summary ? asyncRes.summary.passed + "/" + asyncRes.summary.total : "?") + ".";
        renderEngine("fail", why);
      }
    } catch (err) {
      if (!cancelled) renderEngine("fail", String((err && err.message) || err));
    }
  })();

  store.state.settings.lastVisited = "dashboard";
  return () => { cancelled = true; };
}

/* prominent hero for the "exam today" cram path — most-clicked link on the
 * dashboard for a same-day learner */
function cramHero() {
  return el("a", {
    class: "cram-hero reveal reveal-1",
    href: "#/cram",
  },
    el("div", { class: "cram-hero__flag" }, "▲ EXAM TODAY"),
    el("div", { class: "cram-hero__body" },
      el("div", { class: "cram-hero__title" }, "Cram Path — guided sequential study plan"),
      el("div", { class: "cram-hero__sub" },
        "Nine ordered blocks · ~9 hours total. Lessons, drills, then a mock. Built for someone who does not write Python daily. ",
        el("b", null, "Start here if the assessment is in the next 24 hours."))),
    el("div", { class: "cram-hero__cta" }, "Start →"));
}

/* a clickable banner when a timed exam is mid-flight — the clock is running */
function resumeBanner() {
  const exam = getActiveExam();
  if (!exam || isExpired(exam)) return null;
  const minsLeft = Math.max(0, Math.round((exam.deadline - Date.now()) / 60000));
  return el("a", {
    class: "card card--accent reveal reveal-2",
    href: "#/exam/" + exam.examId,
    style: { display: "block", marginTop: "16px" },
  },
    el("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
      el("span", { class: "pill pill--warn" }, "● Exam in progress"),
      el("span", { class: "mono", style: { fontWeight: "700" } }, exam.projectTitle),
      el("span", { style: { flex: "1" } }),
      el("span", { class: "mono", style: { fontSize: "12px", color: "var(--warn)" } },
        "~" + minsLeft + " min left — resume ▸")));
}
