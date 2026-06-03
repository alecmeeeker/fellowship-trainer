/* mock-cloud-4 — Cloud Storage, 4-level assessment variant.
 *
 * Adapted from public practice repos and candidate writeups. The four-level arc:
 *   L1 — add_file / copy_file / get_file_size
 *   L2 — find_by_prefix / find_by_suffix (top-10 by size desc, name tie-break)
 *   L3 — add_user / add_file_by / update_capacity (largest-first eviction)
 *   L4 — compress_file / decompress_file (reduces size; quota recomputed)
 *
 * Public sources are loose on the exact compression ratio — they describe it
 * as "reduces size, e.g. by half." Tests pin a 50% reduction so candidates
 * have a deterministic spec to code against; the spec text explains this.
 */

const STARTER = `class CloudStorage:
    """A cloud file storage service — a common multi-level assessment archetype.

    Build the four levels in order — every later level keeps the earlier
    methods working.
    """

    def __init__(self):
        # TODO: design storage so L3 (users + quotas) and L4 (compression)
        # don't force a rewrite.
        pass

    def add_file(self, name, size):
        pass

    def copy_file(self, name_from, name_to):
        pass

    def get_file_size(self, name):
        pass
`;

const SOL_1 = `class CloudStorage:
    def __init__(self):
        self._files = {}  # name -> {"size": int, "owner": str | None, "compressed": bool}

    def add_file(self, name, size):
        if name in self._files:
            return False
        self._files[name] = {"size": size, "owner": None, "compressed": False}
        return True

    def copy_file(self, name_from, name_to):
        if name_from not in self._files or name_to in self._files:
            return False
        src = self._files[name_from]
        self._files[name_to] = {"size": src["size"], "owner": src["owner"], "compressed": src["compressed"]}
        return True

    def get_file_size(self, name):
        f = self._files.get(name)
        return None if f is None else f["size"]
`;

const SOL_2 = SOL_1 + `
    def find_by_prefix(self, prefix):
        matches = [(name, info) for name, info in self._files.items() if name.startswith(prefix)]
        matches.sort(key=lambda kv: (-kv[1]["size"], kv[0]))
        return [name for name, _ in matches[:10]]

    def find_by_suffix(self, suffix):
        matches = [(name, info) for name, info in self._files.items() if name.endswith(suffix)]
        matches.sort(key=lambda kv: (-kv[1]["size"], kv[0]))
        return [name for name, _ in matches[:10]]
`;

const SOL_3 = SOL_2 + `
    # ---- L3 users + quotas ----
    def _ensure_users(self):
        if not hasattr(self, "_users"):
            self._users = {}  # user_id -> capacity (max bytes)

    def _user_usage(self, user_id):
        return sum(info["size"] for info in self._files.values() if info["owner"] == user_id)

    def add_user(self, user_id, capacity):
        self._ensure_users()
        if user_id in self._users:
            return False
        self._users[user_id] = capacity
        return True

    def add_file_by(self, user_id, name, size):
        self._ensure_users()
        if user_id not in self._users:
            return None
        if name in self._files:
            return None
        if self._user_usage(user_id) + size > self._users[user_id]:
            return None
        self._files[name] = {"size": size, "owner": user_id, "compressed": False}
        return self._users[user_id] - self._user_usage(user_id)

    def update_capacity(self, user_id, new_capacity):
        self._ensure_users()
        if user_id not in self._users:
            return None
        self._users[user_id] = new_capacity
        evicted = []
        # evict largest-first; tie break by lex-larger name first
        while self._user_usage(user_id) > new_capacity:
            owned = [(name, info["size"]) for name, info in self._files.items() if info["owner"] == user_id]
            # largest first; ties broken by lex-larger name first (negate each char's ordinal)
            owned.sort(key=lambda kv: (-kv[1], [-ord(c) for c in kv[0]]))
            name_to_evict = owned[0][0]
            evicted.append(name_to_evict)
            del self._files[name_to_evict]
        return evicted
`;

const SOL_4 = SOL_3 + `
    # ---- L4 compression ----
    def compress_file(self, name):
        if name not in self._files:
            return None
        info = self._files[name]
        if info["compressed"]:
            return None
        info["compressed"] = True
        info["size"] = info["size"] // 2
        return info["size"]

    def decompress_file(self, name):
        if name not in self._files:
            return None
        info = self._files[name]
        if not info["compressed"]:
            return None
        info["compressed"] = False
        info["size"] = info["size"] * 2
        return info["size"]
`;

