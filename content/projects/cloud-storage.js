/* Cloud Storage Service — a 6-level progressive project (synchronous).
 * File CRUD → queries → users & quotas → timestamps/TTL → snapshots → owner
 * search & merge. */

const STARTER = `class CloudStorage:
    """A file hosting service. Files have a name and a size in bytes.
    Implement the methods below as you progress through the six levels."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def add_file(self, name, size):
        pass

    def get_file_size(self, name):
        pass

    def delete_file(self, name):
        pass

    def copy_file(self, src, dst):
        pass
`;

const SOL_1 = `class CloudStorage:
    def __init__(self):
        self._files = {}   # name -> {"size", "owner"}
        self._users = {}

    def add_file(self, name, size):
        if name in self._files:
            return False
        self._files[name] = {"size": size, "owner": None}
        return True

    def get_file_size(self, name):
        f = self._files.get(name)
        return f["size"] if f else None

    def delete_file(self, name):
        f = self._files.get(name)
        if f is None:
            return None
        if f["owner"] is not None and f["owner"] in self._users:
            self._users[f["owner"]]["used"] -= f["size"]
        del self._files[name]
        return f["size"]

    def copy_file(self, src, dst):
        s = self._files.get(src)
        if s is None or dst in self._files:
            return False
        self._files[dst] = {"size": s["size"], "owner": s["owner"]}
        return True
`;

const SOL_2 = SOL_1 + `
    def total_size(self):
        return sum(f["size"] for f in self._files.values())

    def find_by_prefix(self, prefix):
        return sorted(n for n in self._files if n.startswith(prefix))

    def largest_files(self, n):
        return sorted(self._files, key=lambda nm: (-self._files[nm]["size"], nm))[:n]
`;

const SOL_3 = SOL_2 + `
    def add_user(self, user_id, capacity):
        if user_id in self._users:
            return False
        self._users[user_id] = {"capacity": capacity, "used": 0}
        return True

    def add_file_by_user(self, user_id, name, size):
        user = self._users.get(user_id)
        if user is None or name in self._files:
            return None
        if user["used"] + size > user["capacity"]:
            return None
        self._files[name] = {"size": size, "owner": user_id}
        user["used"] += size
        return user["capacity"] - user["used"]

    def user_usage(self, user_id):
        user = self._users.get(user_id)
        return user["used"] if user else None
`;

/* Level 4 refactors the file record to carry an expiry. */
const SOL_4 = `import copy


class CloudStorage:
    def __init__(self):
        self._files = {}   # name -> {"size", "owner", "expiry"}
        self._users = {}
        self._snapshots = {}
        self._snap_id = 0

    def _live(self, f, timestamp):
        return f["expiry"] is None or timestamp < f["expiry"]

    def add_file(self, name, size):
        if name in self._files:
            return False
        self._files[name] = {"size": size, "owner": None, "expiry": None}
        return True

    def get_file_size(self, name):
        f = self._files.get(name)
        return f["size"] if f else None

    def delete_file(self, name):
        f = self._files.get(name)
        if f is None:
            return None
        if f["owner"] is not None and f["owner"] in self._users:
            self._users[f["owner"]]["used"] -= f["size"]
        del self._files[name]
        return f["size"]

    def copy_file(self, src, dst):
        s = self._files.get(src)
        if s is None or dst in self._files:
            return False
        self._files[dst] = {"size": s["size"], "owner": s["owner"], "expiry": s["expiry"]}
        return True

    def total_size(self):
        return sum(f["size"] for f in self._files.values())

    def find_by_prefix(self, prefix):
        return sorted(n for n in self._files if n.startswith(prefix))

    def largest_files(self, n):
        return sorted(self._files, key=lambda nm: (-self._files[nm]["size"], nm))[:n]

    def add_user(self, user_id, capacity):
        if user_id in self._users:
            return False
        self._users[user_id] = {"capacity": capacity, "used": 0}
        return True

    def add_file_by_user(self, user_id, name, size):
        user = self._users.get(user_id)
        if user is None or name in self._files:
            return None
        if user["used"] + size > user["capacity"]:
            return None
        self._files[name] = {"size": size, "owner": user_id, "expiry": None}
        user["used"] += size
        return user["capacity"] - user["used"]

    def user_usage(self, user_id):
        user = self._users.get(user_id)
        return user["used"] if user else None

    def add_file_at(self, name, size, timestamp, ttl=None):
        if name in self._files:
            return False
        expiry = None if ttl is None else timestamp + ttl
        self._files[name] = {"size": size, "owner": None, "expiry": expiry}
        return True

    def get_file_size_at(self, name, timestamp):
        f = self._files.get(name)
        if f is None or not self._live(f, timestamp):
            return None
        return f["size"]

    def find_by_prefix_at(self, prefix, timestamp):
        return sorted(n for n, f in self._files.items()
                      if n.startswith(prefix) and self._live(f, timestamp))

    def total_size_at(self, timestamp):
        return sum(f["size"] for f in self._files.values() if self._live(f, timestamp))
`;

