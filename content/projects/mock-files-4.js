/* mock-files-4 — File Storage, a 4-level assessment variant.
 *
 * Adapted from a public coding-practice framework (file-storage track).
 *
 * The 4-level arc:
 *   L1 — file_upload / file_get / file_copy   (snake_case version of FILE_UPLOAD/...)
 *   L2 — file_search prefix, top 10 by size desc / name asc
 *   L3 — file_upload_at / file_get_at / file_copy_at / file_search_at  + TTL in SECONDS
 *   L4 — rollback(timestamp): restore the whole storage to that wall-clock,
 *        recompute TTLs (a file alive then with remaining lifetime keeps that remaining)
 *
 * Note: the original source uses SCREAMING_CASE method names (FILE_UPLOAD,
 * ROLLBACK). The snake_case used here follows Python's PEP 8 — the spec text
 * notes the original CAPS form.
 *
 * Critical archetype detail: TTL is in SECONDS here, NOT milliseconds. (The
 * Banking mock uses milliseconds for cashback. Mixing the two will cost time.)
 */

const STARTER = `class FileStorage:
    """A file storage service — a common multi-level assessment archetype.
    Build the four levels in order.

    L3 introduces timestamps (integer seconds) and TTL in seconds. L4
    introduces rollback that recomputes TTLs."""

    def __init__(self):
        pass

    def file_upload(self, name, size):
        pass

    def file_get(self, name):
        pass

    def file_copy(self, name_from, name_to):
        pass
`;

const SOL_1 = `class FileStorage:
    def __init__(self):
        self._files = {}  # name -> {"size": int, "created_at": int, "expiry": int | None}

    def file_upload(self, name, size):
        if name in self._files:
            return False
        self._files[name] = {"size": size, "created_at": 0, "expiry": None}
        return True

    def file_get(self, name):
        f = self._files.get(name)
        return None if f is None else f["size"]

    def file_copy(self, name_from, name_to):
        if name_from not in self._files:
            return False
        src = self._files[name_from]
        self._files[name_to] = {"size": src["size"], "created_at": src["created_at"], "expiry": src["expiry"]}
        return True
`;

const SOL_2 = SOL_1 + `
    def file_search(self, prefix):
        matches = [(name, info["size"]) for name, info in self._files.items() if name.startswith(prefix)]
        matches.sort(key=lambda kv: (-kv[1], kv[0]))
        return [name for name, _ in matches[:10]]
`;

const SOL_3 = `class FileStorage:
    def __init__(self):
        self._files = {}  # name -> {"size": int, "created_at": int, "expiry": int | None}
        self._history = []  # list of (timestamp, op_name, args) — for L4 rollback

    # ---- helpers ----
    def _live(self, info, now):
        if info is None:
            return False
        expiry = info["expiry"]
        return expiry is None or now < expiry

    def _put(self, name, size, created_at, expiry):
        self._files[name] = {"size": size, "created_at": created_at, "expiry": expiry}

    # ---- L1 (untimed default at t=0) ----
    def file_upload(self, name, size):
        if name in self._files:
            return False
        self._put(name, size, 0, None)
        return True

    def file_get(self, name):
        info = self._files.get(name)
        return None if info is None else info["size"]

    def file_copy(self, name_from, name_to):
        if name_from not in self._files:
            return False
        src = self._files[name_from]
        self._put(name_to, src["size"], src["created_at"], src["expiry"])
        return True

    # ---- L2 ----
    def file_search(self, prefix):
        matches = [(name, info["size"]) for name, info in self._files.items() if name.startswith(prefix)]
        matches.sort(key=lambda kv: (-kv[1], kv[0]))
        return [name for name, _ in matches[:10]]

    # ---- L3 ----
    def file_upload_at(self, timestamp, name, size, ttl=None):
        if name in self._files and self._live(self._files[name], timestamp):
            return False
        expiry = None if ttl is None else timestamp + ttl
        self._put(name, size, timestamp, expiry)
        return True

    def file_get_at(self, timestamp, name):
        info = self._files.get(name)
        if not self._live(info, timestamp):
            return None
        return info["size"]

    def file_copy_at(self, timestamp, name_from, name_to):
        src = self._files.get(name_from)
        if not self._live(src, timestamp):
            return False
        # copying preserves the source's remaining lifetime
        self._put(name_to, src["size"], timestamp, src["expiry"])
        return True

    def file_search_at(self, timestamp, prefix):
        matches = []
        for name, info in self._files.items():
            if name.startswith(prefix) and self._live(info, timestamp):
                matches.append((name, info["size"]))
        matches.sort(key=lambda kv: (-kv[1], kv[0]))
        return [name for name, _ in matches[:10]]
`;