const TESTS_1 = `import unittest
from solution import CloudStorage


class Level1Tests(unittest.TestCase):
    def testLevel1_add_file_unique(self):
        s = CloudStorage()
        self.assertTrue(s.add_file("a.txt", 100))
        self.assertFalse(s.add_file("a.txt", 200))

    def testLevel1_get_file_size(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        self.assertEqual(s.get_file_size("a.txt"), 100)
        self.assertIsNone(s.get_file_size("missing"))

    def testLevel1_copy_file_basic(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        self.assertTrue(s.copy_file("a.txt", "b.txt"))
        self.assertEqual(s.get_file_size("a.txt"), 100)
        self.assertEqual(s.get_file_size("b.txt"), 100)

    def testLevel1_copy_missing_source_false(self):
        s = CloudStorage()
        self.assertFalse(s.copy_file("ghost", "b.txt"))

    def testLevel1_copy_existing_dest_false(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        s.add_file("b.txt", 50)
        self.assertFalse(s.copy_file("a.txt", "b.txt"))
        self.assertEqual(s.get_file_size("b.txt"), 50)
`;

const TESTS_2 = `import unittest
from solution import CloudStorage


class Level2Tests(unittest.TestCase):
    def testLevel2_prefix_basic(self):
        s = CloudStorage()
        s.add_file("dir/a.txt", 100)
        s.add_file("dir/b.txt", 200)
        s.add_file("other.txt", 50)
        self.assertEqual(s.find_by_prefix("dir/"), ["dir/b.txt", "dir/a.txt"])

    def testLevel2_prefix_no_match(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        self.assertEqual(s.find_by_prefix("dir/"), [])

    def testLevel2_prefix_ties_sort_by_name_asc(self):
        s = CloudStorage()
        s.add_file("dir/a", 100)
        s.add_file("dir/b", 100)
        s.add_file("dir/c", 100)
        self.assertEqual(s.find_by_prefix("dir/"), ["dir/a", "dir/b", "dir/c"])

    def testLevel2_prefix_caps_at_10(self):
        s = CloudStorage()
        for i in range(15):
            s.add_file("f" + str(i).zfill(2), 100 - i)  # f00=100, f01=99, ...
        result = s.find_by_prefix("f")
        self.assertEqual(len(result), 10)
        self.assertEqual(result[0], "f00")
        self.assertEqual(result[9], "f09")

    def testLevel2_suffix_basic(self):
        s = CloudStorage()
        s.add_file("a.txt", 50)
        s.add_file("b.txt", 100)
        s.add_file("c.md", 200)
        self.assertEqual(s.find_by_suffix(".txt"), ["b.txt", "a.txt"])
`;

const TESTS_3 = `import unittest
from solution import CloudStorage


class Level3Tests(unittest.TestCase):
    def testLevel3_add_user_unique(self):
        s = CloudStorage()
        self.assertTrue(s.add_user("alice", 1000))
        self.assertFalse(s.add_user("alice", 999))

    def testLevel3_add_file_by_returns_remaining(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        self.assertEqual(s.add_file_by("alice", "a.txt", 300), 700)
        self.assertEqual(s.add_file_by("alice", "b.txt", 200), 500)

    def testLevel3_add_file_by_exceeds_capacity_none(self):
        s = CloudStorage()
        s.add_user("alice", 100)
        self.assertIsNone(s.add_file_by("alice", "big.txt", 200))
        self.assertIsNone(s.get_file_size("big.txt"))

    def testLevel3_add_file_by_unknown_user_none(self):
        s = CloudStorage()
        self.assertIsNone(s.add_file_by("ghost", "a.txt", 10))

    def testLevel3_add_file_by_duplicate_name_none(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        s.add_file_by("alice", "a.txt", 100)
        self.assertIsNone(s.add_file_by("alice", "a.txt", 200))

    def testLevel3_update_capacity_no_eviction(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        s.add_file_by("alice", "a.txt", 100)
        self.assertEqual(s.update_capacity("alice", 500), [])

    def testLevel3_update_capacity_evicts_largest_first(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        s.add_file_by("alice", "small", 100)
        s.add_file_by("alice", "big", 500)
        s.add_file_by("alice", "medium", 300)
        # total = 900, set capacity to 200: must evict big (500) and medium (300)
        evicted = s.update_capacity("alice", 200)
        self.assertEqual(evicted, ["big", "medium"])
        self.assertIsNone(s.get_file_size("big"))
        self.assertEqual(s.get_file_size("small"), 100)

    def testLevel3_update_capacity_lex_larger_name_first_on_ties(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        s.add_file_by("alice", "alpha", 200)
        s.add_file_by("alice", "zulu", 200)
        # total = 400, capacity 150: must evict both, but zulu (lex larger) first
        evicted = s.update_capacity("alice", 150)
        self.assertEqual(evicted, ["zulu", "alpha"])

    def testLevel3_update_capacity_unknown_user_none(self):
        s = CloudStorage()
        self.assertIsNone(s.update_capacity("ghost", 500))
`;

