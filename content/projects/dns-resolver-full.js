/* dns-resolver-full — the COMPLETE hand-written DNS resolver online assessment,
 * carried all the way through Step 7 (bounded-concurrency async).
 *
 * WHY THIS EXISTS (read the dossier: docs/research/dns-question-recovery/).
 * The recovered spec describes the real online assessment as SEVEN steps, ending
 * in an async `resolve_all` that resolves a batch concurrently under an
 * `asyncio.Semaphore(max_workers)` with in-flight de-duplication. The
 * `mock-dns-4` exam compresses Steps 0-6 into the canonical 4-level assessment shape
 * (sync). This project is the EXTENDED-track sibling that keeps those four
 * levels verbatim and adds the missing async Step 7 as Level 5 — so the full
 * problem, including concurrency, can be rehearsed under one clock.
 *
 * Levels 1-4 are REUSED, unchanged, from mock-dns-4.js (same specs, tests, and
 * reference solutions) — only the per-level points are re-scaled to the
 * extended track's 100/level. Level 5 is new (async, mode: "async").
 *
 * NAMING NOTE (intentional): the real OA's Step 7 makes `resolve_all` itself
 * async. Here a single cumulative `solution.py` must satisfy BOTH the Level-4
 * SYNC `resolve_all` tests and the Level-5 ASYNC tests, so the async batch
 * resolver is named `resolve_all_async` to coexist with the sync `resolve_all`.
 * The mechanics (Semaphore bound + in-flight dedupe + shared cache) are exactly
 * the OA's Step 7; only the name differs, for the one-file exam format.
 */

import dns4 from "./mock-dns-4.js";

/* ---- Level 5 reference solution: the full sync resolver (SOL_4) PLUS the
 *      async Step-7 batch resolver. Reuses normalize/_find_a/_glue_ip from the
 *      sync solution it is appended to. ------------------------------------- */
const SOL_5 = dns4.levels[3].solution + `

# ------------------------------------------------------------------ Step 7 ----
import asyncio


def make_async_query(send_query, max_workers=5):
    # Step 7 core. \`send_query\` is now ASYNC (awaitable). This wrapper gives:
    #   - a result cache so a finished (name, server_ip) is never re-queried,
    #   - an in-flight task dict keyed by (name, server_ip) so two IDENTICAL
    #     concurrent queries share ONE network call (dedupe), and
    #   - a Semaphore(max_workers) bounding concurrent network calls.
    cache = {}
    inflight = {}
    sem = asyncio.Semaphore(max_workers)

    async def _do(name, server_ip):
        async with sem:                      # bound concurrency at the network edge
            return await send_query(name, server_ip)

    async def query(name, server_ip):
        key = (name, server_ip)
        if key in cache:
            return cache[key]
        if key in inflight:
            return await inflight[key]       # join the already-running request
        task = asyncio.ensure_future(_do(name, server_ip))
        inflight[key] = task
        try:
            response = await task
        finally:
            inflight.pop(key, None)
        cache[key] = response
        return response

    return query


async def _aresolve_one(name, query, root_ip, max_queries):
    # Iterative delegation (Steps 0,1,4) over the async \`query\`. Reuses the
    # sync helpers normalize/_find_a/_glue_ip defined above.
    name = normalize(name)
    budget = max_queries
    servers = [root_ip]
    while servers:
        usable = None
        for server_ip in servers:
            if budget <= 0:
                return None
            budget -= 1
            response = await query(name, server_ip)
            status = response["status"]
            if status == "NXDOMAIN":
                return None                  # definitive
            if status == "REFUSED":
                continue                     # soft fail -> try next server
            if status == "NOERROR":
                usable = response
                break
        if usable is None:
            return None
        ip = _find_a(usable, name)
        if ip is not None:
            return ip
        next_servers = []
        for zone, rtype, ns_name in usable["authority"]:
            if rtype == "NS":
                glue = _glue_ip(usable, ns_name)
                if glue is not None:
                    next_servers.append(glue)
        if not next_servers:
            return None
        servers = next_servers
    return None


async def resolve_all_async(names, send_query, root_ip=ROOT_IP, max_workers=5, max_queries=50):
    # Step 7: resolve every domain CONCURRENTLY, capped at max_workers in-flight
    # network calls, identical queries de-duplicated, behind ONE shared cache for
    # the whole call. \`send_query\` is async. Returns {name: ip_or_None}.
    query = make_async_query(send_query, max_workers)
    tasks = [_aresolve_one(n, query, root_ip, max_queries) for n in names]
    answers = await asyncio.gather(*tasks)
    return dict(zip(names, answers))
`;