const SOL_4 = `class FileStorage:
    def __init__(self):
        self._files = {}
        self._history = []  # list of (timestamp, "op", *args)

    # ---- helpers ----
    def _live(self, info, now):
        if info is None:
            return False
        expiry = info["expiry"]
        return expiry is None or now < expiry

    def _put(self, name, size, created_at, expiry):
        self._files[name] = {"size": size, "created_at": created_at, "expiry": expiry}

    def _record(self, op, timestamp, args):
        self._history.append((timestamp, op, args))

    # ---- L1 ----
    def file_upload(self, name, size):
        if name in self._files:
            return False
        self._put(name, size, 0, None)
        self._record("upload", 0, (name, size, None))
        return True

    def file_get(self, name):
        info = self._files.get(name)
        return None if info is None else info["size"]

    def file_copy(self, name_from, name_to):
        if name_from not in self._files:
            return False
        src = self._files[name_from]
        self._put(name_to, src["size"], src["created_at"], src["expiry"])
        ttl = None if src["expiry"] is None else src["expiry"] - src["created_at"]
        self._record("copy", 0, (name_from, name_to))
        return True

    # ---- L2 ----
    def file_search(self, prefix):
        matches = [(name, info["size"]) for name, info in self._files.items() if name.startswith(prefix)]
        matches.sort(key=lambda kv: (-kv[1], kv[0]))
        return [name for name, _ in matches[:10]]

    # ---- L3 ----
    def file_upload_at(self, timestamp, name, size, ttl=None):
        if name in self._files and self._live(self._files[name], timestamp):
            return False
        expiry = None if ttl is None else timestamp + ttl
        self._put(name, size, timestamp, expiry)
        self._record("upload", timestamp, (name, size, ttl))
        return True

    def file_get_at(self, timestamp, name):
        info = self._files.get(name)
        if not self._live(info, timestamp):
            return None
        return info["size"]

    def file_copy_at(self, timestamp, name_from, name_to):
        src = self._files.get(name_from)
        if not self._live(src, timestamp):
            return False
        self._put(name_to, src["size"], timestamp, src["expiry"])
        self._record("copy", timestamp, (name_from, name_to))
        return True

    def file_search_at(self, timestamp, prefix):
        matches = []
        for name, info in self._files.items():
            if name.startswith(prefix) and self._live(info, timestamp):
                matches.append((name, info["size"]))
        matches.sort(key=lambda kv: (-kv[1], kv[0]))
        return [name for name, _ in matches[:10]]

    # ---- L4 ----
    def rollback(self, timestamp):
        # rebuild storage by replaying every op whose timestamp <= the target,
        # then recompute TTL remaining relative to the target time
        self._files = {}
        for ts, op, args in self._history:
            if ts > timestamp:
                continue
            if op == "upload":
                name, size, ttl = args
                if ttl is None:
                    self._put(name, size, ts, None)
                else:
                    expiry = ts + ttl
                    if expiry > timestamp:  # still alive at target
                        self._put(name, size, ts, expiry)
                    # otherwise: expired by the target moment; skip
            elif op == "copy":
                name_from, name_to = args
                src = self._files.get(name_from)
                if src is not None:
                    # the copy's lifetime mirrors the source as it was at the copy time
                    self._put(name_to, src["size"], ts, src["expiry"])
`;

const TESTS_1 = `import unittest
from solution import FileStorage


class Level1Tests(unittest.TestCase):
    def testLevel1_upload_unique(self):
        fs = FileStorage()
        self.assertTrue(fs.file_upload("a.txt", 100))
        self.assertFalse(fs.file_upload("a.txt", 200))

    def testLevel1_get_returns_size(self):
        fs = FileStorage()
        fs.file_upload("a.txt", 100)
        self.assertEqual(fs.file_get("a.txt"), 100)
        self.assertIsNone(fs.file_get("missing"))

    def testLevel1_copy_basic(self):
        fs = FileStorage()
        fs.file_upload("a.txt", 100)
        self.assertTrue(fs.file_copy("a.txt", "b.txt"))
        self.assertEqual(fs.file_get("b.txt"), 100)

    def testLevel1_copy_missing_source_false(self):
        fs = FileStorage()
        self.assertFalse(fs.file_copy("ghost", "b.txt"))

    def testLevel1_copy_overwrites_dest(self):
        fs = FileStorage()
        fs.file_upload("a.txt", 100)
        fs.file_upload("b.txt", 50)
        self.assertTrue(fs.file_copy("a.txt", "b.txt"))
        self.assertEqual(fs.file_get("b.txt"), 100)
`;

