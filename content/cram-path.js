/* cram-path.js — the prescribed sequential plan for someone sitting the
 * Fellowship / multi-level coding assessment TODAY.
 *
 * Target audience: not a daily Python user. Cannot skip Python basics.
 * Cannot afford to spend time on irrelevant modules (concurrency, advanced
 * generators, deque, string-split). Must come out the other side able to
 * write the canonical L1 → L2 → L3 → L4 progression cold.
 *
 * Every step is one of:
 *   - kind:"lesson"   id:<curriculum lesson id>
 *   - kind:"drill"    id:<drill id>
 *   - kind:"mock"     id:<project id>
 *   - kind:"break"    a recommended pause / hydration / walk
 *
 * Time estimates are doubled from the curriculum's `minutes` field — a
 * non-SE crammer will not run lessons at SE pace and needs the buffer.
 *
 * The "load_bearing" flag marks steps that absolutely cannot be skipped.
 * Other steps are valuable but can be skimmed if the clock is tight.
 */

export default {
  title: "Exam-Today Cram Path",
  subtitle: "Sitting the assessment in the next 24 hours — and you don't write Python daily",
  totalMinutes: 540,  // ~9 hours
  intro:
    "Top to bottom. Don't skip a load-bearing step. Each step has a checkbox — your progress persists in the browser. " +
    "Targeted at the four-level assessment shape: CRUD → queries → timestamps & TTL → capstone. " +
    "Concurrency (asyncio / threading), string-split parsing, deque, generators — NONE of these are on the real assessment. " +
    "We skip them all.",
  blocks: [
    {
      id: "block-1",
      title: "Block 1 — Python foundations",
      minutes: 120,
      blurb:
        "If you cannot write a function with a return statement and iterate a dict from memory, this is non-negotiable. Skim every code block, do every 'Apply it' exercise.",
      steps: [
        { kind: "lesson", id: "m0-what", minutes: 8, load_bearing: true,
          label: "What the assessment actually is",
          why: "Anchors the four-level shape before you write any code." },
        { kind: "lesson", id: "m0-sandbox", minutes: 8, load_bearing: true,
          label: "Using this trainer",
          why: "Get the Python sandbox under your fingers — every drill and mock runs through it." },
        { kind: "lesson", id: "m1-basics", minutes: 12, load_bearing: true,
          label: "Functions: def, return, basic flow",
          why: "Every method you write on the exam is a function." },
        { kind: "lesson", id: "m1-return", minutes: 10, load_bearing: true,
          label: "Returns, None, conditional returns",
          why: "L1 of every mock relies on returning None or False on the missing-key path." },
        { kind: "lesson", id: "m1-signatures", minutes: 12, load_bearing: true,
          label: "Parameters and defaults",
          why: "L3 retrofits backward-compatible signatures — you need to know how default values work." },
        { kind: "lesson", id: "m1-args", minutes: 10, load_bearing: false,
          label: "Positional, keyword, *args, **kwargs",
          why: "Skim — you mostly need positional + keyword on the exam." },
        { kind: "lesson", id: "m2-basics", minutes: 10, load_bearing: true,
          label: "Lists: literals, indexing, slicing",
          why: "Transaction logs, file results, top-N rankings — all lists." },
        { kind: "lesson", id: "m2-ops", minutes: 8, load_bearing: true,
          label: "List operations & slicing (append, insert, slicing tricks)",
          why: "Lesson title is `List operations & slicing` — teaches `.append`, `.insert`, and slicing including `[a:b]`, `[-2:]`, `[::-1]`. Membership (`x in xs`) is NOT covered here; you'll see it used in m3-basics and m3-patterns." },
        { kind: "lesson", id: "m2-methods", minutes: 10, load_bearing: true,
          label: "append, extend, pop, sort, sorted",
          why: "`sorted()` is the L2 workhorse." },
        { kind: "lesson", id: "m15-loops", minutes: 18, load_bearing: true,
          label: "for, while, range, break, continue (the drain idiom)",
          why: "Build the loop vocabulary from scratch — including the `while xs:` consume pattern — BEFORE the dense m2-iteration lesson. Side-by-side wrong vs right on the `drain(queue)` pattern. Take this here, not later." },
        { kind: "lesson", id: "m2-iteration", minutes: 10, load_bearing: true,
          label: "for, while, enumerate, zip (curriculum reps)",
          why: "Same topic as the lesson above, more exercises. Skim if m15-loops felt solid." },
        { kind: "lesson", id: "m2-mutability", minutes: 12, load_bearing: true,
          label: "Mutability traps — shared references",
          why: "Aliasing bugs in snapshots / backups will cost you L4." },
        { kind: "break", minutes: 10, label: "Stand up. Drink water. 10 minutes." },
      ],
    },

    {
      id: "block-1b",
      title: "Block 1.5 — Comprehensions recall drill",
      minutes: 18,
      blurb:
        "One supplemental lesson drilling list / dict / set / generator comprehensions until you can type them cold. The canonical L2 output idiom — generator-inside-`\", \".join(...)` — is the focus. 8 typing exercises. The loops sister-lesson is now folded into Block 1 right between m2-methods and m2-iteration.",
      steps: [
        { kind: "lesson", id: "m15-comprehensions", minutes: 18, load_bearing: true,
          label: "List, dict, and generator comprehensions",
          why: "Every L2 of every mock uses one. Generator-inside-`\", \".join(...)` is THE canonical L2 output for In-Memory DB. Drills the syntax until you can type it cold." },
      ],
    },

    {
      id: "block-1c",
      title: "Block 1.6 — Strings, URLs & using existing code (the things the exam actually hit)",
      minutes: 34,
      blurb:
        "The two fundamentals that show up as warm-ups and integration tasks, and the exact pair that can sink you if you've never typed them: normalizing text and URLs (lowercasing, urlparse, pulling out the host), and writing a function that USES code already written somewhere else (imports, a provided resolver function, and how tests mock it). DNS lookups, function-in-another-file wiring, lowercasing a URL — all here. 16 typing exercises.",
      steps: [
        { kind: "lesson", id: "m16-strings-urls", minutes: 16, load_bearing: true,
          label: "Strings & URL normalization",
          why: "Lowercasing a URL, trimming, replacing, and pulling the host out with urlparse. The warm-up task should take 60 seconds, not 40 minutes." },
        { kind: "lesson", id: "m16-using-existing-code", minutes: 18, load_bearing: true,
          label: "Using code from another file (imports + provided functions)",
          why: "How to call a function someone already wrote (in another file), the DNS resolve(host) pattern, and how tests pass or mock the resolver. This is the integration question that ran out the clock." },
      ],
    },

    {
      id: "block-1d",
      title: "Block 1.7 — Routing, relaying & querying a black box (the Q1 problem type, built out)",
      minutes: 92,
      blurb:
        "The full version of the DNS-resolver question that beat you, broken into a ladder you can climb. You normalize an input, query an opaque source you can only call (never read), use what comes back to query again, route through a registry of servers by longest-suffix match, follow redirects across servers, and wire a locked function correctly. Six lessons, 25 typing exercises, ending in a multi-hop resolver capstone. This is the single most important block for the exact thing that ran out your clock.",
      steps: [
        { kind: "lesson", id: "m17-wiring", minutes: 14, load_bearing: true,
          label: "Making functions connect (adapter / glue code)",
          why: "When prewritten functions work alone but don't connect, you write the adapter between them. You never rewrite their code, you reshape the data in the handoff." },
        { kind: "lesson", id: "m17a-resolve-single", minutes: 12, load_bearing: true,
          label: "Normalize, then query",
          why: "The first rung: clean the key, then call the injected lookup. You query the source, you never read it." },
        { kind: "lesson", id: "m17b-resolve-two-hop", minutes: 14, load_bearing: true,
          label: "Two hops: query, normalize, query again",
          why: "Query the first source to get a pointer, re-normalize it, query the second. The output of hop one is the input of hop two." },
        { kind: "lesson", id: "m17c-resolve-chain", minutes: 16, load_bearing: true,
          label: "Follow the chain until you hit an answer",
          why: "Variable-length redirect chains with a cycle guard. The exact loop a real resolver runs. A chain with no stop condition is a hang, and a hang is a zero." },
        { kind: "lesson", id: "m17d-resolve-registry", minutes: 16, load_bearing: true,
          label: "Route to the right server",
          why: "Pick the server by longest-suffix zone match and follow referrals across servers. Root to TLD to authoritative, the way DNS actually routes." },
        { kind: "lesson", id: "m17-blackbox", minutes: 20, load_bearing: true,
          label: "Query the black box (and the capstone)",
          why: "An opaque source you can only .query, returning opaque shapes you branch on. Ends in a full resolver capstone: normalize a URL, route, follow cross-zone redirects, and call the locked function exactly right." },
      ],
    },

    {
      id: "block-2",
      title: "Block 2 — Data structures that ARE the exam",
      minutes: 120,
      blurb:
        "Dict-of-dicts is the universal assessment storage shape. Tuple-key sorting is the universal L2 ranking. If only two things stick today, make it these.",
      steps: [
        { kind: "lesson", id: "m2-comprehensions", minutes: 15, load_bearing: true,
          label: "List & dict comprehensions",
          why: "Every L2 scan, every L3 _live filter, every L4 backup. Do the exercises twice." },
        { kind: "lesson", id: "m2-tuples-nested", minutes: 12, load_bearing: true,
          label: "Tuples, unpacking, nested structures",
          why: "L3 stores cells as `(value, set_at, expiry)` 3-tuples. Unpacking them is everywhere." },
        { kind: "lesson", id: "m3-basics", minutes: 10, load_bearing: true,
          label: "Dicts: literals, lookup, assignment",
          why: "The storage layer of every assessment project." },
        { kind: "lesson", id: "m3-dict", minutes: 10, load_bearing: true,
          label: "Iteration, keys, values, items",
          why: "L2 scans iterate `.items()`. L4 rollbacks iterate the whole store." },
        { kind: "lesson", id: "m3-mutation", minutes: 12, load_bearing: true,
          label: "In-place mutation, delete, update",
          why: "Account merges and field deletes need this pattern." },
        { kind: "lesson", id: "m3-patterns", minutes: 25, load_bearing: true,
          label: "setdefault, .get(k, default), dict-of-dicts",
          why: "THE single highest-leverage lesson. Burn `setdefault` and `.get(k, default)` into muscle memory." },
        { kind: "lesson", id: "m3-sets", minutes: 8, load_bearing: false,
          label: "Sets — membership tests",
          why: "Used in 'processed' marker for cashback. Read it, don't grind it." },
        { kind: "lesson", id: "m5-defaultdict", minutes: 12, load_bearing: true,
          label: "collections.defaultdict",
          why: "Cleaner than setdefault for the dict-of-lists case (transaction log)." },
        { kind: "break", minutes: 10, label: "Stand up. Drink water. 10 minutes." },
      ],
    },

    {
      id: "block-2a",
      title: "Block 2.4 — Classes & recall idioms (the missing prerequisite)",
      minutes: 76,
      blurb:
        "OOP and the recall idioms the curriculum never formally taught. Without these, the L1 Rehearsal drills feel like guessing. Each lesson is build-from-memory — read the example, then type the class from scratch in the editor. Six lessons, ~76 min, each with 3 recall + 3 applied + 2 cumulative exercises.",
      steps: [
        { kind: "lesson", id: "m13-classes", minutes: 15, load_bearing: true,
          label: "Classes, __init__, self, methods",
          why: "Build a class from scratch. Without this, EVERY mock-exam L1 is impossible." },
        { kind: "lesson", id: "m13-sentinels", minutes: 15, load_bearing: true,
          label: "Sentinel returns — None on missing, True/False on success",
          why: "The L1 contract of EVERY mock: dict.get returns None on miss, delete returns True/False, check-before-mutate." },
        { kind: "lesson", id: "m13-helpers", minutes: 12, load_bearing: true,
          label: "Private helper methods — _exists, _record, _log",
          why: "Every mock decomposes into _-prefixed helpers + public methods that compose them. Cuts duplication and bugs." },
        { kind: "lesson", id: "m13-ternary", minutes: 10, load_bearing: true,
          label: "Ternary expression — value if cond else other",
          why: "Reads like English: return None if rec is None else rec.get(field). Used in every reference solution." },
        { kind: "lesson", id: "m13-raise", minutes: 12, load_bearing: false,
          label: "Raising exceptions: raise ValueError + try/except",
          why: "One drill (strict-increasing-validate) needs it. Optional unless your archetype contract says raise." },
        { kind: "lesson", id: "m13-hasattr-copy", minutes: 12, load_bearing: false,
          label: "hasattr lazy init + dict() shallow copy",
          why: "Only needed for mock-imdb-4 L4 backup. Optional today, take it if you're heading toward that mock." },
      ],
    },

    {
      id: "block-2a2",
      title: "Block 2.45 — Strings beyond split (the L2 output toolkit)",
      minutes: 28,
      blurb:
        "Three string methods drive every L2 output in the mocks: startswith for prefix filters, endswith for suffix filters, join for the formatted strings. Plus str() conversion + f-strings for assembling the output lines. Two short lessons, ~28 min total.",
      steps: [
        { kind: "lesson", id: "m14-string-methods", minutes: 15, load_bearing: true,
          label: "String methods: startswith, endswith, join",
          why: "Every L2 in every mock uses at least one of these. The canonical 'field(value), field(value)' L2 output is built via join." },
        { kind: "lesson", id: "m14-string-case", minutes: 13, load_bearing: true,
          label: "String case, str() conversion, f-strings",
          why: "str() converts ints for concatenation ('payment' + str(n)). f-strings appear in some test code so you must read them." },
      ],
    },

    {
      id: "block-2b",
      title: "Block 2.5 — L1 hands-on rehearsal (THE bridge drill)",
      minutes: 25,
      blurb:
        "You've learned function-writing (m1) and dict idioms (m3) separately. Now assemble them into the exact L1 shape every mock starts with: a tiny class with set/get/delete and the canonical sentinels (None on missing, True/False on success/failure). If you skip this block, the dict-of-dicts L1 will still feel unfamiliar when you sit the real exam — this is the rehearsal that bridges the gap.",
      steps: [
        { kind: "drill", id: "l1-rehearsal-kv", minutes: 7, load_bearing: true,
          label: "Drill: Mini Key-Value Store (L1 for In-Memory DB)",
          why: "The exact L1 contract of mock-imdb-4. Return None on missing get, True/False on delete." },
        { kind: "drill", id: "l1-rehearsal-bank", minutes: 9, load_bearing: true,
          label: "Drill: Mini Account Store (L1 for Banking)",
          why: "The exact L1 contract of mock-bank-4. Create returns bool, deposit/withdraw return new balance or None — and the no-mutation-on-insufficient rule lives or dies here." },
        { kind: "drill", id: "l1-rehearsal-files", minutes: 7, load_bearing: true,
          label: "Drill: Mini File Store (L1 for Cloud / Files)",
          why: "The exact L1 contract of mock-cloud-4 and mock-files-4. Copy must check BOTH preconditions (missing source and taken dest) before mutating." },
        { kind: "break", minutes: 2, label: "Sanity check: could you write all three classes again from a blank file?" },
      ],
    },

    {
      id: "block-2c",
      title: "Block 2.75 — Class construction idioms (the load-bearing seven)",
      minutes: 45,
      blurb:
        "A curriculum-gap audit (docs/research/curriculum-gap-audit/) verified that seven Python idioms used in the mock exams are drilled in ZERO existing exercises: setdefault(k,{}), str.startswith/endswith, for ... in list(d.items()), private helper methods, str.join with a generator, class-level constants, and hasattr lazy init. These seven new drills close that gap. Skip them and you'll keep hitting 'I read the lesson but never wrote the pattern' moments through the rest of the path.",
      steps: [
        { kind: "drill", id: "setdefault-grades", minutes: 6, load_bearing: true,
          label: "Drill: setdefault for dict-of-dicts",
          why: "The single most-used dict idiom in In-Memory DB. One line replaces a 4-line if/check." },
        { kind: "drill", id: "prefix-suffix-filter", minutes: 5, load_bearing: true,
          label: "Drill: prefix + suffix filter",
          why: "str.startswith + str.endswith. Every L2 needs the first; mock-cloud-4 needs the second. Neither exists in any other drill." },
        { kind: "drill", id: "process-due-queue", minutes: 8, load_bearing: true,
          label: "Drill: process-due queue (safe iteration + deletion)",
          why: "for ... in list(d.items()) — the wrap that prevents RuntimeError when deleting during iteration. Banking L3 cashback drain depends on it." },
        { kind: "drill", id: "class-helpers", minutes: 8, load_bearing: true,
          label: "Drill: class with private helpers",
          why: "Every mock decomposes into _exists / _record / _log helpers. Build the pattern in miniature so the mock structure feels familiar." },
        { kind: "drill", id: "format-records-join", minutes: 6, load_bearing: true,
          label: "Drill: str.join with a generator (L2 output format)",
          why: "Generator-inside-join with + concatenation — the exact L2 output shape mock-imdb-4 returns. Reinforces what format-record (list comp) only half-covered." },
        { kind: "drill", id: "class-constants", minutes: 6, load_bearing: true,
          label: "Drill: class-level constants + self.CONSTANT",
          why: "Banking L3 declares CASHBACK_RATE = 2 and CASHBACK_DELAY = 86_400_000 at the class level. Accessing via self.X is the canonical pattern — never seen in any other drill." },
        { kind: "drill", id: "hasattr-lazy-init", minutes: 6, load_bearing: false,
          label: "Drill: hasattr lazy init",
          why: "Only used in mock-imdb-4 L4 backup. Optional today, but a 6-minute drill that saves a rewrite of __init__ mid-exam if you draw that archetype." },
      ],
    },

    {
      id: "block-3",
      title: "Block 3 — Sorting & ranking patterns",
      minutes: 65,
      blurb:
        "Every L2 in every mock is a tuple-key sort. The pattern `sorted(xs, key=lambda x: (-x.score, x.name))` is the single most-repeated five-line block in the assessment.",
      steps: [
        { kind: "lesson", id: "m6-key", minutes: 15, load_bearing: true,
          label: "sorted(key=...) — mechanics",
          why: "Foundation for tuple keys." },
        { kind: "lesson", id: "m6-tuple-keys", minutes: 25, load_bearing: true,
          label: "Tuple keys — negate-for-desc, lex tie-break",
          why: "This IS Level 2 of every mock. Memorize the negate-for-desc trick." },
        { kind: "drill", id: "sort-by-score-then-name", minutes: 8, load_bearing: true,
          label: "Drill: sort by score desc, name asc",
          why: "Rehearses the canonical pattern in isolation." },
        { kind: "drill", id: "top-n-frequent", minutes: 8, load_bearing: true,
          label: "Drill: top-N frequent",
          why: "Tuple-key sort applied to a Counter." },
        { kind: "drill", id: "dense-rank", minutes: 8, load_bearing: false,
          label: "Drill: dense rank",
          why: "Optional — solid sorted-set practice." },
      ],
    },

    {
      id: "block-4",
      title: "Block 4 — Reading unittest as the spec",
      minutes: 50,
      blurb:
        "On the real exam the prose is intentionally ambiguous. The unit tests are the precise spec — read them first, write code to them. Learn this reflex.",
      steps: [
        { kind: "lesson", id: "m7-anatomy", minutes: 12, load_bearing: true,
          label: "unittest structure: TestCase, setUp",
          why: "Recognize the test shape so you can read it under pressure." },
        { kind: "lesson", id: "m7-assertions", minutes: 12, load_bearing: true,
          label: "assertEqual, assertTrue, assertRaises",
          why: "Each assertion IS a requirement." },
        { kind: "lesson", id: "m7-fixtures", minutes: 10, load_bearing: false,
          label: "setUp / tearDown / shared state",
          why: "Helpful background; skippable today." },
        { kind: "lesson", id: "m7-spec", minutes: 12, load_bearing: true,
          label: "Tests ARE the spec — reading them under time pressure",
          why: "When prose and tests disagree, follow the tests." },
        { kind: "lesson", id: "m7-running", minutes: 8, load_bearing: false,
          label: "Running unittest from a CLI",
          why: "Not how the in-browser sandbox works. Skim only." },
      ],
    },

    {
      id: "block-5",
      title: "Block 5 — Time, TTL & the L3 refactor (the make-or-break level)",
      minutes: 75,
      blurb:
        "Level 3 is where most candidates lose points — not because it's hard, but because the L1/L2 tests silently break when storage changes. This block is non-negotiable.",
      steps: [
        { kind: "lesson", id: "m9-ttl", minutes: 20, load_bearing: true,
          label: "TTL semantics: alive on [ts, ts+ttl)",
          why: "Every L3 in every mock uses this exact window." },
        { kind: "lesson", id: "m9-snapshot", minutes: 15, load_bearing: true,
          label: "Snapshots, deep-copy, independence",
          why: "L4 backup/restore depends on this." },
        { kind: "lesson", id: "m8-progressive", minutes: 12, load_bearing: true,
          label: "The progressive-level pattern",
          why: "Tells you what each level is for so you stop being surprised." },
        { kind: "lesson", id: "m8-refactor", minutes: 15, load_bearing: true,
          label: "Designing for the refactor",
          why: "Build L1 cells with (value, set_at, expiry) from day one." },
        { kind: "drill", id: "value-at", minutes: 6, load_bearing: true,
          label: "Drill: value at a time",
          why: "Rehearses the lazy-expiry-on-read pattern." },
        { kind: "drill", id: "active-keys", minutes: 6, load_bearing: false,
          label: "Drill: active keys",
          why: "Optional — filter to live keys." },
        { kind: "drill", id: "strict-increasing-validate", minutes: 5, load_bearing: true,
          label: "Drill: strict-increasing timestamp guard",
          why: "Banking timestamps are strictly increasing — drill the contract so you never get blindsided by a same-timestamp test case." },
        { kind: "break", minutes: 15, label: "Eat something. Walk 15 minutes. Don't open the laptop." },
      ],
    },

    {
      id: "block-6",
      title: "Block 6 — The 4-level exam anatomy (the mental model)",
      minutes: 75,
      blurb:
        "This is the new M12 module — the canonical 4-level walkthrough with every assessment-platform knowledge-base quote and every cited candidate writeup. It pulls everything above into one coherent shape.",
      steps: [
        { kind: "lesson", id: "m12-shape", minutes: 12, load_bearing: true,
          label: "M12 — What the 4-level shape actually is",
          why: "Anchors the 250-per-level / 1000-max / 90-min reality." },
        { kind: "lesson", id: "m12-arc", minutes: 18, load_bearing: true,
          label: "M12 — The L1→L4 arc walked end to end",
          why: "Worked example with the in-memory DB. Pre-built mental model for the real exam." },
        { kind: "lesson", id: "m12-l3-refactor", minutes: 20, load_bearing: true,
          label: "M12 — The L3 timestamp refactor pattern (THE most important lesson)",
          why: "The single design choice that decides whether L3 costs 8 min or 30. Do its exercise." },
        { kind: "lesson", id: "m12-l4-capstones", minutes: 15, load_bearing: true,
          label: "M12 — L4 capstone patterns — choose-your-own",
          why: "Backup/restore vs merge vs rollback vs compression. Pre-decide your shape." },
        { kind: "lesson", id: "m12-pacing", minutes: 10, load_bearing: true,
          label: "M12 — 90-min time budget & exam-day checklist",
          why: "Burn the 12 / 22 / 30 / 22 split into memory." },
      ],
    },

    {
      id: "block-7",
      title: "Block 7 — Exam-pattern drill warm-up",
      minutes: 45,
      blurb:
        "Five focused drills that exercise the exact micro-skills L1-L4 demand. These are the warm-up reps before the first mock — like a runner stretching at the line.",
      steps: [
        { kind: "drill", id: "format-record", minutes: 6, load_bearing: true,
          label: "Drill: format a record as field(value)",
          why: "L2 output shape for In-Memory DB." },
        { kind: "drill", id: "top-spenders-format", minutes: 8, load_bearing: true,
          label: "Drill: top spenders as id(total)",
          why: "L2 output shape for Banking." },
        { kind: "drill", id: "backup-with-ttl-reanchor", minutes: 10, load_bearing: true,
          label: "Drill: backup with TTL re-anchor",
          why: "L4 capstone for In-Memory DB — the trickiest TTL operation in the exam." },
        { kind: "drill", id: "delayed-effect-queue", minutes: 10, load_bearing: true,
          label: "Drill: delayed effect queue",
          why: "Banking L3 cashback mechanism." },
        { kind: "drill", id: "evict-by-largest", minutes: 8, load_bearing: false,
          label: "Drill: evict by largest",
          why: "Optional — Cloud Storage L3 eviction." },
        { kind: "drill", id: "historical-balance", minutes: 8, load_bearing: false,
          label: "Drill: historical balance (Banking L4 alt)",
          why: "Replay a transaction log to reconstruct balance at any past time. Take this if you're heading toward the canonical mock-bank-4." },
        { kind: "drill", id: "merge-with-redirect", minutes: 8, load_bearing: false,
          label: "Drill: merge with redirect (Banking L4 alt)",
          why: "Absorb one entity into another and redirect pending references — the Banking merge_accounts pattern in isolation." },
        { kind: "drill", id: "compress-halve", minutes: 6, load_bearing: false,
          label: "Drill: compress / decompress (Cloud L4 alt)",
          why: "Only for mock-cloud-4 — the file-size halving toggle." },
        { kind: "drill", id: "rollback-to", minutes: 8, load_bearing: false,
          label: "Drill: rollback by event replay (Files / Bank-rollback L4 alt)",
          why: "Reconstruct state at a past time by replaying an event log. Take this if heading toward mock-files-4 or mock-bank-rollback-4." },
        { kind: "break", minutes: 10, label: "Final stretch. 10 minutes off. The L4-capstone alts above are a MENU — pick the one that matches your first-mock archetype, skip the others." },
      ],
    },

    {
      id: "block-8",
      title: "Block 8 — First mock exam (untimed first, then timed)",
      minutes: 90,
      blurb:
        "Take ONE 4-level mock end to end, untimed, in the Projects screen — not in the Mock Exam screen yet. The goal is to ship every level correctly. After: if you have time and energy, take a SECOND mock under the 90-minute clock.",
      steps: [
        { kind: "mock", id: "mock-imdb-4", minutes: 90, load_bearing: true,
          label: "Mock: In-Memory DB (4-level, canonical)",
          why: "The canonical archetype. Cleanest L4 (backup/restore). Take it untimed first — open it from the Projects screen, not the Mock Exam screen." },
      ],
    },

    {
      id: "block-9",
      title: "Block 9 — Optional second pass (only if you have energy)",
      minutes: 0,
      blurb:
        "If you finished Block 8 and still have hours and brain, do one more — UNDER THE 90-MIN CLOCK this time (start it from the Mock Exam screen, not Projects). Six 4-level mocks total ship in this trainer — pick whichever archetype you want more reps on. The first four are the canonical capstones; the last two are alt-L4 variants of the same L1-L3 base.",
      steps: [
        { kind: "mock", id: "mock-bank-4", minutes: 90, load_bearing: false,
          label: "Mock: Banking System (canonical — merge + history L4)",
          why: "Different archetype than Block 8's imdb. L4 is merge_accounts + historical get_balance. Take this if your weakest spot is transaction logs." },
        { kind: "mock", id: "mock-files-4", minutes: 90, load_bearing: false,
          label: "Mock: File Storage (canonical — rollback L4)",
          why: "TTL in SECONDS not milliseconds (watch the unit!). L4 is event-replay rollback. Take this if your weakest spot is event sourcing." },
        { kind: "mock", id: "mock-cloud-4", minutes: 90, load_bearing: false,
          label: "Mock: Cloud Storage (compression L4)",
          why: "Unique among the six — L3 has users + quotas with largest-first eviction, L4 has file compression. Take this if you want exposure to non-TTL L4 capstones." },
        { kind: "mock", id: "mock-imdb-merge-4", minutes: 90, load_bearing: false,
          label: "Mock: In-Memory DB (alt — record merge L4)",
          why: "Same L1-L3 as the canonical imdb mock you already did — different capstone. L4 here is record merge with collision rules. Take this for a focused L4 rep without re-learning L1-L3." },
        { kind: "mock", id: "mock-bank-rollback-4", minutes: 90, load_bearing: false,
          label: "Mock: Banking System (alt — rollback L4)",
          why: "Same L1-L3 as canonical bank — but L4 is full rollback that reverses cashback already credited. Take this if you want to drill event-sourcing on Banking." },
      ],
    },
  ],
};