const TESTS_5 = `import asyncio
import unittest
from collections import Counter
from solution import resolve_all_async, make_async_query

ROOT = "198.41.0.4"
COM = "192.5.6.30"


def make_async_network(table, delay=0.01):
    # Async fake network. Records every (server_ip, name) call and tracks the
    # PEAK number of send_query coroutines in flight at once.
    counts = Counter()
    live = {"now": 0, "peak": 0}

    async def send_query(name, server_ip):
        live["now"] += 1
        live["peak"] = max(live["peak"], live["now"])
        await asyncio.sleep(delay)          # simulate latency so overlap is real
        counts[(server_ip, name)] += 1
        live["now"] -= 1
        return table[(server_ip, name)]

    return send_query, counts, live


class Level5Tests(unittest.TestCase):
    def _two_level_table(self):
        AUTH = "10.0.0.53"
        table = {}
        for letter, ip in [("a", "1.1.1.1"), ("b", "2.2.2.2"),
                           ("c", "3.3.3.3"), ("d", "4.4.4.4")]:
            dom = letter + ".com."
            table[(ROOT, dom)] = {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns.gtld.net.")],
                "additional": [("ns.gtld.net.", "A", COM)],
            }
            table[(COM, dom)] = {
                "status": "NOERROR", "answers": [],
                "authority": [(dom, "NS", "ns." + dom)],
                "additional": [("ns." + dom, "A", AUTH)],
            }
            table[(AUTH, dom)] = {
                "status": "NOERROR", "answers": [(dom, "A", ip)],
                "authority": [], "additional": [],
            }
        return table

    async def testLevel5_resolves_all_concurrently(self):
        send_query, _, _ = make_async_network(self._two_level_table())
        out = await resolve_all_async(["a.com", "b.com", "c.com", "d.com"], send_query)
        self.assertEqual(out, {
            "a.com": "1.1.1.1", "b.com": "2.2.2.2",
            "c.com": "3.3.3.3", "d.com": "4.4.4.4",
        })

    async def testLevel5_respects_max_workers(self):
        send_query, _, live = make_async_network(self._two_level_table(), delay=0.02)
        await resolve_all_async(["a.com", "b.com", "c.com", "d.com"], send_query, max_workers=2)
        self.assertLessEqual(live["peak"], 2)   # never more than 2 in flight

    async def testLevel5_inflight_dedupe_same_name(self):
        send_query, counts, _ = make_async_network(self._two_level_table())
        # same name four times, concurrently -> each (server, name) hits net once
        await resolve_all_async(["a.com", "a.com", "a.com", "a.com"], send_query, max_workers=5)
        self.assertEqual(counts[(ROOT, "a.com.")], 1)
        self.assertEqual(counts[(COM, "a.com.")], 1)

    async def testLevel5_no_pair_queried_twice(self):
        send_query, counts, _ = make_async_network(self._two_level_table())
        await resolve_all_async(["a.com", "b.com", "a.com", "b.com"], send_query)
        for pair, n in counts.items():
            self.assertEqual(n, 1, "pair %r queried %d times" % (pair, n))

    async def testLevel5_make_async_query_bounds_and_dedupes(self):
        counts = Counter()
        live = {"now": 0, "peak": 0}

        async def send_query(name, server_ip):
            live["now"] += 1
            live["peak"] = max(live["peak"], live["now"])
            await asyncio.sleep(0.01)
            counts[(server_ip, name)] += 1
            live["now"] -= 1
            return {"ip": name}

        query = make_async_query(send_query, max_workers=2)
        names = ["x", "x", "y", "y", "z", "z"]      # 3 distinct, each requested twice
        await asyncio.gather(*[query(n, "S") for n in names])
        self.assertEqual(len(counts), 3)            # only 3 real network calls
        self.assertLessEqual(live["peak"], 2)       # bounded at max_workers


if __name__ == '__main__':
    unittest.main()
`;