const TESTS_2 = `import unittest
from solution import FileStorage


class Level2Tests(unittest.TestCase):
    def testLevel2_search_basic(self):
        fs = FileStorage()
        fs.file_upload("dir/a", 100)
        fs.file_upload("dir/b", 200)
        fs.file_upload("other", 999)
        self.assertEqual(fs.file_search("dir/"), ["dir/b", "dir/a"])

    def testLevel2_search_caps_at_10(self):
        fs = FileStorage()
        for i in range(15):
            fs.file_upload("p" + str(i).zfill(2), 1000 - i)
        result = fs.file_search("p")
        self.assertEqual(len(result), 10)
        self.assertEqual(result[0], "p00")

    def testLevel2_search_ties_sort_by_name_asc(self):
        fs = FileStorage()
        for name in ("dir/c", "dir/a", "dir/b"):
            fs.file_upload(name, 100)
        self.assertEqual(fs.file_search("dir/"), ["dir/a", "dir/b", "dir/c"])

    def testLevel2_search_no_match(self):
        fs = FileStorage()
        fs.file_upload("a", 100)
        self.assertEqual(fs.file_search("dir/"), [])
`;

const TESTS_3 = `import unittest
from solution import FileStorage


class Level3Tests(unittest.TestCase):
    def testLevel3_upload_at_and_get_at(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100)
        self.assertEqual(fs.file_get_at(20, "a"), 100)

    def testLevel3_upload_at_with_ttl_is_live_inside_window(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100, ttl=5)
        self.assertEqual(fs.file_get_at(12, "a"), 100)
        self.assertEqual(fs.file_get_at(14, "a"), 100)

    def testLevel3_upload_at_with_ttl_is_dead_at_expiry(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100, ttl=5)
        self.assertIsNone(fs.file_get_at(15, "a"))
        self.assertIsNone(fs.file_get_at(999, "a"))

    def testLevel3_re_upload_after_expiry_is_allowed(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100, ttl=5)
        self.assertTrue(fs.file_upload_at(20, "a", 200))

    def testLevel3_re_upload_while_alive_is_false(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100, ttl=5)
        self.assertFalse(fs.file_upload_at(12, "a", 200))

    def testLevel3_copy_at_preserves_remaining_ttl(self):
        fs = FileStorage()
        fs.file_upload_at(10, "src", 100, ttl=20)  # expires at 30
        fs.file_copy_at(15, "src", "dst")
        self.assertEqual(fs.file_get_at(28, "dst"), 100)
        self.assertIsNone(fs.file_get_at(30, "dst"))

    def testLevel3_copy_at_dead_source_false(self):
        fs = FileStorage()
        fs.file_upload_at(10, "src", 100, ttl=5)
        self.assertFalse(fs.file_copy_at(20, "src", "dst"))

    def testLevel3_search_at_only_live(self):
        fs = FileStorage()
        fs.file_upload_at(10, "dir/a", 100)
        fs.file_upload_at(10, "dir/b", 200, ttl=5)
        self.assertEqual(fs.file_search_at(12, "dir/"), ["dir/b", "dir/a"])
        self.assertEqual(fs.file_search_at(20, "dir/"), ["dir/a"])

    def testLevel3_l1_get_still_works(self):
        fs = FileStorage()
        fs.file_upload("perm", 99)
        self.assertEqual(fs.file_get("perm"), 99)
`;

const TESTS_4 = `import unittest
from solution import FileStorage


class Level4Tests(unittest.TestCase):
    def testLevel4_rollback_restores_state(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100)
        fs.file_upload_at(20, "b", 200)
        fs.file_upload_at(30, "c", 300)
        fs.rollback(25)
        self.assertEqual(fs.file_get_at(25, "a"), 100)
        self.assertEqual(fs.file_get_at(25, "b"), 200)
        self.assertIsNone(fs.file_get_at(25, "c"))

    def testLevel4_rollback_removes_files_expired_by_target(self):
        fs = FileStorage()
        fs.file_upload_at(10, "short", 100, ttl=5)   # expires at 15
        fs.file_upload_at(10, "long", 200, ttl=100)
        fs.rollback(50)
        self.assertIsNone(fs.file_get_at(50, "short"))
        self.assertEqual(fs.file_get_at(50, "long"), 200)

    def testLevel4_rollback_keeps_files_alive_at_target(self):
        fs = FileStorage()
        fs.file_upload_at(10, "a", 100, ttl=20)   # expires at 30
        fs.file_upload_at(40, "later", 200)
        fs.rollback(25)
        # a alive at 25 -> still expires at 30
        self.assertEqual(fs.file_get_at(28, "a"), 100)
        self.assertIsNone(fs.file_get_at(30, "a"))
        # 'later' is after target -> gone
        self.assertIsNone(fs.file_get_at(25, "later"))

    def testLevel4_rollback_replays_copies(self):
        fs = FileStorage()
        fs.file_upload_at(10, "src", 100)
        fs.file_copy_at(15, "src", "dst")
        fs.file_upload_at(20, "extra", 50)
        fs.rollback(18)
        self.assertEqual(fs.file_get_at(18, "dst"), 100)
        self.assertIsNone(fs.file_get_at(18, "extra"))
`;

