/* reference.js — quick-reference cheatsheets. */

export default [
  {
    id: "unittest",
    title: "unittest",
    blurb: "Test structure and the assertion vocabulary — read tests as the spec.",
    sections: [
      {
        heading: "Structure",
        entries: [
          { code: "import unittest\nfrom solution import Thing\n\nclass Tests(unittest.TestCase):\n    def setUp(self):\n        self.t = Thing()       # runs before each test\n    def test_behaviour(self):\n        self.assertEqual(self.t.f(), 1)",
            note: "Every method named test* is one test. setUp runs before each." },
        ],
      },
      {
        heading: "Assertions = requirements",
        entries: [
          { code: "self.assertEqual(a, b)", note: "a must equal b (the workhorse)." },
          { code: "self.assertTrue(x) / assertFalse(x)", note: "x must be truthy / falsy." },
          { code: "self.assertIsNone(x)", note: "x must be None." },
          { code: "self.assertCountEqual(a, b)", note: "same elements, order-independent." },
          { code: "with self.assertRaises(KeyError):\n    thing.bad()", note: "the block must raise that exception." },
        ],
      },
      {
        heading: "Reading a failure",
        entries: [
          { code: "AssertionError: 6 != 7", note: "left = what you returned, right = expected. Here you returned 6, the test wanted 7." },
        ],
      },
    ],
  },
  {
    id: "asyncio",
    title: "asyncio",
    blurb: "Coroutines, concurrency, and coordination primitives — all runnable in-browser.",
    sections: [
      {
        heading: "Coroutines",
        entries: [
          { code: "async def work(n):\n    await asyncio.sleep(0)\n    return n * n", note: "async def makes a coroutine; await yields to the loop." },
          { code: "result = await work(5)", note: "await a single coroutine for its result." },
        ],
      },
      {
        heading: "Running concurrently",
        entries: [
          { code: "results = await asyncio.gather(*[work(n) for n in nums])", note: "runs all concurrently; results stay in input order." },
          { code: "task = asyncio.create_task(work(3))\n...\nval = await task", note: "schedule a coroutine to run, await it later." },
          { code: "await asyncio.wait_for(work(3), timeout=2)", note: "raises asyncio.TimeoutError if it overruns." },
        ],
      },
      {
        heading: "Coordination",
        entries: [
          { code: "q = asyncio.Queue()\nq.put_nowait(x)\nitem = await q.get()", note: "producer/consumer queue. get_nowait() raises QueueEmpty if empty." },
          { code: "async with asyncio.Lock():\n    ...", note: "one coroutine at a time in the critical section." },
          { code: "sem = asyncio.Semaphore(3)\nasync with sem:\n    ...", note: "cap concurrency — at most 3 inside at once." },
        ],
      },
    ],
  },
  {
    id: "threading",
    title: "threading",
    blurb: "Locks, queues, and the concepts behind safe shared state.",
    sections: [
      {
        heading: "Locks",
        entries: [
          { code: "lock = threading.Lock()\nwith lock:\n    shared += 1", note: "the with block is a critical section — one thread at a time." },
          { code: "threading.RLock()", note: "re-entrant: the holding thread may acquire it again." },
        ],
      },
      {
        heading: "Queues & workers",
        entries: [
          { code: "from queue import Queue\nq = Queue()\nq.put(x)\nitem = q.get()", note: "thread-safe producer/consumer queue." },
          { code: "t = threading.Thread(target=fn, args=(...,))\nt.start(); t.join()", note: "run fn on another thread; join() waits for it." },
        ],
      },
      {
        heading: "Signalling",
        entries: [
          { code: "evt = threading.Event()\nevt.set() / evt.wait()", note: "one-shot flag threads can wait on." },
          { code: "cond = threading.Condition()\nwith cond:\n    cond.wait() / cond.notify()", note: "wait for a state change while holding a lock." },
        ],
      },
      {
        heading: "asyncio ↔ threading",
        entries: [
          { code: "threading.Lock   <->  asyncio.Lock\nqueue.Queue      <->  asyncio.Queue\nThread(target=)  <->  asyncio.create_task", note: "the ideas map across; pick whichever you write faster." },
        ],
      },
    ],
  },
  {
    id: "stdlib",
    title: "stdlib Patterns",
    blurb: "collections, sorting, and dict idioms that save time under pressure.",
    sections: [
      {
        heading: "collections",
        entries: [
          { code: "defaultdict(list)  /  defaultdict(int)", note: "auto-creates a missing value; no key-existence guard." },
          { code: "Counter(seq).most_common(n)", note: "tally a sequence; n most frequent." },
          { code: "deque(maxlen=k)", note: "O(1) at both ends; maxlen makes a rolling window." },
        ],
      },
      {
        heading: "Sorting",
        entries: [
          { code: "sorted(xs, key=lambda x: (-x.count, x.name))", note: "tuple key: count descending, then name ascending." },
          { code: "heapq.nlargest(n, xs, key=...)", note: "top-n without sorting everything." },
        ],
      },
      {
        heading: "dict idioms",
        entries: [
          { code: "d.get(k, default)", note: "lookup with a fallback — never raises." },
          { code: "d.setdefault(k, {})[k2] = v", note: "create the nested dict on demand." },
          { code: "for k, v in d.items(): ...", note: "iterate keys and values together." },
        ],
      },
      {
        heading: "Time & TTL",
        entries: [
          { code: "live = expiry is None or now < expiry", note: "lazy expiry — check on read, never on a timer." },
          { code: "import copy; copy.deepcopy(state)", note: "independent snapshot of nested structures." },
        ],
      },
    ],
  },
];
