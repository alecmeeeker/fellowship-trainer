/* drills.js — focused single-skill exercises. Each: prompt (markdown),
 * starterCode, tests (a unittest module, or a plain class for async), and a
 * reference solution. Test modules import from `solution`. */

export default [
  /* ---------- Functions ---------- */
  {
    id: "apply-to-each",
    title: "Apply to Each",
    topic: "Functions",
    difficulty: 1,
    mode: "sync",
    blurb: "A higher-order function — take a function and call it on every item.",
    prompt: `# Apply to Each

Write \`apply_to_each(fn, items)\`. Return a **new list** holding \`fn\` applied to every item of \`items\`. Do not modify \`items\`.

\`apply_to_each(lambda x: x * 2, [1, 2, 3])\` returns \`[2, 4, 6]\`.`,
    starterCode: `def apply_to_each(fn, items):
    pass
`,
    tests: `import unittest
from solution import apply_to_each


class DrillTests(unittest.TestCase):
    def test_doubles(self):
        self.assertEqual(apply_to_each(lambda x: x * 2, [1, 2, 3]), [2, 4, 6])

    def test_with_named_function(self):
        self.assertEqual(apply_to_each(str.upper, ["a", "b"]), ["A", "B"])

    def test_empty(self):
        self.assertEqual(apply_to_each(len, []), [])

    def test_does_not_mutate_input(self):
        items = [1, 2, 3]
        apply_to_each(lambda x: x + 100, items)
        self.assertEqual(items, [1, 2, 3])
`,
    solution: `def apply_to_each(fn, items):
    return [fn(item) for item in items]
`,
  },
  {
    id: "make-counter",
    title: "Counter Factory",
    topic: "Functions",
    difficulty: 2,
    mode: "sync",
    blurb: "Return a function that remembers its own state — a closure with nonlocal.",
    prompt: `# Counter Factory

Write \`make_counter()\`. It returns a **function**. Each time that returned function is called it yields the next integer, starting at \`1\`.

Two counters from separate \`make_counter()\` calls must be independent.`,
    starterCode: `def make_counter():
    pass
`,
    tests: `import unittest
from solution import make_counter


class DrillTests(unittest.TestCase):
    def test_counts_up(self):
        c = make_counter()
        self.assertEqual(c(), 1)
        self.assertEqual(c(), 2)
        self.assertEqual(c(), 3)

    def test_counters_are_independent(self):
        c = make_counter()
        d = make_counter()
        c()
        c()
        self.assertEqual(d(), 1)
        self.assertEqual(c(), 3)
`,
    solution: `def make_counter():
    count = 0

    def tick():
        nonlocal count
        count += 1
        return count

    return tick
`,
  },

  /* ---------- Dictionaries ---------- */
  {
    id: "merge-counts",
    title: "Merge Counts",
    topic: "Dictionaries",
    difficulty: 1,
    mode: "sync",
    blurb: "Sum the values of two count dictionaries without mutating either input.",
    prompt: `# Merge Counts

Write \`merge_counts(a, b)\`. Both \`a\` and \`b\` are \`dict[str, int]\`. Return a **new** dict mapping every key that appears in either input to the **sum** of its values across both.

- A key in only one dict keeps its value.
- Do **not** mutate \`a\` or \`b\`.`,
    starterCode: `def merge_counts(a, b):
    # a, b: dict[str, int]
    pass
`,
    tests: `import unittest
from solution import merge_counts


class DrillTests(unittest.TestCase):
    def test_overlapping_keys(self):
        self.assertEqual(merge_counts({"a": 1}, {"a": 2, "b": 3}), {"a": 3, "b": 3})

    def test_empty_left(self):
        self.assertEqual(merge_counts({}, {"x": 5}), {"x": 5})

    def test_empty_right(self):
        self.assertEqual(merge_counts({"a": 1}, {}), {"a": 1})

    def test_does_not_mutate_inputs(self):
        a = {"a": 1}
        b = {"a": 9}
        merge_counts(a, b)
        self.assertEqual(a, {"a": 1})
        self.assertEqual(b, {"a": 9})
`,
    solution: `def merge_counts(a, b):
    out = dict(a)
    for key, value in b.items():
        out[key] = out.get(key, 0) + value
    return out
`,
  },
  {
    id: "invert-multimap",
    title: "Invert a Multimap",
    topic: "Dictionaries",
    difficulty: 2,
    mode: "sync",
    blurb: "Flip a key→value dict into value→sorted-list-of-keys.",
    prompt: `# Invert a Multimap

Write \`invert_multimap(d)\`. \`d\` maps each key to a single value. Return a dict that maps each **value** to the **sorted list of keys** that had it.`,
    starterCode: `def invert_multimap(d):
    pass
`,
    tests: `import unittest
from solution import invert_multimap


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(invert_multimap({"a": 1, "b": 2, "c": 1}),
                         {1: ["a", "c"], 2: ["b"]})

    def test_empty(self):
        self.assertEqual(invert_multimap({}), {})

    def test_keys_sorted(self):
        self.assertEqual(invert_multimap({"z": 1, "a": 1}), {1: ["a", "z"]})
`,
    solution: `def invert_multimap(d):
    out = {}
    for key, value in d.items():
        out.setdefault(value, []).append(key)
    for value in out:
        out[value].sort()
    return out
`,
  },

  /* ---------- Strings ---------- */
  {
    id: "parse-kv",
    title: "Parse Key-Value Pairs",
    topic: "Strings",
    difficulty: 1,
    mode: "sync",
    blurb: "Turn a \"a=1;b=2\" config string into a dictionary.",
    prompt: `# Parse Key-Value Pairs

Write \`parse_kv(line)\`. The input looks like \`"a=1;b=2;c=3"\` — pairs joined by \`;\`, each pair split by the first \`=\`. Return a \`dict\` of the pairs (values stay strings).

- An empty string returns \`{}\`.
- \`"k="\` maps \`k\` to the empty string.`,
    starterCode: `def parse_kv(line):
    pass
`,
    tests: `import unittest
from solution import parse_kv


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(parse_kv("a=1;b=2;c=3"), {"a": "1", "b": "2", "c": "3"})

    def test_empty_string(self):
        self.assertEqual(parse_kv(""), {})

    def test_single_pair(self):
        self.assertEqual(parse_kv("x=hello"), {"x": "hello"})

    def test_empty_value(self):
        self.assertEqual(parse_kv("k="), {"k": ""})
`,
    solution: `def parse_kv(line):
    out = {}
    if not line:
        return out
    for pair in line.split(";"):
        key, _, value = pair.partition("=")
        out[key] = value
    return out
`,
  },
  {
    id: "word-count",
    title: "Word Frequencies",
    topic: "Strings",
    difficulty: 2,
    mode: "sync",
    blurb: "Count words case-insensitively, ignoring surrounding punctuation.",
    prompt: `# Word Frequencies

Write \`word_count(text)\`. Split \`text\` on whitespace, lower-case each token, and strip leading/trailing punctuation (\`. , ! ? ; :\`). Return a \`dict\` mapping each non-empty word to how many times it appears.`,
    starterCode: `def word_count(text):
    pass
`,
    tests: `import unittest
from solution import word_count


class DrillTests(unittest.TestCase):
    def test_repeats(self):
        self.assertEqual(word_count("the cat the dog the"),
                         {"the": 3, "cat": 1, "dog": 1})

    def test_case_and_punctuation(self):
        self.assertEqual(word_count("Hello, hello! HELLO."), {"hello": 3})

    def test_empty(self):
        self.assertEqual(word_count(""), {})
`,
    solution: `def word_count(text):
    counts = {}
    for token in text.lower().split():
        word = token.strip(".,!?;:")
        if word:
            counts[word] = counts.get(word, 0) + 1
    return counts
`,
  },

  /* ---------- Lists ---------- */
  {
    id: "chunk",
    title: "Chunk a List",
    topic: "Lists",
    difficulty: 1,
    mode: "sync",
    blurb: "Split a list into consecutive sublists of a fixed size.",
    prompt: `# Chunk a List

Write \`chunk(xs, k)\`. Split list \`xs\` into consecutive sublists of length \`k\`. The final sublist may be shorter. An empty list returns \`[]\`.`,
    starterCode: `def chunk(xs, k):
    pass
`,
    tests: `import unittest
from solution import chunk


class DrillTests(unittest.TestCase):
    def test_uneven(self):
        self.assertEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])

    def test_empty(self):
        self.assertEqual(chunk([], 3), [])

    def test_exact(self):
        self.assertEqual(chunk([1, 2, 3], 3), [[1, 2, 3]])

    def test_k_larger_than_list(self):
        self.assertEqual(chunk([1, 2, 3], 5), [[1, 2, 3]])
`,
    solution: `def chunk(xs, k):
    return [xs[i:i + k] for i in range(0, len(xs), k)]
`,
  },
  {
    id: "running-max",
    title: "Running Maximum",
    topic: "Lists",
    difficulty: 2,
    mode: "sync",
    blurb: "Produce the list of maxima seen so far at each index.",
    prompt: `# Running Maximum

Write \`running_max(xs)\`. Return a list the same length as \`xs\` where index \`i\` holds the maximum of \`xs[0..i]\` inclusive. An empty list returns \`[]\`.`,
    starterCode: `def running_max(xs):
    pass
`,
    tests: `import unittest
from solution import running_max


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(running_max([3, 1, 4, 1, 5, 9, 2]), [3, 3, 4, 4, 5, 9, 9])

    def test_empty(self):
        self.assertEqual(running_max([]), [])

    def test_single(self):
        self.assertEqual(running_max([5]), [5])

    def test_ascending(self):
        self.assertEqual(running_max([1, 2, 3]), [1, 2, 3])
`,
    solution: `def running_max(xs):
    out = []
    best = None
    for x in xs:
        best = x if best is None else max(best, x)
        out.append(best)
    return out
`,
  },

  /* ---------- Sets ---------- */
  {
    id: "common-to-all",
    title: "Common to All",
    topic: "Sets",
    difficulty: 2,
    mode: "sync",
    blurb: "Find the elements present in every one of several lists.",
    prompt: `# Common to All

Write \`common_to_all(lists)\`. Given a list of lists, return a **sorted** list of the elements that appear in **every** one of them.

- If \`lists\` is empty, return \`[]\`.
- Duplicates within a list do not matter.`,
    starterCode: `def common_to_all(lists):
    pass
`,
    tests: `import unittest
from solution import common_to_all


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(common_to_all([[1, 2, 3], [2, 3, 4], [3, 2, 5]]), [2, 3])

    def test_empty_input(self):
        self.assertEqual(common_to_all([]), [])

    def test_no_overlap(self):
        self.assertEqual(common_to_all([[1, 2], [3, 4]]), [])

    def test_single_list_dedups(self):
        self.assertEqual(common_to_all([[5, 1, 5]]), [1, 5])
`,
    solution: `def common_to_all(lists):
    if not lists:
        return []
    common = set(lists[0])
    for lst in lists[1:]:
        common &= set(lst)
    return sorted(common)
`,
  },

  /* ---------- Sorting & Ranking ---------- */
  {
    id: "sort-by-score-then-name",
    title: "Sort by Score, then Name",
    topic: "Sorting & Ranking",
    difficulty: 2,
    mode: "sync",
    blurb: "The core tuple-key sort: one field descending, a tie-breaker ascending.",
    prompt: `# Sort by Score, then Name

Write \`sort_by_score_then_name(records)\`. Each record is a dict with \`"name"\` and \`"score"\`. Return the **list of names**, sorted by \`score\` **descending**, breaking ties by \`name\` **ascending**.

The pattern: \`key=lambda r: (-r["score"], r["name"])\`.`,
    starterCode: `def sort_by_score_then_name(records):
    pass
`,
    tests: `import unittest
from solution import sort_by_score_then_name


class DrillTests(unittest.TestCase):
    def test_basic(self):
        records = [
            {"name": "Bo", "score": 10},
            {"name": "Al", "score": 20},
            {"name": "Cy", "score": 10},
        ]
        self.assertEqual(sort_by_score_then_name(records), ["Al", "Bo", "Cy"])

    def test_empty(self):
        self.assertEqual(sort_by_score_then_name([]), [])

    def test_tie_breaks_by_name(self):
        records = [{"name": "Z", "score": 5}, {"name": "A", "score": 5}]
        self.assertEqual(sort_by_score_then_name(records), ["A", "Z"])
`,
    solution: `def sort_by_score_then_name(records):
    ordered = sorted(records, key=lambda r: (-r["score"], r["name"]))
    return [r["name"] for r in ordered]
`,
  },
  {
    id: "top-n-frequent",
    title: "Top-N Frequent",
    topic: "Sorting & Ranking",
    difficulty: 3,
    mode: "sync",
    blurb: "The N most frequent items, ties broken by the item's natural order.",
    prompt: `# Top-N Frequent

Write \`top_n_frequent(items, n)\`. Return the \`n\` items that occur most often, ordered by **count descending**, breaking ties by the **item value ascending**. If there are fewer than \`n\` distinct items, return them all.`,
    starterCode: `def top_n_frequent(items, n):
    pass
`,
    tests: `import unittest
from solution import top_n_frequent


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(top_n_frequent(["a", "b", "a", "c", "b", "a"], 2), ["a", "b"])

    def test_tie_broken_by_value(self):
        self.assertEqual(top_n_frequent(["z", "a", "z", "a"], 1), ["a"])

    def test_n_exceeds_distinct(self):
        self.assertEqual(top_n_frequent([1, 1, 2], 9), [1, 2])

    def test_empty(self):
        self.assertEqual(top_n_frequent([], 3), [])
`,
    solution: `def top_n_frequent(items, n):
    counts = {}
    for it in items:
        counts[it] = counts.get(it, 0) + 1
    ranked = sorted(counts, key=lambda x: (-counts[x], x))
    return ranked[:n]
`,
  },
  {
    id: "dense-rank",
    title: "Dense Rank",
    topic: "Sorting & Ranking",
    difficulty: 3,
    mode: "sync",
    blurb: "Assign 1-based dense ranks where equal scores share a rank.",
    prompt: `# Dense Rank

Write \`dense_rank(scores)\`. Return a list of **1-based dense ranks**: the highest score is rank \`1\`, equal scores share a rank, and the next distinct (lower) score takes the next integer — no gaps.

Example: \`[90, 85, 90, 70]\` → \`[1, 2, 1, 3]\`.`,
    starterCode: `def dense_rank(scores):
    pass
`,
    tests: `import unittest
from solution import dense_rank


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(dense_rank([90, 85, 90, 70]), [1, 2, 1, 3])

    def test_empty(self):
        self.assertEqual(dense_rank([]), [])

    def test_all_equal(self):
        self.assertEqual(dense_rank([50, 50, 50]), [1, 1, 1])

    def test_ascending_input(self):
        self.assertEqual(dense_rank([1, 2, 3]), [3, 2, 1])
`,
    solution: `def dense_rank(scores):
    distinct = sorted(set(scores), reverse=True)
    rank_of = {s: i + 1 for i, s in enumerate(distinct)}
    return [rank_of[s] for s in scores]
`,
  },

  /* ---------- collections ---------- */
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    topic: "collections",
    difficulty: 2,
    mode: "sync",
    blurb: "Bucket words into anagram groups with a defaultdict.",
    prompt: `# Group Anagrams

Write \`group_anagrams(words)\`. Group words that are anagrams of one another. Return a list of groups; each group is a **sorted** list of words, and the groups are ordered by their **first word**.

A natural fit for \`collections.defaultdict(list)\`, keyed by the sorted letters of each word.`,
    starterCode: `from collections import defaultdict


def group_anagrams(words):
    pass
`,
    tests: `import unittest
from solution import group_anagrams


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(
            group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]),
            [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]],
        )

    def test_empty(self):
        self.assertEqual(group_anagrams([]), [])

    def test_single_word(self):
        self.assertEqual(group_anagrams(["abc"]), [["abc"]])
`,
    solution: `from collections import defaultdict


def group_anagrams(words):
    buckets = defaultdict(list)
    for word in words:
        buckets["".join(sorted(word))].append(word)
    groups = [sorted(group) for group in buckets.values()]
    groups.sort(key=lambda group: group[0])
    return groups
`,
  },

  /* ---------- Time & TTL ---------- */
  {
    id: "value-at",
    title: "Value at a Time",
    topic: "Time & TTL",
    difficulty: 2,
    mode: "sync",
    blurb: "Look up the value in effect at time t from a sorted history.",
    prompt: `# Value at a Time

Write \`value_at(history, t)\`. \`history\` is a list of \`(timestamp, value)\` pairs **sorted by timestamp ascending**. Return the value of the **latest** entry whose timestamp is \`<= t\`, or \`None\` if no entry qualifies.

This is the heart of every "timestamps" assessment level.`,
    starterCode: `def value_at(history, t):
    pass
`,
    tests: `import unittest
from solution import value_at


class DrillTests(unittest.TestCase):
    def test_between_entries(self):
        self.assertEqual(value_at([(0, "a"), (10, "b"), (20, "c")], 15), "b")

    def test_exact_timestamp(self):
        self.assertEqual(value_at([(0, "a"), (10, "b")], 0), "a")

    def test_before_first(self):
        self.assertIsNone(value_at([(5, "a")], 2))

    def test_empty_history(self):
        self.assertIsNone(value_at([], 100))

    def test_after_last(self):
        self.assertEqual(value_at([(0, "a"), (10, "b")], 999), "b")
`,
    solution: `def value_at(history, t):
    result = None
    for timestamp, value in history:
        if timestamp <= t:
            result = value
        else:
            break
    return result
`,
  },
  {
    id: "active-keys",
    title: "Active Keys",
    topic: "Time & TTL",
    difficulty: 2,
    mode: "sync",
    blurb: "Filter a key→expiry map to the keys that have not expired.",
    prompt: `# Active Keys

Write \`active_keys(store, now)\`. \`store\` maps each key to an **expiry timestamp**. Return the **sorted** list of keys whose expiry is **strictly greater than** \`now\` (i.e. still live).`,
    starterCode: `def active_keys(store, now):
    pass
`,
    tests: `import unittest
from solution import active_keys


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(active_keys({"a": 10, "b": 5, "c": 20}, 8), ["a", "c"])

    def test_empty(self):
        self.assertEqual(active_keys({}, 5), [])

    def test_boundary_is_expired(self):
        self.assertEqual(active_keys({"x": 5}, 5), [])

    def test_sorted(self):
        self.assertEqual(active_keys({"z": 100, "a": 100}, 0), ["a", "z"])
`,
    solution: `def active_keys(store, now):
    return sorted(key for key, expiry in store.items() if expiry > now)
`,
  },

  /* ---------- asyncio ---------- */
  {
    id: "gather-squares",
    title: "Gather Squares",
    topic: "asyncio",
    difficulty: 2,
    mode: "async",
    blurb: "Run many coroutines concurrently and collect results in order.",
    prompt: `# Gather Squares

Write an async function \`gather_squares(nums)\`. For each number, an async helper computes its square. Run them **concurrently** with \`asyncio.gather\` and return the list of squares **in the same order** as the input.

> In this sandbox you \`await\` at the top level — there is no \`asyncio.run\`. On a real Python process you would wrap a coroutine in \`asyncio.run(main())\`.`,
    starterCode: `import asyncio


async def gather_squares(nums):
    pass
`,
    tests: `import asyncio
from solution import gather_squares


class DrillTests:
    async def test_basic(self):
        assert await gather_squares([1, 2, 3, 4]) == [1, 4, 9, 16]

    async def test_empty(self):
        assert await gather_squares([]) == []

    async def test_order_preserved(self):
        assert await gather_squares([5, 3, 1]) == [25, 9, 1]
`,
    solution: `import asyncio


async def gather_squares(nums):
    async def square(n):
        await asyncio.sleep(0)
        return n * n

    return await asyncio.gather(*[square(n) for n in nums])
`,
  },
  {
    id: "process-queue",
    title: "Worker Queue",
    topic: "asyncio",
    difficulty: 3,
    mode: "async",
    blurb: "Drain an asyncio.Queue with a pool of concurrent workers.",
    prompt: `# Worker Queue

Write an async function \`process_queue(items, n_workers)\`. Put every item on an \`asyncio.Queue\`, then run \`n_workers\` worker coroutines concurrently. Each worker pulls items until the queue is empty and collects them. Return the list of all collected items.

- Order of the returned list does not matter — the tests sort it.
- Use \`queue.get_nowait()\` and catch \`asyncio.QueueEmpty\` so a worker never blocks forever.`,
    starterCode: `import asyncio


async def process_queue(items, n_workers):
    pass
`,
    tests: `import asyncio
from solution import process_queue


class DrillTests:
    async def test_all_items_consumed(self):
        result = await process_queue([3, 1, 2, 4], 2)
        assert sorted(result) == [1, 2, 3, 4], result

    async def test_empty(self):
        assert await process_queue([], 3) == []

    async def test_single_worker(self):
        result = await process_queue([5, 6], 1)
        assert sorted(result) == [5, 6], result
`,
    solution: `import asyncio


async def process_queue(items, n_workers):
    queue = asyncio.Queue()
    for item in items:
        queue.put_nowait(item)
    collected = []

    async def worker():
        while True:
            try:
                item = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            await asyncio.sleep(0)
            collected.append(item)

    await asyncio.gather(*[worker() for _ in range(n_workers)])
    return collected
`,
  },

  /* ---------- threading ---------- */
  {
    id: "locked-counter",
    title: "Lock-Guarded Counter",
    topic: "threading",
    difficulty: 2,
    mode: "sync",
    blurb: "Build a counter whose every mutation is inside a Lock's critical section.",
    prompt: `# Lock-Guarded Counter

Build a \`LockedCounter\` class whose internal value is only ever touched inside a \`threading.Lock\`'s critical section — the pattern that prevents lost updates when real threads share a counter.

- \`__init__()\` — value starts at 0, create a \`threading.Lock\`.
- \`increment()\` — add 1, inside \`with self._lock:\`.
- \`add(n)\` — add \`n\`, inside the lock.
- \`value()\` — return the current value, inside the lock.

> The browser sandbox runs single-threaded, so these tests are deterministic — but the \`with lock:\` discipline is exactly what you would write for real threads.`,
    starterCode: `import threading


class LockedCounter:
    def __init__(self):
        pass

    def increment(self):
        pass

    def add(self, n):
        pass

    def value(self):
        pass
`,
    tests: `import unittest
from solution import LockedCounter


class DrillTests(unittest.TestCase):
    def test_starts_at_zero(self):
        self.assertEqual(LockedCounter().value(), 0)

    def test_increment(self):
        c = LockedCounter()
        for _ in range(5):
            c.increment()
        self.assertEqual(c.value(), 5)

    def test_add(self):
        c = LockedCounter()
        c.add(10)
        c.add(-3)
        self.assertEqual(c.value(), 7)
`,
    solution: `import threading


class LockedCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1

    def add(self, n):
        with self._lock:
            self._value += n

    def value(self):
        with self._lock:
            return self._value
`,
  },

  /* ---------- concurrency — extra coverage ---------- */
  {
    id: "with-timeout",
    title: "Run with a Timeout",
    topic: "asyncio",
    difficulty: 2,
    mode: "async",
    blurb: "Bound a coroutine with asyncio.wait_for and handle the timeout.",
    prompt: `# Run with a Timeout

Write an async function \`with_timeout(coro, limit)\`. Run the awaitable \`coro\` with a deadline of \`limit\` seconds using \`asyncio.wait_for\`. Return its result if it finishes in time; if it overruns, catch \`asyncio.TimeoutError\` and return the string \`"timeout"\`.`,
    starterCode: `import asyncio


async def with_timeout(coro, limit):
    pass
`,
    tests: `import asyncio
from solution import with_timeout


class DrillTests:
    async def test_completes_in_time(self):
        async def quick():
            await asyncio.sleep(0)
            return 42
        assert await with_timeout(quick(), 1) == 42

    async def test_times_out(self):
        async def slow():
            await asyncio.sleep(1)
            return 42
        assert await with_timeout(slow(), 0.02) == "timeout"

    async def test_result_can_be_any_value(self):
        async def quick():
            await asyncio.sleep(0)
            return [1, 2, 3]
        assert await with_timeout(quick(), 1) == [1, 2, 3]
`,
    solution: `import asyncio


async def with_timeout(coro, limit):
    try:
        return await asyncio.wait_for(coro, limit)
    except asyncio.TimeoutError:
        return "timeout"
`,
  },
  {
    id: "bounded-gather",
    title: "Bounded Concurrency",
    topic: "asyncio",
    difficulty: 3,
    mode: "async",
    blurb: "Run work concurrently but cap how much runs at once with a Semaphore.",
    prompt: `# Bounded Concurrency

Write an async function \`bounded_gather(values, limit)\`. Square every value **concurrently**, but never let more than \`limit\` of them run at once — guard the work with an \`asyncio.Semaphore(limit)\`.

Return a tuple \`(results, peak)\`:
- \`results\` — the squares, **in input order**.
- \`peak\` — the largest number that ran simultaneously (it must never exceed \`limit\`).`,
    starterCode: `import asyncio


async def bounded_gather(values, limit):
    pass
`,
    tests: `import asyncio
from solution import bounded_gather


class DrillTests:
    async def test_results_in_order(self):
        results, peak = await bounded_gather([1, 2, 3, 4], 2)
        assert results == [1, 4, 9, 16], results

    async def test_respects_the_limit(self):
        results, peak = await bounded_gather([1, 2, 3, 4, 5, 6], 2)
        assert peak <= 2, peak

    async def test_empty(self):
        results, peak = await bounded_gather([], 3)
        assert results == []
`,
    solution: `import asyncio


async def bounded_gather(values, limit):
    sem = asyncio.Semaphore(limit)
    results = [None] * len(values)
    active = 0
    peak = 0

    async def one(index, value):
        nonlocal active, peak
        async with sem:
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0)
            results[index] = value * value
            active -= 1

    await asyncio.gather(*[one(i, v) for i, v in enumerate(values)])
    return results, peak
`,
  },
  {
    id: "safe-stack",
    title: "Thread-Safe Stack",
    topic: "threading",
    difficulty: 2,
    mode: "sync",
    blurb: "A LIFO stack whose every operation is guarded by a threading.Lock.",
    prompt: `# Thread-Safe Stack

Build a \`SafeStack\` class — a last-in-first-out stack whose every operation runs inside a \`threading.Lock\`'s critical section, the discipline that keeps shared state correct under real threads.

- \`__init__()\` — start empty, create a \`threading.Lock\`.
- \`push(item)\` — add an item, inside \`with self._lock:\`.
- \`pop()\` — remove and return the most-recently-pushed item; return \`None\` if the stack is empty.
- \`size()\` — return how many items are on the stack.

> The sandbox runs single-threaded so the tests are deterministic — but \`with self._lock:\` on every method is exactly what real threads need.`,
    starterCode: `import threading


class SafeStack:
    def __init__(self):
        pass

    def push(self, item):
        pass

    def pop(self):
        pass

    def size(self):
        pass
`,
    tests: `import unittest
from solution import SafeStack


class DrillTests(unittest.TestCase):
    def test_starts_empty(self):
        self.assertEqual(SafeStack().size(), 0)

    def test_push_and_size(self):
        s = SafeStack()
        s.push(1)
        s.push(2)
        s.push(3)
        self.assertEqual(s.size(), 3)

    def test_pop_is_lifo(self):
        s = SafeStack()
        s.push("a")
        s.push("b")
        self.assertEqual(s.pop(), "b")
        self.assertEqual(s.pop(), "a")

    def test_pop_empty_is_none(self):
        self.assertIsNone(SafeStack().pop())
`,
    solution: `import threading


class SafeStack:
    def __init__(self):
        self._items = []
        self._lock = threading.Lock()

    def push(self, item):
        with self._lock:
            self._items.append(item)

    def pop(self):
        with self._lock:
            return self._items.pop() if self._items else None

    def size(self):
        with self._lock:
            return len(self._items)
`,
  },

  /* ====================================================================
   * Class Idioms — seven drills targeting Python idioms that are
   * load-bearing in the mock exams but appear in ZERO existing drills
   * (verified via grep of content/drills.js on 2026-05-20):
   *   1. dict.setdefault(k, {})[k2] = v  — the dict-of-dicts canonical
   *   2. str.startswith / str.endswith   — universal L2 filtering
   *   3. for ... in list(d.items())      — safe deletion during iteration
   *   4. private helper methods          — _exists, _log, _record
   *   5. str.join with generator + concat — canonical L2 format output
   *   6. class-level constants            — CASHBACK_RATE = 2
   *   7. hasattr(self, "_x") lazy init    — backup/snapshots pattern
   * Together these fill the largest unverified-gap class identified by
   * the curriculum-gap-audit at docs/research/curriculum-gap-audit/.
   * ==================================================================== */

  {
    id: "setdefault-grades",
    title: "Grades — dict-of-dicts with setdefault",
    topic: "Class Idioms",
    difficulty: 2,
    mode: "sync",
    blurb: "Build a class that uses setdefault(k, {})[k2] = v — the chained-mutation pattern at the heart of mock-imdb-4.",
    prompt: `# Grades — dict-of-dicts with setdefault

The single most-used dict idiom in the In-Memory DB mock is \`self._db.setdefault(key, {})[field] = value\` — create the inner dict if needed, then assign. Burn it in.

Build a class \`Grades\`:

- \`record(student, subject, score)\` — store \`score\` for \`student\`'s \`subject\`. Creates the student's record if it doesn't exist. Overwrites an existing score.
- \`score(student, subject)\` — return the stored score, or \`None\` if student or subject is unknown.
- \`subjects(student)\` — return a **sorted list** of all the subjects this student has scores in. Return \`[]\` if the student is unknown.

**The idiom to internalize.** \`self._g.setdefault(student, {})[subject] = score\` is one line that does two things: get-or-create the inner dict for the student, then write to it. Without \`setdefault\` you'd need an \`if student not in self._g\` check first.

**▣ Visual — the filing cabinet.** Outer dict is a **filing cabinet**; each key is a **drawer label**. The inner dict is the **folder inside that drawer**. \`setdefault(student, {})\` is one smooth motion: "open the drawer if it exists, otherwise install a new empty drawer first." Then \`[subject] = score\` files the paper. Three steps fused into one stroke.`,
    starterCode: `class Grades:
    def __init__(self):
        pass

    def record(self, student, subject, score):
        pass

    def score(self, student, subject):
        pass

    def subjects(self, student):
        pass
`,
    tests: `import unittest
from solution import Grades


class DrillTests(unittest.TestCase):
    def test_record_then_score(self):
        g = Grades()
        g.record("a", "math", 90)
        self.assertEqual(g.score("a", "math"), 90)

    def test_setdefault_creates_inner_dict(self):
        g = Grades()
        g.record("a", "math", 90)
        g.record("a", "lit", 85)
        self.assertEqual(g.score("a", "lit"), 85)

    def test_score_missing_student_none(self):
        self.assertIsNone(Grades().score("ghost", "math"))

    def test_score_missing_subject_none(self):
        g = Grades()
        g.record("a", "math", 90)
        self.assertIsNone(g.score("a", "lit"))

    def test_subjects_sorted_lex(self):
        g = Grades()
        g.record("a", "math", 90)
        g.record("a", "art", 70)
        g.record("a", "lit", 85)
        self.assertEqual(g.subjects("a"), ["art", "lit", "math"])

    def test_subjects_missing_returns_empty(self):
        self.assertEqual(Grades().subjects("ghost"), [])
`,
    solution: `class Grades:
    def __init__(self):
        self._g = {}  # student -> { subject: score }

    def record(self, student, subject, score):
        self._g.setdefault(student, {})[subject] = score

    def score(self, student, subject):
        rec = self._g.get(student)
        return None if rec is None else rec.get(subject)

    def subjects(self, student):
        rec = self._g.get(student)
        if not rec:
            return []
        return sorted(rec)
`,
  },

  {
    id: "prefix-suffix-filter",
    title: "Prefix + Suffix Filter",
    topic: "Class Idioms",
    difficulty: 1,
    mode: "sync",
    blurb: "Filter a list of names by optional prefix and/or suffix — drills str.startswith AND str.endswith, both missing from every other drill.",
    prompt: `# Prefix + Suffix Filter

Every mock-exam L2 needs prefix filtering, and one of them (mock-cloud-4) needs suffix filtering too. Neither is rehearsed anywhere else.

Write \`filter_names(names, prefix=None, suffix=None)\`:

- \`names\` is a list of strings.
- \`prefix\` is either \`None\` (no prefix constraint) or a string the name must **start with**.
- \`suffix\` is either \`None\` (no suffix constraint) or a string the name must **end with**.
- Both can be set at once — a name must satisfy both.
- Return the matching names **sorted ascending**.

**Examples**

\`\`\`
filter_names(["alpha.txt", "beta.md", "art.txt"], prefix="a")
  -> ["alpha.txt", "art.txt"]

filter_names(["a.txt", "b.md"], suffix=".txt")
  -> ["a.txt"]

filter_names(["alpha.txt", "art.md"], prefix="a", suffix=".txt")
  -> ["alpha.txt"]
\`\`\`

**▣ Visual — the two highlighters.** Imagine running TWO highlighters across the list: a yellow one for names starting with the prefix, a blue one for names ending with the suffix. A name kept in the final list is one highlighted by **every** highlighter you turned on. If you turned on no highlighters (both \`None\`), every name passes through.`,
    starterCode: `def filter_names(names, prefix=None, suffix=None):
    pass
`,
    tests: `import unittest
from solution import filter_names


class DrillTests(unittest.TestCase):
    def test_prefix_only(self):
        self.assertEqual(filter_names(["a.txt", "b.txt", "art.md"], prefix="a"),
                         ["a.txt", "art.md"])

    def test_suffix_only(self):
        self.assertEqual(filter_names(["a.txt", "b.md", "c.txt"], suffix=".txt"),
                         ["a.txt", "c.txt"])

    def test_both(self):
        self.assertEqual(filter_names(["alpha.txt", "art.md", "beta.txt"], prefix="a", suffix=".txt"),
                         ["alpha.txt"])

    def test_neither_returns_all_sorted(self):
        self.assertEqual(filter_names(["c", "a", "b"]), ["a", "b", "c"])

    def test_no_matches(self):
        self.assertEqual(filter_names(["a", "b"], prefix="z"), [])
`,
    solution: `def filter_names(names, prefix=None, suffix=None):
    out = []
    for name in names:
        if prefix is not None and not name.startswith(prefix):
            continue
        if suffix is not None and not name.endswith(suffix):
            continue
        out.append(name)
    return sorted(out)
`,
  },

  {
    id: "process-due-queue",
    title: "Process-Due Queue (safe iteration + deletion)",
    topic: "Class Idioms",
    difficulty: 3,
    mode: "sync",
    blurb: "Drain a pending dict by iterating over list(d.items()) so you can safely delete during the loop — the exact pattern Banking L3 cashback needs.",
    prompt: `# Process-Due Queue (safe iteration + deletion)

The Banking cashback mechanism iterates a \`_pending\` dict and **deletes entries while iterating** — which crashes Python unless you wrap it in \`list(self._pending.items())\`. Drill the pattern in isolation.

Build a class \`PendingQueue\`:

- \`schedule(item_id, due, payload)\` — store the item under \`item_id\`, with its due time and payload.
- \`process(now)\` — for every pending item whose \`due <= now\`: deliver it (append \`payload\` to a delivered list) and **remove** it from pending. Critically, you must use \`for item_id, info in list(self._pending.items()):\` — the \`list(...)\` wrap is non-negotiable; without it you'll get \`RuntimeError: dictionary changed size during iteration\` on the second item.
- \`delivered()\` — return the list of delivered payloads (in delivery order).
- \`pending_count()\` — return the count of items still pending.

**The trap.** A naive \`for k, v in self._pending.items():\` works for the **first** iteration but blows up on the second. The fix is one extra word: \`list(...)\`. That word is the difference between a working L3 and a broken one.

**▣ Visual — the baker pulling loaves.** You walk the oven racks checking each loaf. You want to pull out the done ones. If you try to remove loaves while still walking the in-place rack, the rack tips. So FIRST you photocopy the rack inventory onto a clipboard (\`list(self._pending.items())\`), THEN you walk down the clipboard pulling done loaves out of the actual rack. The clipboard is your safe iteration snapshot; the actual rack is what you mutate.`,
    starterCode: `class PendingQueue:
    def __init__(self):
        pass

    def schedule(self, item_id, due, payload):
        pass

    def process(self, now):
        pass

    def delivered(self):
        pass

    def pending_count(self):
        pass
`,
    tests: `import unittest
from solution import PendingQueue


class DrillTests(unittest.TestCase):
    def test_schedule_then_process(self):
        q = PendingQueue()
        q.schedule("a", 10, "hello")
        q.process(15)
        self.assertEqual(q.delivered(), ["hello"])
        self.assertEqual(q.pending_count(), 0)

    def test_only_due_processes(self):
        q = PendingQueue()
        q.schedule("a", 10, "early")
        q.schedule("b", 20, "late")
        q.process(15)
        self.assertEqual(q.delivered(), ["early"])
        self.assertEqual(q.pending_count(), 1)

    def test_process_with_no_due(self):
        q = PendingQueue()
        q.schedule("a", 100, "x")
        q.process(50)
        self.assertEqual(q.delivered(), [])

    def test_process_handles_many_items_safely(self):
        q = PendingQueue()
        for i in range(5):
            q.schedule("p" + str(i), i, "item" + str(i))
        q.process(99)
        self.assertEqual(len(q.delivered()), 5)
        self.assertEqual(q.pending_count(), 0)

    def test_due_boundary_inclusive(self):
        q = PendingQueue()
        q.schedule("a", 10, "x")
        q.process(10)
        self.assertEqual(q.delivered(), ["x"])
`,
    solution: `class PendingQueue:
    def __init__(self):
        self._pending = {}
        self._delivered = []

    def schedule(self, item_id, due, payload):
        self._pending[item_id] = {"due": due, "payload": payload}

    def process(self, now):
        for item_id, info in list(self._pending.items()):
            if info["due"] <= now:
                self._delivered.append(info["payload"])
                del self._pending[item_id]

    def delivered(self):
        return list(self._delivered)

    def pending_count(self):
        return len(self._pending)
`,
  },

  {
    id: "class-helpers",
    title: "Class with Private Helpers",
    topic: "Class Idioms",
    difficulty: 2,
    mode: "sync",
    blurb: "Build a class with three _-prefixed helper methods composed by the public API — the exact pattern every mock uses for _exists / _log / _record.",
    prompt: `# Class with Private Helpers

Every mock-exam class decomposes into 2-4 short private helpers (\`_exists\`, \`_log\`, \`_record\`) and 3-5 public methods that compose them. Build that pattern in miniature.

Build a class \`Inventory\`. Use these **three private helpers** internally:

- \`_exists(item)\` — return whether \`item\` is in the inventory.
- \`_record(item)\` — return the item's record (or \`None\` if absent).
- \`_log(item, event)\` — append \`event\` (a string) to the item's log.

And these **four public methods** that compose them:

- \`add(item)\` — return \`True\` and create a record with \`qty: 0\` and an empty log; \`False\` if already present.
- \`restock(item, qty)\` — increase the qty by \`qty\`, log the string \`"restock:" + str(qty)\`, return the new quantity. Return \`None\` if item is unknown.
- \`quantity(item)\` — return the current quantity or \`None\` if unknown.
- \`history(item)\` — return a **copy** of the log list (so the caller can't mutate it), or \`None\` if unknown.

**Why this matters.** Without private helpers, every public method ends up with its own membership check and its own log-append. Helpers let you write one canonical check used everywhere. This is the structural pattern of every L1/L2 in the mocks.

**▣ Visual — the restaurant kitchen.** Public methods are **the menu** the customer reads — \`add\`, \`restock\`, \`quantity\`. Private helpers are **prep cooks** in the back: \`_exists\` checks the pantry, \`_record\` plates the dish, \`_log\` notes the order. The customer never speaks to a prep cook directly; the cooks never speak to the customer. Every menu item is composed by the prep cooks downstream. Build the kitchen this way and you stop repeating the same five lines in every public method.`,
    starterCode: `class Inventory:
    def __init__(self):
        pass

    def _exists(self, item):
        pass

    def _record(self, item):
        pass

    def _log(self, item, event):
        pass

    def add(self, item):
        pass

    def restock(self, item, qty):
        pass

    def quantity(self, item):
        pass

    def history(self, item):
        pass
`,
    tests: `import unittest
from solution import Inventory


class DrillTests(unittest.TestCase):
    def test_add_unique(self):
        self.assertTrue(Inventory().add("apple"))

    def test_add_duplicate_false(self):
        i = Inventory()
        i.add("apple")
        self.assertFalse(i.add("apple"))

    def test_restock_returns_new_qty(self):
        i = Inventory()
        i.add("apple")
        self.assertEqual(i.restock("apple", 5), 5)
        self.assertEqual(i.restock("apple", 3), 8)

    def test_restock_unknown_is_none(self):
        self.assertIsNone(Inventory().restock("ghost", 5))

    def test_quantity_unknown_is_none(self):
        self.assertIsNone(Inventory().quantity("ghost"))

    def test_history_logs_each_restock(self):
        i = Inventory()
        i.add("apple")
        i.restock("apple", 5)
        i.restock("apple", 3)
        self.assertEqual(i.history("apple"), ["restock:5", "restock:3"])

    def test_history_returns_independent_copy(self):
        i = Inventory()
        i.add("apple")
        i.restock("apple", 5)
        h = i.history("apple")
        h.append("MUTATED")
        # Internal log not affected by external mutation:
        self.assertEqual(i.history("apple"), ["restock:5"])

    def test_history_unknown_is_none(self):
        self.assertIsNone(Inventory().history("ghost"))
`,
    solution: `class Inventory:
    def __init__(self):
        self._stock = {}  # item -> { "qty": int, "log": [str] }

    def _exists(self, item):
        return item in self._stock

    def _record(self, item):
        return self._stock.get(item)

    def _log(self, item, event):
        self._stock[item]["log"].append(event)

    def add(self, item):
        if self._exists(item):
            return False
        self._stock[item] = {"qty": 0, "log": []}
        return True

    def restock(self, item, qty):
        if not self._exists(item):
            return None
        rec = self._record(item)
        rec["qty"] += qty
        self._log(item, "restock:" + str(qty))
        return rec["qty"]

    def quantity(self, item):
        rec = self._record(item)
        return None if rec is None else rec["qty"]

    def history(self, item):
        rec = self._record(item)
        return None if rec is None else list(rec["log"])
`,
  },

  {
    id: "format-records-join",
    title: "Format Records — generator in str.join",
    topic: "Class Idioms",
    difficulty: 2,
    mode: "sync",
    blurb: "Build a function that uses a generator expression inside str.join with + concatenation — the exact L2 output shape mock-imdb-4 returns.",
    prompt: `# Format Records — generator in str.join

The In-Memory DB L2 returns its scan output as a SINGLE STRING formatted as \`"field(value), field(value), ..."\` lex-sorted. The canonical idiom is \`", ".join(name + "(" + str(value) + ")" for name, value in sorted(records))\` — a **generator expression** inside \`str.join\` with \`+\` concatenation. Drill it.

Write \`format_records(records)\`:

- \`records\` is a list of \`(name, value)\` tuples. \`value\` can be a string or int.
- Return a **single string** of the form \`"name(value), name(value), ..."\` sorted by name ascending.
- Return \`""\` if \`records\` is empty.

**The idiom to internalize.** The whole thing is one line:

\`\`\`python
return ", ".join(name + "(" + str(value) + ")" for name, value in sorted(records))
\`\`\`

Tuple unpacking inside the generator. \`+\` concatenation (not f-strings — none of the mocks use f-strings). \`str(value)\` because \`value\` may be an int.

**Examples**

\`\`\`
format_records([("age", 30), ("name", "Alice")])  -> "age(30), name(Alice)"
format_records([])                                -> ""
\`\`\`

**▣ Visual — the label printer.** Each \`(name, value)\` is a label to print: \`name(value)\`. The generator expression streams the labels out one at a time. \`", ".join(...)\` is the glue that fuses every label into one strip with \`", "\` between each. Don't build the whole list first — print each label on demand into the join's mouth.`,
    starterCode: `def format_records(records):
    pass
`,
    tests: `import unittest
from solution import format_records


class DrillTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(format_records([]), "")

    def test_single(self):
        self.assertEqual(format_records([("x", 1)]), "x(1)")

    def test_sorted_lex(self):
        self.assertEqual(format_records([("z", 1), ("a", 2)]), "a(2), z(1)")

    def test_multiple(self):
        self.assertEqual(format_records([("name", "Alice"), ("age", 30)]),
                         "age(30), name(Alice)")

    def test_int_value_converted(self):
        self.assertEqual(format_records([("count", 42)]), "count(42)")
`,
    solution: `def format_records(records):
    if not records:
        return ""
    return ", ".join(name + "(" + str(value) + ")" for name, value in sorted(records))
`,
  },

  {
    id: "class-constants",
    title: "Class Constants & self.CONSTANT access",
    topic: "Class Idioms",
    difficulty: 2,
    mode: "sync",
    blurb: "Build a class with module-level constants accessed via self.CONST — the pattern Banking L3 uses for CASHBACK_RATE and CASHBACK_DELAY.",
    prompt: `# Class Constants & self.CONSTANT access

Banking L3 declares two constants at the class level:

\`\`\`python
class BankingSystem:
    CASHBACK_DELAY = 86_400_000  # 24 hours in ms
    CASHBACK_RATE = 2            # percent
\`\`\`

These are accessed inside methods via \`self.CASHBACK_RATE\` — not by re-typing the number, not by passing them in. Rehearse the pattern.

Build a class \`Coupon\`. Declare two class-level constants:

- \`DISCOUNT_RATE = 10\` (percent)
- \`MIN_PURCHASE = 50\`

Then implement:

- \`__init__()\` — initialize an empty set of used coupon codes.
- \`apply(code, amount)\` — return the discounted amount, computed as \`amount - (amount * self.DISCOUNT_RATE) // 100\`. Return \`None\` if \`amount < self.MIN_PURCHASE\`, or if \`code\` has already been used. On success, mark the code as used.

**The math to nail.** Integer division \`//\` happens AFTER the multiplication: \`(amount * self.DISCOUNT_RATE) // 100\`. Order matters — \`amount * (self.DISCOUNT_RATE // 100)\` is always 0 because 10 // 100 == 0.

**Why this drills the right thing.** A normal candidate would either pass the rate into \`__init__\` (wrong) or hardcode 10 inside \`apply\` (works but loses the class-constant pattern). The exam reference solution always uses class-level constants accessed via \`self.\` — write it the same way.

**▣ Visual — the company letterhead.** \`CASHBACK_RATE = 2\` and \`MIN_PURCHASE = 50\` are values **etched onto the letterhead** at the top of the class. Every method, every instance, reads the same letterhead via \`self.CONSTANT\`. No employee carries their own private copy — when the company changes the rate, the letterhead is updated in one place and every reader sees the new value. Contrast with \`__init__\` self-assignments, which are like an employee's private notebook — copied per instance, easy to fall out of sync.`,
    starterCode: `class Coupon:
    # Declare class-level constants here

    def __init__(self):
        pass

    def apply(self, code, amount):
        pass
`,
    tests: `import unittest
from solution import Coupon


class DrillTests(unittest.TestCase):
    def test_basic_application(self):
        c = Coupon()
        # 100 - (100 * 10 // 100) = 100 - 10 = 90
        self.assertEqual(c.apply("WELCOME", 100), 90)

    def test_below_min_purchase_none(self):
        self.assertIsNone(Coupon().apply("X", 10))

    def test_reused_code_none(self):
        c = Coupon()
        c.apply("X", 100)
        self.assertIsNone(c.apply("X", 200))

    def test_integer_truncation(self):
        # 105 * 10 // 100 = 10 (truncated, NOT 10.5)
        # discounted = 105 - 10 = 95
        self.assertEqual(Coupon().apply("X", 105), 95)

    def test_class_constants_accessible(self):
        c = Coupon()
        self.assertEqual(c.DISCOUNT_RATE, 10)
        self.assertEqual(c.MIN_PURCHASE, 50)
`,
    solution: `class Coupon:
    DISCOUNT_RATE = 10  # percent
    MIN_PURCHASE = 50

    def __init__(self):
        self._used = set()

    def apply(self, code, amount):
        if amount < self.MIN_PURCHASE:
            return None
        if code in self._used:
            return None
        self._used.add(code)
        discount = (amount * self.DISCOUNT_RATE) // 100
        return amount - discount
`,
  },

  {
    id: "hasattr-lazy-init",
    title: "hasattr Lazy Initialization",
    topic: "Class Idioms",
    difficulty: 2,
    mode: "sync",
    blurb: "Initialize an attribute lazily on first use via hasattr(self, '_x') — the exact trick mock-imdb-4 L4 uses for the backup list.",
    prompt: `# hasattr Lazy Initialization

\`mock-imdb-4\` L4 uses this exact line to initialize the backups list on first \`backup()\` call:

\`\`\`python
if not hasattr(self, "_backups"):
    self._backups = []
\`\`\`

Why? Because the constructor was written for L1 and didn't know L4 would need backups. Adding the field to \`__init__\` mid-exam would risk breaking L1/L2 tests. Lazy init via \`hasattr\` lets L4 add new state without touching L1.

Build a class \`Snapshots\`. **Do NOT initialize \`_snaps\` in \`__init__\`** — initialize it lazily inside \`take()\` via \`hasattr\`.

- \`__init__()\` — do nothing.
- \`take(state)\` — lazily init \`self._snaps = []\` if it doesn't exist yet, then append a **copy** of \`state\` (call \`dict(state)\`) to it. Return the count of snapshots taken so far.
- \`count()\` — return the number of snapshots, or \`0\` if no snapshot was ever taken.
- \`at(index)\` — return a copy of the snapshot at \`index\` (so the caller can't mutate the stored snapshot), or \`None\` if no snapshots exist or \`index\` is out of range.

**Why a copy of the state.** Without \`dict(state)\` the caller mutating their original dict would mutate the stored snapshot. Snapshots must be independent — same lesson as L4 backup/restore.

**▣ Visual — the camping trip.** You packed light. The constructor didn't include a sleeping bag. Night falls (first \`take()\` call). You check the tent: "is the bag in here?" — \`hasattr(self, "_snaps")\`. If not, you unroll one then. Every subsequent night, the same bag is already in the tent. Cost: one \`hasattr\` check per call. Reward: \`__init__\` doesn't need to anticipate every future L4 capability.`,
    starterCode: `class Snapshots:
    def __init__(self):
        # DO NOT init _snaps here — use hasattr lazy init in take().
        pass

    def take(self, state):
        pass

    def count(self):
        pass

    def at(self, index):
        pass
`,
    tests: `import unittest
from solution import Snapshots


class DrillTests(unittest.TestCase):
    def test_count_before_any_take_is_zero(self):
        self.assertEqual(Snapshots().count(), 0)

    def test_at_before_any_take_is_none(self):
        self.assertIsNone(Snapshots().at(0))

    def test_take_returns_running_count(self):
        s = Snapshots()
        self.assertEqual(s.take({"x": 1}), 1)
        self.assertEqual(s.take({"x": 2}), 2)

    def test_at_returns_independent_copy(self):
        s = Snapshots()
        original = {"x": 1}
        s.take(original)
        original["x"] = 99
        # Stored snapshot must NOT reflect the caller's later mutation.
        self.assertEqual(s.at(0)["x"], 1)

    def test_at_out_of_range_is_none(self):
        s = Snapshots()
        s.take({"x": 1})
        self.assertIsNone(s.at(99))
`,
    solution: `class Snapshots:
    def __init__(self):
        # DO NOT init _snaps here — the exam pattern is to add it lazily.
        pass

    def take(self, state):
        if not hasattr(self, "_snaps"):
            self._snaps = []
        self._snaps.append(dict(state))
        return len(self._snaps)

    def count(self):
        if not hasattr(self, "_snaps"):
            return 0
        return len(self._snaps)

    def at(self, index):
        if not hasattr(self, "_snaps"):
            return None
        if index < 0 or index >= len(self._snaps):
            return None
        return dict(self._snaps[index])
`,
  },

  /* ====================================================================
   * L1 Rehearsals — three tiny full-class drills that exercise the EXACT
   * L1 contract of the three canonical archetypes (key-value store,
   * banking accounts, file store). The disconnect they close: m1 teaches
   * function-writing in the abstract; m3 teaches dict idioms in the
   * abstract; the L1 mock asks for a TINY CLASS that combines both.
   * These drills are that bridge. Each takes ~5 minutes.
   * ==================================================================== */

  {
    id: "l1-rehearsal-kv",
    title: "L1 Rehearsal — Mini Key-Value Store",
    topic: "L1 Rehearsal",
    difficulty: 1,
    mode: "sync",
    blurb: "Direct rehearsal of mock-imdb-4's L1: a tiny class with get returning None on missing, delete returning True/False.",
    prompt: `# L1 Rehearsal — Mini Key-Value Store

This drill mirrors the **exact L1 contract** of \`mock-imdb-4\`. If you can write it without looking, you can write mock L1 cold.

Build a class \`KV\`:

- \`set(key, value)\` — store \`value\` at \`key\`, overwriting any existing value. (No return needed.)
- \`get(key)\` — return the stored value, or **\`None\`** if the key has never been set or was deleted.
- \`delete(key)\` — if the key exists, remove it and return **\`True\`**. If it doesn't exist, return **\`False\`**.

**Why this drill exists.** The "return \`None\` on missing key, return \`False\` on missing delete" pattern is the L1 contract of every mock exam. It is **not** drilled anywhere in m1 (functions) or m3 (dictionaries) in isolation — those modules teach the pieces. This is the assembly.

**Hint.** \`self._items = {}\` in \`__init__\`. \`dict.get(key)\` already returns \`None\` on missing — use it directly. For \`delete\`, check \`if key in self._items\` first.

**▣ Visual — the coat check.** \`set(key, value)\` = "hand me your coat, I'll tag it with this number." \`get(key)\` = "give me whatever's tagged with this number" — if no such tag, empty hand (None). \`delete(key)\` = "claim that coat and remove it" — \`True\` if the tag was on a hanger, \`False\` if no such tag was ever issued. The dict is the hat-check counter; every key is a ticket; every value is a coat.`,
    starterCode: `class KV:
    def __init__(self):
        pass

    def set(self, key, value):
        pass

    def get(self, key):
        pass

    def delete(self, key):
        pass
`,
    tests: `import unittest
from solution import KV


class DrillTests(unittest.TestCase):
    def test_get_missing_returns_none(self):
        self.assertIsNone(KV().get("nope"))

    def test_set_then_get(self):
        s = KV()
        s.set("name", "Alice")
        self.assertEqual(s.get("name"), "Alice")

    def test_set_overwrites(self):
        s = KV()
        s.set("a", "1")
        s.set("a", "2")
        self.assertEqual(s.get("a"), "2")

    def test_delete_present_returns_true(self):
        s = KV()
        s.set("a", "1")
        self.assertTrue(s.delete("a"))
        self.assertIsNone(s.get("a"))

    def test_delete_absent_returns_false(self):
        self.assertFalse(KV().delete("ghost"))

    def test_delete_twice_returns_false_second_time(self):
        s = KV()
        s.set("a", "1")
        self.assertTrue(s.delete("a"))
        self.assertFalse(s.delete("a"))

    def test_keys_are_independent(self):
        s = KV()
        s.set("a", "1")
        s.set("b", "2")
        s.delete("a")
        self.assertEqual(s.get("b"), "2")
`,
    solution: `class KV:
    def __init__(self):
        self._items = {}

    def set(self, key, value):
        self._items[key] = value

    def get(self, key):
        return self._items.get(key)

    def delete(self, key):
        if key in self._items:
            del self._items[key]
            return True
        return False
`,
  },

  {
    id: "l1-rehearsal-bank",
    title: "L1 Rehearsal — Mini Account Store",
    topic: "L1 Rehearsal",
    difficulty: 2,
    mode: "sync",
    blurb: "Direct rehearsal of mock-bank-4's L1: account creation returning bool, deposit/withdraw returning new balance or None on missing/insufficient.",
    prompt: `# L1 Rehearsal — Mini Account Store

This drill mirrors the **exact L1 contract** of \`mock-bank-4\`. Three of the most-used L1 return-shape patterns are all here: bool-on-creation, new-balance-or-None, and the "no-mutation on insufficient funds" invariant.

Build a class \`Bank\`:

- \`create_account(account_id)\` — return \`True\`. If an account with that id already exists, return \`False\` and change nothing.
- \`deposit(account_id, amount)\` — add \`amount\` to the balance and return the **new balance**. If no such account exists, return \`None\`.
- \`withdraw(account_id, amount)\` — subtract \`amount\` from the balance and return the **new balance**. Return \`None\` if no such account, **or** if the account lacks the funds (in which case no balance change happens).
- \`balance(account_id)\` — return the current balance, or \`None\` if no such account.

New accounts start at balance 0.

**Why this drill exists.** Every L1 of the Banking assessment hits these exact return shapes. The trap is the "no mutation on insufficient" rule — easy to break by writing \`self._balances[id] -= amount\` before the check.

**Hint.** Store balances as \`self._balances = {}\`. Check existence with \`if id not in self._balances\`. Check funds with \`if self._balances[id] < amount\`.

**▣ Visual — the bank teller behind a counter.** \`create_account\` is **opening a new ledger page** — \`False\` if a page already exists for this name. \`deposit\` / \`withdraw\` are **moving chips in or out of the cash drawer**. The "insufficient funds" rule is critical: the teller LOOKS at the drawer first, and if there aren't enough chips, they hand the request slip back **unfilled** — the drawer is **untouched**. Writing code that subtracts before checking is like the teller pulling chips out of the drawer and then realizing there weren't enough — that's the bug the test is checking for.`,
    starterCode: `class Bank:
    def __init__(self):
        pass

    def create_account(self, account_id):
        pass

    def deposit(self, account_id, amount):
        pass

    def withdraw(self, account_id, amount):
        pass

    def balance(self, account_id):
        pass
`,
    tests: `import unittest
from solution import Bank


class DrillTests(unittest.TestCase):
    def test_create_unique_returns_true(self):
        b = Bank()
        self.assertTrue(b.create_account("a"))

    def test_create_duplicate_returns_false(self):
        b = Bank()
        b.create_account("a")
        self.assertFalse(b.create_account("a"))

    def test_new_account_starts_at_zero(self):
        b = Bank()
        b.create_account("a")
        self.assertEqual(b.balance("a"), 0)

    def test_balance_unknown_account_is_none(self):
        self.assertIsNone(Bank().balance("ghost"))

    def test_deposit_returns_new_balance(self):
        b = Bank()
        b.create_account("a")
        self.assertEqual(b.deposit("a", 100), 100)
        self.assertEqual(b.deposit("a", 50), 150)

    def test_deposit_unknown_account_is_none(self):
        self.assertIsNone(Bank().deposit("ghost", 100))

    def test_withdraw_returns_new_balance(self):
        b = Bank()
        b.create_account("a")
        b.deposit("a", 100)
        self.assertEqual(b.withdraw("a", 40), 60)

    def test_withdraw_unknown_account_is_none(self):
        self.assertIsNone(Bank().withdraw("ghost", 10))

    def test_withdraw_insufficient_is_none(self):
        b = Bank()
        b.create_account("a")
        b.deposit("a", 50)
        self.assertIsNone(b.withdraw("a", 100))

    def test_withdraw_insufficient_does_not_mutate_balance(self):
        b = Bank()
        b.create_account("a")
        b.deposit("a", 50)
        b.withdraw("a", 100)
        self.assertEqual(b.balance("a"), 50)
`,
    solution: `class Bank:
    def __init__(self):
        self._balances = {}

    def create_account(self, account_id):
        if account_id in self._balances:
            return False
        self._balances[account_id] = 0
        return True

    def deposit(self, account_id, amount):
        if account_id not in self._balances:
            return None
        self._balances[account_id] += amount
        return self._balances[account_id]

    def withdraw(self, account_id, amount):
        if account_id not in self._balances:
            return None
        if self._balances[account_id] < amount:
            return None
        self._balances[account_id] -= amount
        return self._balances[account_id]

    def balance(self, account_id):
        return self._balances.get(account_id)
`,
  },

  {
    id: "l1-rehearsal-files",
    title: "L1 Rehearsal — Mini File Store",
    topic: "L1 Rehearsal",
    difficulty: 1,
    mode: "sync",
    blurb: "Direct rehearsal of mock-files-4 and mock-cloud-4 L1: add/get/copy on a flat file dict with bool / None sentinels.",
    prompt: `# L1 Rehearsal — Mini File Store

This drill mirrors the **exact L1 contract** of both \`mock-files-4\` and \`mock-cloud-4\`. The copy-with-conflict-check is the part candidates most often miss.

Build a class \`Files\`:

- \`add(name, size)\` — return \`True\`. If a file with that name already exists, return \`False\` and change nothing.
- \`get_size(name)\` — return the file's size, or \`None\` if no such file.
- \`copy(src, dst)\` — copy \`src\` to a new file named \`dst\`. Return \`False\` if \`src\` doesn't exist **or** if \`dst\` is already taken (in either case no change happens). Otherwise return \`True\`.
- \`delete(name)\` — return the size that was freed, or \`None\` if no such file.

**Why this drill exists.** Two of the new mock-exam projects use this exact contract for L1. The two failure modes on copy (missing source vs. taken destination) both return \`False\`, but a sloppy implementation often mutates state before checking the second condition.

**Hint.** \`self._files = {}\` mapping name → size. Always check **both** copy preconditions before any mutation.

**▣ Visual — the server rack in a data center.** \`add(name, size)\` = **bolt a new server into a rack slot**, fail if that slot is already taken. \`get_size(name)\` = **read the spec sheet** taped to the server, return None if no server in that slot. \`copy(src, dst)\` = **mount a clone**: you must check both that the source exists AND the destination slot is empty BEFORE you start moving cables. If either check fails, no cables move. \`delete(name)\` = **unbolt the server and free the slot's capacity** — return the freed bytes.`,
    starterCode: `class Files:
    def __init__(self):
        pass

    def add(self, name, size):
        pass

    def get_size(self, name):
        pass

    def copy(self, src, dst):
        pass

    def delete(self, name):
        pass
`,
    tests: `import unittest
from solution import Files


class DrillTests(unittest.TestCase):
    def test_add_unique_returns_true(self):
        f = Files()
        self.assertTrue(f.add("a.txt", 100))

    def test_add_duplicate_returns_false(self):
        f = Files()
        f.add("a.txt", 100)
        self.assertFalse(f.add("a.txt", 200))
        self.assertEqual(f.get_size("a.txt"), 100)  # original preserved

    def test_get_size_missing_is_none(self):
        self.assertIsNone(Files().get_size("ghost"))

    def test_copy_basic(self):
        f = Files()
        f.add("a", 100)
        self.assertTrue(f.copy("a", "b"))
        self.assertEqual(f.get_size("b"), 100)
        self.assertEqual(f.get_size("a"), 100)  # source preserved

    def test_copy_missing_source_false(self):
        f = Files()
        self.assertFalse(f.copy("ghost", "b"))
        self.assertIsNone(f.get_size("b"))

    def test_copy_taken_dest_false_no_mutation(self):
        f = Files()
        f.add("a", 100)
        f.add("b", 50)
        self.assertFalse(f.copy("a", "b"))
        self.assertEqual(f.get_size("b"), 50)  # original b preserved

    def test_delete_returns_size(self):
        f = Files()
        f.add("a", 100)
        self.assertEqual(f.delete("a"), 100)
        self.assertIsNone(f.get_size("a"))

    def test_delete_missing_is_none(self):
        self.assertIsNone(Files().delete("ghost"))
`,
    solution: `class Files:
    def __init__(self):
        self._files = {}

    def add(self, name, size):
        if name in self._files:
            return False
        self._files[name] = size
        return True

    def get_size(self, name):
        return self._files.get(name)

    def copy(self, src, dst):
        if src not in self._files:
            return False
        if dst in self._files:
            return False
        self._files[dst] = self._files[src]
        return True

    def delete(self, name):
        if name not in self._files:
            return None
        size = self._files.pop(name)
        return size
`,
  },

  /* ====================================================================
   * Exam Patterns — 10 drills built from the canonical 4-level exam shape.
   * Each drill rehearses one micro-skill that the mock-exam projects
   * exercise. Topic label "Exam Patterns" groups them in the catalog so
   * candidates can warm up on exam-shaped reps before sitting a mock.
   * ==================================================================== */

  {
    id: "format-record",
    title: "Format a Record as field(value)",
    topic: "Exam Patterns",
    difficulty: 2,
    mode: "sync",
    blurb: "Build the canonical L2 string output: \"field(value), field(value)\" sorted lex.",
    prompt: `# Format a Record as field(value)

Write \`format_record(record)\`. \`record\` is a \`dict[str, str]\` mapping field names to values. Return a **single string** of the form \`"field1(value1), field2(value2), ..."\` with fields **sorted by name ascending**. An empty record returns \`""\`.

This is the L2 output shape every mock exam returns from \`scan(key)\`. Burn it in.

**▣ Visual — the receipt printer.** Each field is one line item: \`name(value)\`. The receipt is line items glued together with \`", "\` between each. Lex-sorted keys = receipt printed in alphabetical order so it's easy to scan with your eye. \`", ".join(...)\` is the printer's mechanism for fusing the line items into one continuous strip of paper.`,
    starterCode: `def format_record(record):
    pass
`,
    tests: `import unittest
from solution import format_record


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(format_record({"age": "30", "name": "Alice"}), "age(30), name(Alice)")

    def test_empty(self):
        self.assertEqual(format_record({}), "")

    def test_single(self):
        self.assertEqual(format_record({"x": "1"}), "x(1)")

    def test_sorted_lex(self):
        self.assertEqual(format_record({"z": "9", "a": "1", "m": "5"}), "a(1), m(5), z(9)")
`,
    solution: `def format_record(record):
    return ", ".join(f + "(" + record[f] + ")" for f in sorted(record))
`,
  },

  {
    id: "top-spenders-format",
    title: "Top Spenders as \"id(total)\"",
    topic: "Exam Patterns",
    difficulty: 2,
    mode: "sync",
    blurb: "Rank accounts by total spend, then format each as \"id(total)\" — the Banking L2 output.",
    prompt: `# Top Spenders as "id(total)"

Write \`top_spenders(totals, n)\`. \`totals\` is a \`dict[str, int]\` mapping account id to outgoing total. Return the **list of strings** \`"<id>(<total>)"\` for the top \`n\` accounts, ordered by **total descending**, ties broken by **id ascending**. If fewer than \`n\` accounts exist, return them all.

This is exactly what the Banking mock exam's L2 returns.

**▣ Visual — the leaderboard scoreboard.** A sports scoreboard. The biggest number is at the top; ties below it are broken by alphabetical order (so "A. Smith" appears above "B. Smith" if they both have the same score). The format \`"name(score)"\` is the line of text painted on each board slot. The tuple key \`(-total, id)\` is the rule the scorekeeper uses: **first sort by score backwards** (negate to flip the direction of one column), **then by name forwards** as a tie-breaker.`,
    starterCode: `def top_spenders(totals, n):
    pass
`,
    tests: `import unittest
from solution import top_spenders


class DrillTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(top_spenders({"a": 300, "b": 200, "c": 100}, 3), ["a(300)", "b(200)", "c(100)"])

    def test_ties_break_by_id_asc(self):
        self.assertEqual(top_spenders({"z": 100, "a": 100, "m": 100}, 3), ["a(100)", "m(100)", "z(100)"])

    def test_n_exceeds_count(self):
        self.assertEqual(top_spenders({"a": 10}, 5), ["a(10)"])

    def test_empty(self):
        self.assertEqual(top_spenders({}, 5), [])

    def test_zero_totals(self):
        self.assertEqual(top_spenders({"a": 0, "b": 0}, 2), ["a(0)", "b(0)"])
`,
    solution: `def top_spenders(totals, n):
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    return [aid + "(" + str(total) + ")" for aid, total in ranked[:n]]
`,
  },

  {
    id: "backup-with-ttl-reanchor",
    title: "Backup with TTL Re-anchor",
    topic: "Exam Patterns",
    difficulty: 3,
    mode: "sync",
    blurb: "Snapshot live fields with REMAINING lifetime, then restore at a future time with re-anchored expiry.",
    prompt: `# Backup with TTL Re-anchor

This is the heart of the In-Memory DB L4 capstone.

Write two functions:

- \`take_backup(fields, backup_time)\` — \`fields\` is a list of \`(name, value, set_at, expiry)\` tuples. \`expiry\` may be \`None\` (permanent). Return a list of \`(name, value, remaining)\` for every field still **live** at \`backup_time\` — that is, \`expiry\` is \`None\` (then \`remaining\` is \`None\`) or \`backup_time < expiry\` (then \`remaining = expiry - backup_time\`). Expired fields are omitted.
- \`apply_backup(snapshot, restore_time)\` — given a snapshot of \`(name, value, remaining)\` tuples and a new wall-clock \`restore_time\`, return a list of \`(name, value, set_at, expiry)\` where \`set_at = restore_time\` and \`expiry = restore_time + remaining\` (or \`None\` for permanent fields).

**▣ Visual — freeze-drying food with REMAINING shelf-life.** You're packing food for a long trip. Each item has an expiry date stamped on it. At backup time you check every item: if it's already spoiled (past its expiry), throw it out. If still good, freeze-dry it with a label saying **how much shelf-life it had left** (\`remaining = expiry - now\`), not its original expiry date. Months later (restore at a NEW time), you thaw the items — and each item's new expiry is **today + the remaining shelf-life on the label**. A milk that had 3 days left in November still has 3 days left when thawed in March.`,
    starterCode: `def take_backup(fields, backup_time):
    pass


def apply_backup(snapshot, restore_time):
    pass
`,
    tests: `import unittest
from solution import take_backup, apply_backup


class DrillTests(unittest.TestCase):
    def test_backup_keeps_permanent(self):
        out = take_backup([("a", "1", 0, None)], 50)
        self.assertEqual(out, [("a", "1", None)])

    def test_backup_keeps_live_with_remaining(self):
        out = take_backup([("a", "1", 10, 30)], 12)
        self.assertEqual(out, [("a", "1", 18)])

    def test_backup_drops_expired(self):
        out = take_backup([("a", "1", 0, 5)], 10)
        self.assertEqual(out, [])

    def test_backup_mixed(self):
        out = take_backup(
            [("perm", "p", 0, None), ("live", "l", 0, 10), ("dead", "d", 0, 5)],
            7,
        )
        self.assertEqual(sorted(out), sorted([("perm", "p", None), ("live", "l", 3)]))

    def test_apply_re_anchors_expiry(self):
        out = apply_backup([("a", "1", 18)], 100)
        self.assertEqual(out, [("a", "1", 100, 118)])

    def test_apply_permanent_stays_permanent(self):
        out = apply_backup([("a", "1", None)], 100)
        self.assertEqual(out, [("a", "1", 100, None)])
`,
    solution: `def take_backup(fields, backup_time):
    out = []
    for name, value, set_at, expiry in fields:
        if expiry is None:
            out.append((name, value, None))
        elif backup_time < expiry:
            out.append((name, value, expiry - backup_time))
    return out


def apply_backup(snapshot, restore_time):
    out = []
    for name, value, remaining in snapshot:
        if remaining is None:
            out.append((name, value, restore_time, None))
        else:
            out.append((name, value, restore_time, restore_time + remaining))
    return out
`,
  },

  {
    id: "delayed-effect-queue",
    title: "Delayed Effect Queue",
    topic: "Exam Patterns",
    difficulty: 3,
    mode: "sync",
    blurb: "Schedule effects for later, then drain everything due at or before now in time order.",
    prompt: `# Delayed Effect Queue

The mechanic behind 24-hour cashback in the Banking assessment. Build a class with two methods:

- \`schedule(due_at, payload)\` — queue an effect to fire at \`due_at\`.
- \`drain(now)\` — pop every queued effect whose \`due_at <= now\`. Return them as a list of \`payload\`s **in due-time order** (ties: insertion order). Effects past their due time leave the queue.

Build it as a class \`DelayedQueue\`.

**▣ Visual — the post-dated envelopes drawer.** Every cashback is a sealed envelope with a "do not open before" date written on the front. They sit in a drawer. \`drain(now)\` is **opening every envelope whose date has arrived**: pick them out of the drawer, open them in date order, hand the contents to the right account. The drawer is the dict; the envelope contents are the payload; the "open after" date is the due time. Banking L3's 24-hour cashback is exactly this — payment time + 86_400_000 ms is when the envelope can be opened.`,
    starterCode: `class DelayedQueue:
    def __init__(self):
        pass

    def schedule(self, due_at, payload):
        pass

    def drain(self, now):
        pass
`,
    tests: `import unittest
from solution import DelayedQueue


class DrillTests(unittest.TestCase):
    def test_drain_empty(self):
        self.assertEqual(DelayedQueue().drain(100), [])

    def test_drain_in_due_order(self):
        q = DelayedQueue()
        q.schedule(20, "b")
        q.schedule(10, "a")
        q.schedule(30, "c")
        self.assertEqual(q.drain(25), ["a", "b"])

    def test_drain_removes_from_queue(self):
        q = DelayedQueue()
        q.schedule(10, "a")
        q.drain(15)
        self.assertEqual(q.drain(100), [])

    def test_due_boundary_inclusive(self):
        q = DelayedQueue()
        q.schedule(10, "a")
        self.assertEqual(q.drain(10), ["a"])

    def test_ties_preserve_insertion_order(self):
        q = DelayedQueue()
        q.schedule(10, "first")
        q.schedule(10, "second")
        q.schedule(10, "third")
        self.assertEqual(q.drain(10), ["first", "second", "third"])
`,
    solution: `class DelayedQueue:
    def __init__(self):
        self._items = []  # list of (due_at, seq, payload)
        self._seq = 0

    def schedule(self, due_at, payload):
        self._items.append((due_at, self._seq, payload))
        self._seq += 1

    def drain(self, now):
        due = sorted([it for it in self._items if it[0] <= now], key=lambda it: (it[0], it[1]))
        self._items = [it for it in self._items if it[0] > now]
        return [payload for _, _, payload in due]
`,
  },

  {
    id: "historical-balance",
    title: "Historical Balance",
    topic: "Exam Patterns",
    difficulty: 3,
    mode: "sync",
    blurb: "Replay a transaction log to compute the balance at any past time.",
    prompt: `# Historical Balance

The Banking L4 mechanic: given a per-account transaction log, return the balance at any historical timestamp.

Write \`balance_at(log, time_at)\`. \`log\` is a list of \`(timestamp, kind, amount)\` tuples sorted by timestamp ascending. \`kind\` is one of:

- \`"deposit"\`, \`"transfer_in"\`, \`"cashback"\` — adds \`amount\`
- \`"transfer_out"\`, \`"payment"\` — subtracts \`amount\`

Return the balance summed over every entry with \`timestamp <= time_at\`.

**▣ Visual — the bank statement printer.** Imagine the printer feeds the log paper one row at a time, oldest first. For each row, the printer either adds (+) or subtracts (-) from a running total displayed on screen. When it reaches a row whose timestamp is past your query date, it stops printing. The number on the screen at that moment is your historical balance. You don't need to store one number per day; you just need the log + a replay loop.`,
    starterCode: `def balance_at(log, time_at):
    pass
`,
    tests: `import unittest
from solution import balance_at


class DrillTests(unittest.TestCase):
    def test_empty_log(self):
        self.assertEqual(balance_at([], 100), 0)

    def test_only_deposits(self):
        log = [(1, "deposit", 100), (2, "deposit", 50)]
        self.assertEqual(balance_at(log, 99), 150)

    def test_truncated_by_time(self):
        log = [(1, "deposit", 100), (2, "deposit", 50), (5, "deposit", 25)]
        self.assertEqual(balance_at(log, 2), 150)
        self.assertEqual(balance_at(log, 4), 150)
        self.assertEqual(balance_at(log, 5), 175)

    def test_mixed_kinds(self):
        log = [
            (1, "deposit", 500),
            (2, "transfer_out", 100),
            (3, "payment", 50),
            (4, "cashback", 1),
            (5, "transfer_in", 25),
        ]
        self.assertEqual(balance_at(log, 5), 500 - 100 - 50 + 1 + 25)

    def test_zero_when_before_first_entry(self):
        log = [(10, "deposit", 100)]
        self.assertEqual(balance_at(log, 5), 0)
`,
    solution: `def balance_at(log, time_at):
    bal = 0
    for ts, kind, amount in log:
        if ts > time_at:
            break
        if kind in ("deposit", "transfer_in", "cashback"):
            bal += amount
        elif kind in ("transfer_out", "payment"):
            bal -= amount
    return bal
`,
  },

  {
    id: "merge-with-redirect",
    title: "Merge with Redirect",
    topic: "Exam Patterns",
    difficulty: 3,
    mode: "sync",
    blurb: "Absorb one entity into another and redirect every reference to the absorbed id.",
    prompt: `# Merge with Redirect

The Banking L4 merge mechanic. Two entities and a set of pending tasks that reference them by id.

Write \`merge(entities, pending, target, source)\`:

- \`entities\` — \`dict[str, dict]\` of \`{id: {"balance": int}}\`.
- \`pending\` — list of dicts each holding an \`"owner"\` (an entity id) plus other arbitrary keys.
- \`target\`, \`source\` — entity ids.

Mutate in place:

1. Add \`entities[source]["balance"]\` into \`entities[target]\`.
2. Delete \`source\` from \`entities\`.
3. For every dict in \`pending\` whose \`"owner"\` is \`source\`, set its \`"owner"\` to \`target\`.

Return \`True\` on success, \`False\` if either id is missing or \`target == source\` (and don't mutate anything in that case).

**▣ Visual — the corporate acquisition.** Company A buys Company B. Three things happen on closing day: (1) B's cash flows into A's account, (2) B's office sign is taken down, (3) every invoice still in transit addressed to B gets re-routed to A. Crucially, in-flight invoices already addressed to A are untouched — only B's get redirected. The "pending" list is the mailroom; the loop is the postmaster updating addresses.`,
    starterCode: `def merge(entities, pending, target, source):
    pass
`,
    tests: `import unittest
from solution import merge


class DrillTests(unittest.TestCase):
    def test_basic_balance_combined(self):
        ents = {"a": {"balance": 100}, "b": {"balance": 50}}
        pending = []
        self.assertTrue(merge(ents, pending, "a", "b"))
        self.assertEqual(ents, {"a": {"balance": 150}})

    def test_pending_owners_redirected(self):
        ents = {"a": {"balance": 0}, "b": {"balance": 0}}
        pending = [{"owner": "b", "id": "p1"}, {"owner": "a", "id": "p2"}, {"owner": "b", "id": "p3"}]
        merge(ents, pending, "a", "b")
        owners = [p["owner"] for p in pending]
        self.assertEqual(owners, ["a", "a", "a"])

    def test_self_merge_false(self):
        ents = {"a": {"balance": 5}}
        self.assertFalse(merge(ents, [], "a", "a"))
        self.assertEqual(ents, {"a": {"balance": 5}})

    def test_missing_target_false_no_mutation(self):
        ents = {"a": {"balance": 5}}
        pending = [{"owner": "a"}]
        self.assertFalse(merge(ents, pending, "ghost", "a"))
        self.assertEqual(ents, {"a": {"balance": 5}})
        self.assertEqual(pending, [{"owner": "a"}])

    def test_missing_source_false_no_mutation(self):
        ents = {"a": {"balance": 5}}
        self.assertFalse(merge(ents, [], "a", "ghost"))
`,
    solution: `def merge(entities, pending, target, source):
    if target == source:
        return False
    if target not in entities or source not in entities:
        return False
    entities[target]["balance"] += entities[source]["balance"]
    del entities[source]
    for item in pending:
        if item.get("owner") == source:
            item["owner"] = target
    return True
`,
  },

  {
    id: "compress-halve",
    title: "Compress / Decompress (Halving)",
    topic: "Exam Patterns",
    difficulty: 1,
    mode: "sync",
    blurb: "Toggle a file between compressed (size//2) and uncompressed, track which state it's in.",
    prompt: `# Compress / Decompress (Halving)

The Cloud Storage L4 capstone. Build a class \`File\` with:

- \`__init__(size)\` — start uncompressed at the given size.
- \`compress()\` — if not already compressed, halve the size (integer division). Return the new size, or \`None\` if already compressed.
- \`decompress()\` — if compressed, double the size. Return the new size, or \`None\` if not compressed.
- \`size\` — read-only attribute holding the current size.

**▣ Visual — the vacuum-sealed clothing bag.** A wool sweater takes a certain shelf size. You drop it in a vacuum bag and the air goes out — the sweater is unchanged, but it now takes half the shelf. Compressing again is meaningless (you can't double-vacuum the same bag), so that call returns None. Open the bag → it fluffs back to its original size. Trying to decompress a sweater that was never bagged is meaningless too. The \`_compressed\` flag is the answer to "is this bag currently sealed?"`,
    starterCode: `class File:
    def __init__(self, size):
        pass

    def compress(self):
        pass

    def decompress(self):
        pass
`,
    tests: `import unittest
from solution import File


class DrillTests(unittest.TestCase):
    def test_initial_size(self):
        self.assertEqual(File(100).size, 100)

    def test_compress_halves(self):
        f = File(100)
        self.assertEqual(f.compress(), 50)
        self.assertEqual(f.size, 50)

    def test_compress_twice_none(self):
        f = File(100)
        f.compress()
        self.assertIsNone(f.compress())

    def test_decompress_restores(self):
        f = File(100)
        f.compress()
        self.assertEqual(f.decompress(), 100)
        self.assertEqual(f.size, 100)

    def test_decompress_when_not_compressed_none(self):
        self.assertIsNone(File(100).decompress())

    def test_integer_division_on_odd(self):
        f = File(101)
        self.assertEqual(f.compress(), 50)
`,
    solution: `class File:
    def __init__(self, size):
        self.size = size
        self._compressed = False

    def compress(self):
        if self._compressed:
            return None
        self._compressed = True
        self.size = self.size // 2
        return self.size

    def decompress(self):
        if not self._compressed:
            return None
        self._compressed = False
        self.size = self.size * 2
        return self.size
`,
  },

  {
    id: "evict-by-largest",
    title: "Evict by Largest",
    topic: "Exam Patterns",
    difficulty: 2,
    mode: "sync",
    blurb: "Evict the largest files first (lex-larger name first on size ties) until under capacity.",
    prompt: `# Evict by Largest

The Cloud Storage L3 eviction. Write \`evict(files, capacity)\`:

- \`files\` — \`dict[str, int]\` mapping name → size.
- \`capacity\` — int.

Mutate \`files\` in place: while the **sum of sizes** exceeds \`capacity\`, remove the **largest** file. Ties on size are broken by removing the **lex-larger name first**. Return the list of removed names in eviction order.

**▣ Visual — the overstuffed closet.** Imagine a closet over its weight limit. You evict items one at a time, **biggest first**. If two items weigh the same, you pick the one whose name comes **later in the alphabet** (Z before A — opposite of normal sort). You keep evicting until total weight is at or under the limit. The negate trick \`[-ord(c) for c in name]\` is how you tell sorted to put Z BEFORE A — character codes go negative, so "z" (-122) compares less than "a" (-97), putting z first.`,
    starterCode: `def evict(files, capacity):
    pass
`,
    tests: `import unittest
from solution import evict


class DrillTests(unittest.TestCase):
    def test_no_eviction_when_under_capacity(self):
        files = {"a": 100}
        self.assertEqual(evict(files, 500), [])
        self.assertEqual(files, {"a": 100})

    def test_evict_largest_first(self):
        files = {"small": 100, "big": 500, "medium": 300}
        out = evict(files, 200)
        self.assertEqual(out, ["big", "medium"])
        self.assertEqual(files, {"small": 100})

    def test_size_tie_lex_larger_first(self):
        files = {"alpha": 200, "zulu": 200}
        out = evict(files, 150)
        self.assertEqual(out, ["zulu", "alpha"])

    def test_evict_exactly_to_capacity(self):
        files = {"a": 100, "b": 100}
        out = evict(files, 100)
        self.assertEqual(out, ["b"])
        self.assertEqual(files, {"a": 100})

    def test_empty_files(self):
        files = {}
        self.assertEqual(evict(files, 0), [])
`,
    solution: `def evict(files, capacity):
    evicted = []
    while sum(files.values()) > capacity:
        ranked = sorted(files.items(), key=lambda kv: (-kv[1], [-ord(c) for c in kv[0]]))
        name = ranked[0][0]
        evicted.append(name)
        del files[name]
    return evicted
`,
  },

  {
    id: "strict-increasing-validate",
    title: "Strict-Increasing Timestamps",
    topic: "Exam Patterns",
    difficulty: 1,
    mode: "sync",
    blurb: "Wrap an operation in a guard that rejects a non-monotonic timestamp.",
    prompt: `# Strict-Increasing Timestamps

The Banking assessment contract is "timestamps are strictly increasing across the run." Build a class \`TimestampGuard\` that enforces this:

- \`__init__()\` — no timestamps seen yet.
- \`accept(timestamp)\` — record \`timestamp\` as the latest. Return \`True\`. **Raise** \`ValueError\` if the timestamp is **less than or equal to** any previously accepted timestamp; in that case, do not record it.

> Strict-increasing means \`>\`, not \`>=\`. Two operations at the same timestamp violate the contract.

**▣ Visual — the turnstile.** A subway turnstile reads the timestamp on each ticket as you swipe through. Every swipe MUST be later than the previous swipe — even one millisecond is fine, but same-second swipes get bounced. The turnstile remembers ONLY the last accepted swipe (\`self._last\`). A bounced ticket leaves the memory untouched, so the next legitimate ticket still has the original "last swipe" to compare against.`,
    starterCode: `class TimestampGuard:
    def __init__(self):
        pass

    def accept(self, timestamp):
        pass
`,
    tests: `import unittest
from solution import TimestampGuard


class DrillTests(unittest.TestCase):
    def test_first_accept(self):
        g = TimestampGuard()
        self.assertTrue(g.accept(5))

    def test_strictly_increasing_ok(self):
        g = TimestampGuard()
        g.accept(1)
        g.accept(2)
        self.assertTrue(g.accept(100))

    def test_equal_raises(self):
        g = TimestampGuard()
        g.accept(5)
        with self.assertRaises(ValueError):
            g.accept(5)

    def test_decreasing_raises(self):
        g = TimestampGuard()
        g.accept(5)
        with self.assertRaises(ValueError):
            g.accept(4)

    def test_after_raise_state_unchanged(self):
        g = TimestampGuard()
        g.accept(5)
        try:
            g.accept(3)
        except ValueError:
            pass
        # 6 must still be accepted relative to 5, not 3
        self.assertTrue(g.accept(6))
`,
    solution: `class TimestampGuard:
    def __init__(self):
        self._last = None

    def accept(self, timestamp):
        if self._last is not None and timestamp <= self._last:
            raise ValueError("timestamp " + str(timestamp) + " not greater than " + str(self._last))
        self._last = timestamp
        return True
`,
  },

  {
    id: "rollback-to",
    title: "Rollback by Replay",
    topic: "Exam Patterns",
    difficulty: 3,
    mode: "sync",
    blurb: "Reconstruct state at a past time by replaying an event log up to the target timestamp.",
    prompt: `# Rollback by Replay

The pattern behind the File Storage L4 and the Banking-rollback L4. Write \`replay_to(events, target)\`:

- \`events\` — list of \`(timestamp, op, args)\` tuples. \`op\` is one of \`"add"\` or \`"remove"\`. For \`"add"\`, \`args\` is \`(key, value)\`. For \`"remove"\`, \`args\` is \`(key,)\` (a 1-tuple).
- \`target\` — an integer timestamp.

Return a \`dict\` representing the state after applying every event whose timestamp is \`<= target\`. Apply \`add\` as a write/overwrite and \`remove\` as a delete (a remove of an absent key is a no-op).

**▣ Visual — the film projector with a rewind dial.** A movie is a sequence of frames. The picture on screen at any frame N is determined entirely by every frame from 1 to N. To "rewind to frame N" you don't undo anything — you start with a black screen and replay frames 1, 2, 3, ..., N. The event log IS the film reel; the dict you return IS the picture on screen at the chosen frame. Any frame past N stays unseen in the can.`,
    starterCode: `def replay_to(events, target):
    pass
`,
    tests: `import unittest
from solution import replay_to


class DrillTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(replay_to([], 100), {})

    def test_adds_truncated_by_target(self):
        events = [(1, "add", ("a", 1)), (10, "add", ("b", 2)), (20, "add", ("c", 3))]
        self.assertEqual(replay_to(events, 15), {"a": 1, "b": 2})

    def test_removes_apply(self):
        events = [(1, "add", ("a", 1)), (2, "remove", ("a",))]
        self.assertEqual(replay_to(events, 5), {})

    def test_remove_absent_is_noop(self):
        events = [(1, "remove", ("ghost",)), (2, "add", ("a", 1))]
        self.assertEqual(replay_to(events, 5), {"a": 1})

    def test_overwrite(self):
        events = [(1, "add", ("a", 1)), (2, "add", ("a", 2))]
        self.assertEqual(replay_to(events, 5), {"a": 2})

    def test_target_excludes_future_events(self):
        events = [(1, "add", ("a", 1)), (10, "remove", ("a",))]
        self.assertEqual(replay_to(events, 5), {"a": 1})
`,
    solution: `def replay_to(events, target):
    state = {}
    for ts, op, args in events:
        if ts > target:
            break
        if op == "add":
            key, value = args
            state[key] = value
        elif op == "remove":
            key = args[0]
            state.pop(key, None)
    return state
`,
  },
];