const SPEC_5 = `# Level 5 — Bounded-Concurrency Async (Step 7)

The final step of the real assessment. Until now \`send_query\` was synchronous and you resolved one name at a time. Now **\`send_query\` is an \`async\` function** (you must \`await\` it), and you resolve a **batch of names concurrently** — but politely, never hammering the network with unbounded parallelism.

Write two things:

**1 · \`make_async_query(send_query, max_workers=5)\`** — returns an async \`query(name, server_ip)\` that wraps the async \`send_query\` with three guarantees:

- **Shared cache** — a finished \`(name, server_ip)\` is never queried again.
- **In-flight de-duplication** — if an identical \`(name, server_ip)\` is *already in flight*, a second caller **joins** that one task instead of issuing a duplicate network call (use a task dict keyed by \`(name, server_ip)\`).
- **Bounded concurrency** — at most \`max_workers\` real network calls run at once (\`asyncio.Semaphore(max_workers)\`).

**2 · \`async resolve_all_async(names, send_query, root_ip="198.41.0.4", max_workers=5, max_queries=50)\`** — resolve **every** name **concurrently** (e.g. \`asyncio.gather\`) through one shared \`query\` layer, each via iterative delegation with NXDOMAIN-stop / REFUSED-try-next and a per-name query budget. Return \`{name: ip_or_None}\`.

\`\`\`python
# send_query is async now:
#   response = await send_query(name, server_ip)
out = await resolve_all_async(["a.com", "b.com"], send_query, max_workers=2)
#   -> {"a.com": "...", "b.com": "..."}   with <= 2 network calls in flight at any moment
\`\`\`

> **Why \`resolve_all_async\` and not \`resolve_all\`?** Levels 1-4 still expose the **synchronous** \`resolve\`/\`resolve_all\` and their tests still run, so this one cumulative \`solution.py\` keeps both. In the original OA, Step 7 simply makes \`resolve_all\` itself async — same mechanics (Semaphore bound + in-flight dedupe + shared cache), one name apart.

The grader asserts the results are correct, that **peak concurrent \`send_query\` calls never exceed \`max_workers\`**, and that **identical concurrent queries hit the network exactly once**. Levels 1-4 must keep passing unchanged.`;

export default {
  id: "dns-resolver-full",
  title: "DNS Resolver — Full (through async Step 7)",
  domain: "Networking · Black-Box Resolver",
  kind: "exam",
  track: "extended",
  implFile: "solution.py",
  pointsPerLevel: 100,
  blurb:
    "The COMPLETE hand-written DNS resolver online assessment, carried through all 7 recovered steps. " +
    "Levels 1-4 are the mock-dns-4 arc (iterative → CNAME restart → glue/NXDOMAIN/NS-fallback → loop guard + cached batch); " +
    "Level 5 adds the async Step 7 — a bounded-concurrency resolve_all with an asyncio.Semaphore and in-flight de-duplication. " +
    "Deeper than the 4-level mock exam; the same black-box send_query rule throughout.",
  starterCode: dns4.starterCode,
  levels: [
    ...dns4.levels.map((lv) => ({ ...lv, points: 100 })),
    {
      n: 5,
      title: "Bounded-Concurrency Async (Step 7)",
      points: 100,
      mode: "async",
      changed:
        "send_query is now async. Resolve a batch concurrently behind a shared cache, de-duplicating in-flight queries and capping parallelism with asyncio.Semaphore(max_workers).",
      spec: SPEC_5,
      tests: TESTS_5,
      solution: SOL_5,
    },
  ],
};