const SOL_5 = SOL_4 + `
    def snapshot(self):
        self._snap_id += 1
        self._snapshots[self._snap_id] = copy.deepcopy({"files": self._files, "users": self._users})
        return self._snap_id

    def restore(self, snapshot_id):
        snap = self._snapshots.get(snapshot_id)
        if snap is None:
            return
        self._files = copy.deepcopy(snap["files"])
        self._users = copy.deepcopy(snap["users"])
`;

const SOL_6 = SOL_5 + `
    def find_files_by_owner(self, user_id):
        return sorted(n for n, f in self._files.items() if f["owner"] == user_id)

    def merge_storage(self, other):
        added = 0
        for name, f in other._files.items():
            if name not in self._files:
                self._files[name] = copy.deepcopy(f)
                added += 1
        return added
`;

const TESTS_1 = `import unittest
from solution import CloudStorage


class Level1Tests(unittest.TestCase):
    def testLevel1_add_file(self):
        self.assertTrue(CloudStorage().add_file("a.txt", 100))

    def testLevel1_add_duplicate_returns_false(self):
        cs = CloudStorage()
        cs.add_file("a.txt", 100)
        self.assertFalse(cs.add_file("a.txt", 50))

    def testLevel1_get_file_size(self):
        cs = CloudStorage()
        cs.add_file("a.txt", 100)
        self.assertEqual(cs.get_file_size("a.txt"), 100)
        self.assertIsNone(cs.get_file_size("missing"))

    def testLevel1_delete_returns_freed_size(self):
        cs = CloudStorage()
        cs.add_file("a.txt", 100)
        self.assertEqual(cs.delete_file("a.txt"), 100)
        self.assertIsNone(cs.get_file_size("a.txt"))

    def testLevel1_delete_missing_returns_none(self):
        self.assertIsNone(CloudStorage().delete_file("ghost"))

    def testLevel1_copy_file(self):
        cs = CloudStorage()
        cs.add_file("a.txt", 100)
        self.assertTrue(cs.copy_file("a.txt", "b.txt"))
        self.assertEqual(cs.get_file_size("b.txt"), 100)

    def testLevel1_copy_missing_or_existing(self):
        cs = CloudStorage()
        cs.add_file("a.txt", 100)
        self.assertFalse(cs.copy_file("ghost", "x.txt"))
        cs.add_file("b.txt", 5)
        self.assertFalse(cs.copy_file("a.txt", "b.txt"))
`;

const TESTS_2 = `import unittest
from solution import CloudStorage


class Level2Tests(unittest.TestCase):
    def _store(self):
        cs = CloudStorage()
        cs.add_file("docs_a", 30)
        cs.add_file("docs_b", 10)
        cs.add_file("img_c", 50)
        return cs

    def testLevel2_total_size(self):
        self.assertEqual(self._store().total_size(), 90)

    def testLevel2_find_by_prefix(self):
        self.assertEqual(self._store().find_by_prefix("docs"), ["docs_a", "docs_b"])

    def testLevel2_find_by_prefix_no_match(self):
        self.assertEqual(self._store().find_by_prefix("zzz"), [])

    def testLevel2_largest_files(self):
        self.assertEqual(self._store().largest_files(2), ["img_c", "docs_a"])

    def testLevel2_largest_files_tie_break_by_name(self):
        cs = CloudStorage()
        cs.add_file("z", 10)
        cs.add_file("a", 10)
        self.assertEqual(cs.largest_files(2), ["a", "z"])
`;

