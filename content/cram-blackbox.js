/* cram-blackbox.js — the dedicated "Black Box Path".
 *
 * A single guided sequence that takes a learner from zero to the
 * `mock-dns-4` exam: every prerequisite fundamental for the black-box DNS
 * resolver + data-normalization problem, in dependency order, then the
 * black-box pattern itself (m17), resolver mastery (m46), the full
 * step-by-step DNS resolver (m47), and finally the timed mock exam.
 *
 * Unlike the Exam-Today cram (which targets the In-Memory-DB / Banking /
 * Files mocks and only touches the black box at the m17 level), this path is
 * built around ONE problem type and follows it all the way down.
 *
 * Schema mirrors cram-path.js: blocks -> steps, each step is
 *   kind:"lesson"|"drill"|"mock"|"break", with id / minutes / load_bearing /
 *   label / why. Every lesson id below was verified to exist in curriculum.js.
 */

export default {
  title: "Black Box Path",
  subtitle: "From zero to the DNS-resolver / data-normalization problem — every prerequisite, in order, ending at the mock exam",
  totalMinutes: 760, // ~12.5 hours of focused work
  intro:
    "One problem type, followed all the way down. The black-box resolver looks exotic, but it is a stack of ordinary fundamentals: normalize a name, call an injected function without reaching inside it, parse the dict it returns, follow references with a cycle guard, and cache. " +
    "This path teaches each of those in dependency order, then assembles them through the m17 black-box pattern, m46 resolver mastery, and the full m47 DNS resolver — closing on the mock-dns-4 exam. " +
    "Load-bearing steps cannot be skipped. Progress persists in the browser.",
  blocks: [
    {
      id: "bb-1",
      title: "Block 1 — Function & data foundations",
      minutes: 60,
      blurb:
        "The resolver is a function that RECEIVES a function. Closures hold the query budget. Get these cold before anything else.",
      steps: [
        { kind: "lesson", id: "m1-basics", minutes: 12, load_bearing: true,
          label: "def, return, basic flow",
          why: "Every resolver helper (normalize, find_a, glue_ip) is a plain function." },
        { kind: "lesson", id: "m1-return", minutes: 10, load_bearing: true,
          label: "Returns, None, conditional returns",
          why: "Returning None on the unresolvable path is the resolver's core failure signal." },
        { kind: "lesson", id: "m1-signatures", minutes: 10, load_bearing: true,
          label: "Parameters & defaults",
          why: "resolve(name, send_query, root_ip=\"198.41.0.4\") — you must know how defaults work." },
        { kind: "lesson", id: "m1-higher-order", minutes: 16, load_bearing: true,
          label: "Functions as values; passing & calling functions",
          why: "THE central idea: send_query is INJECTED. You receive a function and call it — never reach past it." },
        { kind: "lesson", id: "m1-scope", minutes: 12, load_bearing: true,
          label: "Scope & closures",
          why: "The query-budget counter and the shared cache are closures over a mutable cell." },
      ],
    },
    {
      id: "bb-2",
      title: "Block 2 — Dicts, sets & tuple keys",
      minutes: 80,
      blurb:
        "The response is a dict of lists of tuples. The cycle guard is a set of (server, name). The cache key is a tuple. This block is the resolver's data layer.",
      steps: [
        { kind: "lesson", id: "m2-iteration", minutes: 10, load_bearing: true,
          label: "for / while / enumerate / zip",
          why: "Walk the answers / authority / additional record lists." },
        { kind: "lesson", id: "m2-tuples-nested", minutes: 12, load_bearing: true,
          label: "Tuples & unpacking",
          why: "Each record is a (name, type, value) tuple you unpack in the loop." },
        { kind: "lesson", id: "m3-dict", minutes: 10, load_bearing: true,
          label: "Dict access & .get",
          why: "The response is a dict; .get / membership avoid KeyError on a missing section." },
        { kind: "lesson", id: "m3-mutation", minutes: 12, load_bearing: true,
          label: "Mutating dicts",
          why: "Build the response cache dict as resolution proceeds." },
        { kind: "lesson", id: "m3-patterns", minutes: 22, load_bearing: false,
          label: "Dict idioms (count / group)",
          why: "Reused when batching and de-duplicating queries. Skim if solid." },
        { kind: "lesson", id: "m3-sets", minutes: 8, load_bearing: true,
          label: "Sets",
          why: "The visited-(server, name) set is your cycle guard." },
        { kind: "lesson", id: "m6-tuple-keys", minutes: 22, load_bearing: true,
          label: "Tuples as dict keys",
          why: "The cache key is the tuple (server_ip, name) — must be hashable." },
        { kind: "break", minutes: 10, label: "Stand up. Water. 10 minutes." },
      ],
    },
    {
      id: "bb-3",
      title: "Block 3 — Strings & normalization",
      minutes: 52,
      blurb:
        "The data-normalization half of the problem: lower-case, strip, collapse trailing dots — and urlparse when the input is a URL.",
      steps: [
        { kind: "lesson", id: "m19-search", minutes: 12, load_bearing: false,
          label: "String search / membership / find",
          why: "Inspect and locate within names. Skim." },
        { kind: "lesson", id: "m19-case", minutes: 12, load_bearing: true,
          label: "lower / upper / casefold",
          why: "Names are case-insensitive — lowercase before every comparison." },
        { kind: "lesson", id: "m19-split-strip", minutes: 12, load_bearing: true,
          label: "strip / split / rstrip",
          why: "normalize() strips whitespace and collapses trailing dots to exactly one." },
        { kind: "lesson", id: "m16-strings-urls", minutes: 16, load_bearing: true,
          label: "String & URL normalization (urlparse / .hostname)",
          why: "When the input is a URL, urlparse(url).hostname gives the lowercased host. The normalization core." },
      ],
    },
    {
      id: "bb-4",
      title: "Block 4 — Control flow & exceptions",
      minutes: 54,
      blurb:
        "The resolution loop, and the exceptions that make NXDOMAIN definitive and the budget abortable.",
      steps: [
        { kind: "lesson", id: "m15-loops", minutes: 18, load_bearing: true,
          label: "for / while / break / continue (the drain idiom)",
          why: "The iterative resolution loop and the consume-until-resolved pattern." },
        { kind: "lesson", id: "m22-try-except-basics", minutes: 12, load_bearing: true,
          label: "try / except",
          why: "Catch KeyError from the black box; treat a miss as None instead of crashing." },
        { kind: "lesson", id: "m22-raise", minutes: 12, load_bearing: true,
          label: "raise",
          why: "Raise to make a definitive NXDOMAIN stop the whole search, or to signal out-of-budget." },
        { kind: "lesson", id: "m22-custom-assert", minutes: 12, load_bearing: false,
          label: "Custom exceptions & assert",
          why: "A small custom exception cleanly aborts a doomed resolution from deep in recursion." },
      ],
    },
    {
      id: "bb-5",
      title: "Block 5 — Following references: recursion, cycles, cache",
      minutes: 86,
      blurb:
        "Walking delegations is graph traversal. Cycle guards are Floyd. Alias canonicalization is union-find. The batch cache is memoization.",
      steps: [
        { kind: "lesson", id: "m32-dfs", minutes: 14, load_bearing: true,
          label: "Tree DFS / recursion",
          why: "Recursion is how you follow a delegation and resolve a missing-glue nameserver first." },
        { kind: "lesson", id: "m33-dfs", minutes: 14, load_bearing: true,
          label: "Graph DFS",
          why: "The delegation / redirect graph: visit, recurse, backtrack to the next nameserver." },
        { kind: "lesson", id: "m30-cycle", minutes: 16, load_bearing: true,
          label: "Floyd cycle detection",
          why: "Detect and stop on resolution / alias cycles instead of looping forever." },
        { kind: "lesson", id: "m34-the-idea", minutes: 10, load_bearing: false,
          label: "Union-Find: the idea",
          why: "Canonicalize aliases to a single representative — the CNAME pattern, formalized." },
        { kind: "lesson", id: "m34-implement", minutes: 16, load_bearing: false,
          label: "Union-Find: implementation",
          why: "find() chases parents to a root — exactly the alias-resolution chase." },
        { kind: "lesson", id: "m24-functools", minutes: 16, load_bearing: true,
          label: "functools (lru_cache / memo)",
          why: "Memoize queries so a batch resolution never re-asks the same (server, name)." },
        { kind: "break", minutes: 10, label: "Break. Walk. 10 minutes." },
      ],
    },
    {
      id: "bb-6",
      title: "Block 6 — Using existing code & the black-box pattern",
      minutes: 110,
      blurb:
        "The Q1 problem type itself, built from a single hop up to longest-suffix registry routing and the opaque-shape capstone.",
      steps: [
        { kind: "lesson", id: "m16-using-existing-code", minutes: 18, load_bearing: true,
          label: "Using code from another file (imports + provided functions)",
          why: "Call the resolver you were handed. Injection vs monkeypatch — know both." },
        { kind: "lesson", id: "m17-wiring", minutes: 14, load_bearing: true,
          label: "Making functions connect (adapter / glue)",
          why: "Reshape data between mismatched signatures — the adapter pattern." },
        { kind: "lesson", id: "m17a-resolve-single", minutes: 12, load_bearing: true,
          label: "Normalize, then query (single hop)",
          why: "One hop: normalize the name, call the box, parse the answer." },
        { kind: "lesson", id: "m17b-resolve-two-hop", minutes: 14, load_bearing: true,
          label: "Two hops: query, normalize, query again",
          why: "Re-normalize the pointer the box returns BEFORE re-querying it." },
        { kind: "lesson", id: "m17c-resolve-chain", minutes: 16, load_bearing: true,
          label: "Follow the chain until you hit an answer",
          why: "Loop until a terminal answer; a seen-set guards against cycles." },
        { kind: "lesson", id: "m17d-resolve-registry", minutes: 16, load_bearing: true,
          label: "Route to the right server",
          why: "Longest-matching-suffix zone routing against a registry." },
        { kind: "lesson", id: "m17-blackbox", minutes: 20, load_bearing: true,
          label: "Query the black box (and the capstone)",
          why: "Opaque return shapes (kind,value) / alias dicts, and the locked-function adapter." },
      ],
    },
    {
      id: "bb-7",
      title: "Block 7 — Resolver mastery",
      minutes: 82,
      blurb:
        "Each resolver sub-skill as a standalone drill: canonicalization, shortest-hops, glue resolution, failover, and TTL caching.",
      steps: [
        { kind: "lesson", id: "m46-unionfind", minutes: 16, load_bearing: false,
          label: "Canonicalize entities: chase parents to a representative",
          why: "The alias / CNAME chase as union-find." },
        { kind: "lesson", id: "m46-shortest", minutes: 16, load_bearing: false,
          label: "Fewest hops: BFS the redirect graph",
          why: "Shortest-path resolution + path reconstruction." },
        { kind: "lesson", id: "m46-glue", minutes: 18, load_bearing: true,
          label: "Resolve the resolver (glue records)",
          why: "Resolve a glue-less nameserver first — the missing-glue recursion, with a budget." },
        { kind: "lesson", id: "m46-failover", minutes: 16, load_bearing: true,
          label: "Fan-out, failover, and reverse lookups",
          why: "Try the next nameserver when one fails — the NS-fallback pattern." },
        { kind: "lesson", id: "m46-cache", minutes: 16, load_bearing: true,
          label: "Batch with memo, and cache with TTL",
          why: "The shared-cache batch resolver and TTL expiry boundary." },
      ],
    },
    {
      id: "bb-8",
      title: "Block 8 — The full DNS resolver, step by step",
      minutes: 138,
      blurb:
        "The complete online assessment, assembled one feature at a time — normalize, iterate, CNAME, missing glue, errors/fallback, cycles/budget, cached batch + async.",
      steps: [
        { kind: "lesson", id: "m47-normalize-and-the-black-box", minutes: 18, load_bearing: true,
          label: "Step 0 — Normalize, and the black-box rule",
          why: "The contract the whole problem rests on." },
        { kind: "lesson", id: "m47-iterative-resolution", minutes: 22, load_bearing: true,
          label: "Step 1 — Iterative resolution: follow delegations",
          why: "Root → TLD → authoritative via glue." },
        { kind: "lesson", id: "m47-cname-restart", minutes: 20, load_bearing: true,
          label: "Step 2 — CNAME records: restart from the top",
          why: "Aliases restart resolution from the root." },
        { kind: "lesson", id: "m47-missing-glue", minutes: 20, load_bearing: true,
          label: "Step 3 — Missing glue: resolve the nameserver first",
          why: "Recursively resolve a glue-less NS, then continue." },
        { kind: "lesson", id: "m47-errors-and-ns-fallback", minutes: 18, load_bearing: true,
          label: "Step 4 — Errors and NS fallback",
          why: "NXDOMAIN is definitive; REFUSED falls back to the next nameserver." },
        { kind: "lesson", id: "m47-cycles-and-budget", minutes: 18, load_bearing: true,
          label: "Step 5 — Cycles: cap the total number of queries",
          why: "The loop guard that makes a cyclic zone terminate." },
        { kind: "lesson", id: "m47-batch-cache-and-async", minutes: 22, load_bearing: false,
          label: "Steps 6 & 7 — Cached batch, then bounded-concurrency async",
          why: "Shared-cache batch and the async finale (async is a stretch goal)." },
        { kind: "break", minutes: 10, label: "Last break before the exam. 10 minutes." },
      ],
    },
    {
      id: "bb-9",
      title: "Block 9 — The exam",
      minutes: 90,
      blurb:
        "Sit it under the clock. Four levels: iterative resolution → CNAME → missing glue + NXDOMAIN/NS-fallback → loop guard + cached batch.",
      steps: [
        { kind: "mock", id: "mock-dns-4", minutes: 90, load_bearing: true,
          label: "DNS Resolver (Black Box) — 4-level Mock",
          why: "Everything in this path, assembled cold under the 90-minute clock." },
      ],
    },
  ],
};