export default {
  id: "mock-files-4",
  title: "File Storage — 4-level Mock",
  domain: "File Storage · TTL · Rollback",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "FileStorage",
  pointsPerLevel: 250,
  blurb:
    "exam-faithful 4-level mock. file CRUD → prefix search (top 10) → timestamps + TTL in seconds → rollback that recomputes TTLs. " +
    "Mirrors a public file-storage practice repo. " +
    "Note: this archetype's TTL is in SECONDS — the Banking mock uses milliseconds. Don't confuse them.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Upload, Get, Copy", points: 250, mode: "sync",
      changed: "Three core methods. snake_case names map to the original SCREAMING_CASE FILE_UPLOAD / FILE_GET / FILE_COPY.",
      spec: `# Level 1 — Upload, Get, Copy

Build a file storage service. Method names use snake_case here; the original prompt uses the SCREAMING_CASE forms \`FILE_UPLOAD\`, \`FILE_GET\`, \`FILE_COPY\` — same semantics.

- \`file_upload(name, size)\` — return \`True\`, or \`False\` if \`name\` is already taken.
- \`file_get(name)\` — return the file's size, or \`None\` if no such file.
- \`file_copy(name_from, name_to)\` — return \`True\` on a successful copy; \`False\` if the source is missing. Copy **overwrites** an existing destination (this is the L1 contract for this archetype — it differs from the Cloud Storage variant).

> Design the file record with \`size\`, \`created_at\`, and \`expiry\` from day one — L3 retrofits all three.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Search by Prefix", points: 250, mode: "sync",
      changed: "Adds a single search returning **top 10** matches by size desc, name asc.",
      spec: `# Level 2 — Search by Prefix

Add:

- \`file_search(prefix)\` — return up to the **top 10** file names whose name starts with \`prefix\`, ordered by **size descending**, ties broken by **name ascending**.

\`\`\`
file_upload("dir/a", 100); file_upload("dir/b", 200); file_upload("other", 999)
file_search("dir/") -> ["dir/b", "dir/a"]
\`\`\``,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Timestamps & TTL (seconds)", points: 250, mode: "sync",
      changed: "**Refactor land.** Add a `_at` variant for every L1/L2 method; TTL is in **seconds**.",
      spec: `# Level 3 — Timestamps & TTL (seconds)

The hard pivot. Every method gets a timestamped variant; files can expire.

> **TTL is in seconds** in this archetype. (The Banking System mock uses milliseconds for its 24h cashback. Different archetypes pick different units — always read the spec.)

- \`file_upload_at(timestamp, name, size, ttl=None)\` — upload at \`timestamp\`. With a \`ttl\` (seconds), the file is **live** at times \`t\` where \`timestamp <= t < timestamp + ttl\`. With no \`ttl\`, it never expires. If a file with that name **is currently live** at \`timestamp\`, return \`False\`; if the previous one has already expired, allow the re-upload.
- \`file_get_at(timestamp, name)\` — return the size if live at \`timestamp\`, else \`None\`.
- \`file_copy_at(timestamp, name_from, name_to)\` — copy a live source. The copy keeps the source's existing expiry (so a copy of an about-to-expire file is also about to expire). Return \`False\` if the source is dead or missing.
- \`file_search_at(timestamp, prefix)\` — same as L2 but restricted to files live at \`timestamp\`.

> L1/L2 methods must keep passing.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Rollback", points: 250, mode: "sync",
      changed: "Capstone — rebuild storage at a past wall-clock and recompute every TTL.",
      spec: `# Level 4 — Rollback

Add a single method that replays history to a point in time:

- \`rollback(timestamp)\` — return the storage to the state it would have been in at \`timestamp\`. Any operation issued **after** \`timestamp\` is undone. TTLs are recomputed: a file that was alive at \`timestamp\` keeps its original \`(created_at, expiry)\` and so still expires at the same future moment; a file that had already expired by \`timestamp\` is gone.

**The design hint**

Record every L1/L3 mutation in an append-only history list of \`(timestamp, op_name, args)\`. \`rollback\` clears the live state, then replays every op whose timestamp is \`<= timestamp\`, skipping any upload whose computed \`expiry\` is at or before the rollback target.

> Implementations that try to "undo" without a history list end up rewriting half the class. Build the log in L1, free in L4.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