const TESTS_3 = `import unittest
from solution import CloudStorage


class Level3Tests(unittest.TestCase):
    def testLevel3_add_user(self):
        cs = CloudStorage()
        self.assertTrue(cs.add_user("u1", 100))
        self.assertFalse(cs.add_user("u1", 200))

    def testLevel3_add_file_by_user_returns_remaining(self):
        cs = CloudStorage()
        cs.add_user("u1", 100)
        self.assertEqual(cs.add_file_by_user("u1", "a", 60), 40)

    def testLevel3_rejects_over_capacity(self):
        cs = CloudStorage()
        cs.add_user("u1", 100)
        cs.add_file_by_user("u1", "a", 60)
        self.assertIsNone(cs.add_file_by_user("u1", "b", 50))
        self.assertEqual(cs.user_usage("u1"), 60)

    def testLevel3_rejects_duplicate_name(self):
        cs = CloudStorage()
        cs.add_user("u1", 100)
        cs.add_file_by_user("u1", "a", 10)
        self.assertIsNone(cs.add_file_by_user("u1", "a", 10))

    def testLevel3_missing_user(self):
        self.assertIsNone(CloudStorage().add_file_by_user("ghost", "a", 10))

    def testLevel3_user_usage(self):
        cs = CloudStorage()
        cs.add_user("u1", 500)
        cs.add_file_by_user("u1", "a", 30)
        cs.add_file_by_user("u1", "b", 70)
        self.assertEqual(cs.user_usage("u1"), 100)
`;

const TESTS_4 = `import unittest
from solution import CloudStorage


class Level4Tests(unittest.TestCase):
    def testLevel4_add_and_get_at(self):
        cs = CloudStorage()
        cs.add_file_at("a", 10, 0)
        self.assertEqual(cs.get_file_size_at("a", 5), 10)

    def testLevel4_ttl_expires(self):
        cs = CloudStorage()
        cs.add_file_at("a", 10, 0, 100)
        self.assertEqual(cs.get_file_size_at("a", 99), 10)
        self.assertIsNone(cs.get_file_size_at("a", 100))

    def testLevel4_find_by_prefix_at_excludes_expired(self):
        cs = CloudStorage()
        cs.add_file_at("doc_keep", 10, 0)
        cs.add_file_at("doc_gone", 10, 0, 5)
        self.assertEqual(cs.find_by_prefix_at("doc", 10), ["doc_keep"])

    def testLevel4_total_size_at_excludes_expired(self):
        cs = CloudStorage()
        cs.add_file_at("a", 100, 0)
        cs.add_file_at("b", 50, 0, 5)
        self.assertEqual(cs.total_size_at(10), 100)

    def testLevel4_level1_methods_still_work(self):
        cs = CloudStorage()
        cs.add_file("a", 40)
        self.assertEqual(cs.get_file_size("a"), 40)
        self.assertEqual(cs.delete_file("a"), 40)
`;

const TESTS_5 = `import unittest
from solution import CloudStorage


class Level5Tests(unittest.TestCase):
    def testLevel5_snapshot_and_restore(self):
        cs = CloudStorage()
        cs.add_file("a", 10)
        sid = cs.snapshot()
        cs.add_file("b", 20)
        cs.restore(sid)
        self.assertEqual(cs.get_file_size("a"), 10)
        self.assertIsNone(cs.get_file_size("b"))

    def testLevel5_restore_unknown_is_noop(self):
        cs = CloudStorage()
        cs.add_file("a", 10)
        cs.restore(999)
        self.assertEqual(cs.get_file_size("a"), 10)

    def testLevel5_restore_reverts_deletes(self):
        cs = CloudStorage()
        cs.add_file("a", 10)
        sid = cs.snapshot()
        cs.delete_file("a")
        cs.restore(sid)
        self.assertEqual(cs.get_file_size("a"), 10)
`;

const TESTS_6 = `import unittest
from solution import CloudStorage


class Level6Tests(unittest.TestCase):
    def testLevel6_find_files_by_owner(self):
        cs = CloudStorage()
        cs.add_user("u1", 1000)
        cs.add_user("u2", 1000)
        cs.add_file_by_user("u1", "b", 10)
        cs.add_file_by_user("u1", "a", 10)
        cs.add_file_by_user("u2", "c", 10)
        self.assertEqual(cs.find_files_by_owner("u1"), ["a", "b"])

    def testLevel6_find_files_by_owner_none(self):
        cs = CloudStorage()
        cs.add_file("a", 10)
        self.assertEqual(cs.find_files_by_owner("nobody"), [])

    def testLevel6_merge_storage_adds_new_files(self):
        a = CloudStorage()
        a.add_file("x", 10)
        b = CloudStorage()
        b.add_file("y", 20)
        b.add_file("z", 30)
        self.assertEqual(a.merge_storage(b), 2)
        self.assertEqual(a.get_file_size("y"), 20)

    def testLevel6_merge_storage_skips_conflicts(self):
        a = CloudStorage()
        a.add_file("x", 10)
        b = CloudStorage()
        b.add_file("x", 999)
        b.add_file("new", 5)
        self.assertEqual(a.merge_storage(b), 1)
        self.assertEqual(a.get_file_size("x"), 10)
`;