const TESTS_4 = `import unittest
from solution import CloudStorage


class Level4Tests(unittest.TestCase):
    def testLevel4_compress_returns_new_size(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        self.assertEqual(s.compress_file("a.txt"), 50)
        self.assertEqual(s.get_file_size("a.txt"), 50)

    def testLevel4_decompress_restores_size(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        s.compress_file("a.txt")
        self.assertEqual(s.decompress_file("a.txt"), 100)
        self.assertEqual(s.get_file_size("a.txt"), 100)

    def testLevel4_compress_already_compressed_none(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        s.compress_file("a.txt")
        self.assertIsNone(s.compress_file("a.txt"))

    def testLevel4_decompress_not_compressed_none(self):
        s = CloudStorage()
        s.add_file("a.txt", 100)
        self.assertIsNone(s.decompress_file("a.txt"))

    def testLevel4_compress_missing_file_none(self):
        s = CloudStorage()
        self.assertIsNone(s.compress_file("ghost"))
        self.assertIsNone(s.decompress_file("ghost"))

    def testLevel4_compression_affects_user_quota(self):
        s = CloudStorage()
        s.add_user("alice", 1000)
        s.add_file_by("alice", "big.txt", 800)
        # alice has 200 left
        self.assertIsNone(s.add_file_by("alice", "second.txt", 300))
        # compress big.txt -> 400. alice now has 600 left
        self.assertEqual(s.compress_file("big.txt"), 400)
        self.assertEqual(s.add_file_by("alice", "second.txt", 300), 300)
`;

export default {
  id: "mock-cloud-4",
  title: "Cloud Storage — 4-level Mock",
  domain: "File Hosting · Quotas",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "CloudStorage",
  pointsPerLevel: 250,
  blurb:
    "exam-faithful 4-level mock. File CRUD → prefix & suffix search → users with quotas (largest-first eviction) → compress / decompress with quota recompute. " +
    "Built from public assessment writeups. " +
    "Note: public sources describe L4 compression as 'reduces size' — these tests pin it to a 50% reduction so the spec is testable.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "File Operations", points: 250, mode: "sync",
      changed: "Three core methods. No users, no timestamps yet.",
      spec: `# Level 1 — File Operations

Implement on \`CloudStorage\`:

- \`add_file(name, size)\` — return \`True\`, or \`False\` if a file with that name already exists.
- \`copy_file(name_from, name_to)\` — copy \`name_from\` to \`name_to\`. Return \`False\` if \`name_from\` does not exist or \`name_to\` is already taken; \`True\` otherwise.
- \`get_file_size(name)\` — return the file's size, or \`None\` if no such file.

> **Design with L3/L4 in mind.** L3 adds an \`owner\` field and quota tracking; L4 adds a \`compressed\` flag and changes the stored size. Build the file record with those fields from day one.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Prefix & Suffix Search", points: 250, mode: "sync",
      changed: "Two ranking queries returning the **top 10** by size, name tie-break.",
      spec: `# Level 2 — Prefix & Suffix Search

Add two queries — both return at most the **top 10** matching files, ordered by **size descending**, ties broken by **name ascending**.

- \`find_by_prefix(prefix)\` — file names whose name starts with \`prefix\`.
- \`find_by_suffix(suffix)\` — file names whose name ends with \`suffix\`.

**Examples**

\`\`\`
add_file("dir/a.txt", 100)
add_file("dir/b.txt", 200)
find_by_prefix("dir/")  -> ["dir/b.txt", "dir/a.txt"]
find_by_suffix(".txt")  -> ["dir/b.txt", "dir/a.txt"]
\`\`\``,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Users & Quotas", points: 250, mode: "sync",
      changed: "**Refactor land.** Files gain an owner; users have capacity; shrinking capacity evicts the largest files first.",
      spec: `# Level 3 — Users & Quotas

Add per-user storage with hard quotas.

- \`add_user(user_id, capacity)\` — return \`True\`, or \`False\` if the user already exists.
- \`add_file_by(user_id, name, size)\` — add a file owned by \`user_id\`. Return the user's **remaining capacity** after the add, or \`None\` if the user is missing, the file name is taken, or the file would push the user over their capacity (changing nothing).
- \`update_capacity(user_id, new_capacity)\` — set the user's capacity to a new value. If their current usage exceeds the new limit, **evict the user's largest files first** until they are at or under capacity. Return the list of evicted file names **in eviction order**. Return \`None\` if the user does not exist. Tie-breakers on equal sizes: the **lexicographically larger name is evicted first**.

> Files added by \`add_file\` (L1) have no owner; they don't count against any user.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Compression", points: 250, mode: "sync",
      changed: "Capstone — compress/decompress files; quota usage must reflect the live size.",
      spec: `# Level 4 — Compression

Add file compression. **A compressed file's size is half the original** (integer division), and quota recomputation must use the live size.

- \`compress_file(name)\` — compress the file. Return the new size, or \`None\` if the file does not exist or is already compressed.
- \`decompress_file(name)\` — restore the file to its original size. Return the new size, or \`None\` if the file does not exist or is not currently compressed.

**Quota interaction**

After compression, the file occupies less of its owner's quota — newly added files can fit where they couldn't before. Decompression doubles the size back; if the user is then over capacity, that's their problem on the **next** \`update_capacity\` (decompression itself does not trigger eviction).

> Public assessment prompts describe L4 as a "reduces size" capstone with the exact ratio left to the test cases. This mock pins it to 50% so you can code against a deterministic spec — when you sit the real exam, read the test output first.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