export default {
  id: "cloud-storage",
  title: "Cloud Storage Service",
  domain: "File Hosting",
  kind: "practice",
  implFile: "solution.py",
  className: "CloudStorage",
  pointsPerLevel: 100,
  blurb: "A file hosting service — CRUD, prefix search, user quotas, TTL, snapshots, and owner search.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "File Operations", points: 100, mode: "sync",
      changed: "The core file operations.",
      spec: `# Level 1 — File Operations

Implement on \`CloudStorage\`:

- \`add_file(name, size)\` — \`True\`, or \`False\` if a file with that name exists.
- \`get_file_size(name)\` — the file's size, or \`None\`.
- \`delete_file(name)\` — remove the file; return the size it freed, or \`None\` if absent.
- \`copy_file(src, dst)\` — copy \`src\` to a new name \`dst\`. \`False\` if \`src\` is missing or \`dst\` already exists.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Queries", points: 100, mode: "sync",
      changed: "Adds aggregate size, prefix search, and a largest-files ranking.",
      spec: `# Level 2 — Queries

Add:

- \`total_size()\` — the combined size of every file.
- \`find_by_prefix(prefix)\` — a **sorted** list of file names beginning with \`prefix\`.
- \`largest_files(n)\` — the \`n\` largest files by size **descending**, ties by **name ascending**.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Users & Quotas", points: 100, mode: "sync",
      changed: "Adds users with storage capacity limits.",
      spec: `# Level 3 — Users & Quotas

Add:

- \`add_user(user_id, capacity)\` — \`True\`, or \`False\` if the user exists.
- \`add_file_by_user(user_id, name, size)\` — add a file owned by the user. Return the user's **remaining capacity**, or \`None\` if the user is missing, the file name is taken, or the file would exceed capacity (changing nothing).
- \`user_usage(user_id)\` — total bytes the user is storing, or \`None\`.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Timestamps & TTL", points: 100, mode: "sync",
      changed: "Adds timestamped uploads and time-to-live — and refactors the file record.",
      spec: `# Level 4 — Timestamps & TTL

Files can now be uploaded at a point in time, with an optional lifetime.

- \`add_file_at(name, size, timestamp, ttl=None)\` — add a file; with a \`ttl\` it is **live** only for timestamps \`t\` where \`t < timestamp + ttl\`.
- \`get_file_size_at(name, timestamp)\` — the size if the file is live at \`timestamp\`, else \`None\`.
- \`find_by_prefix_at(prefix, timestamp)\` and \`total_size_at(timestamp)\` — the Level 2 queries, restricted to files live at \`timestamp\`.

**The refactor**: the file record gains an \`expiry\`. Your Level 1–3 methods must keep passing — a plainly-added file simply never expires.`,
      tests: TESTS_4, solution: SOL_4,
    },
    {
      n: 5, title: "Snapshots", points: 100, mode: "sync",
      changed: "Adds whole-system snapshot and restore.",
      spec: `# Level 5 — Snapshots

Add:

- \`snapshot()\` — save the entire state (files and users); return an integer id.
- \`restore(snapshot_id)\` — revert everything to that snapshot; do nothing for an unknown id.

Snapshot with \`copy.deepcopy\` so later changes never leak into a saved snapshot.`,
      tests: TESTS_5, solution: SOL_5,
    },
    {
      n: 6, title: "Owner Search & Merge", points: 100, mode: "sync",
      changed: "Adds per-owner search and merging another storage system.",
      spec: `# Level 6 — Owner Search & Merge

Add:

- \`find_files_by_owner(user_id)\` — a **sorted** list of the file names owned by \`user_id\`.
- \`merge_storage(other)\` — graft another \`CloudStorage\`'s files into this one. A file whose name already exists here is **skipped**. Return the number of files actually added.`,
      tests: TESTS_6, solution: SOL_6,
    },
  ],
};
