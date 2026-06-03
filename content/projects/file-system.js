/* In-Memory File System — a 6-level progressive project (synchronous).
 * Files & directories → listing → recursive search → temp-file TTL →
 * snapshots → move & copy. */

const STARTER = `class FileSystem:
    """An in-memory file system. Paths look like '/dir/file'. The root is '/'.
    Implement the methods below as you progress through the six levels."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def create_file(self, path, content=""):
        pass

    def make_dir(self, path):
        pass

    def read_file(self, path):
        pass

    def delete(self, path):
        pass
`;

const SOL_1 = `class FileSystem:
    def __init__(self):
        self._root = {"type": "dir", "children": {}}

    def _split(self, path):
        return [p for p in path.split("/") if p]

    def _resolve(self, path):
        node = self._root
        for part in self._split(path):
            if node["type"] != "dir" or part not in node["children"]:
                return None
            node = node["children"][part]
        return node

    def _parent(self, path):
        parts = self._split(path)
        if not parts:
            return None, None
        return self._resolve("/".join(parts[:-1])), parts[-1]

    def create_file(self, path, content=""):
        parent, name = self._parent(path)
        if parent is None or parent["type"] != "dir" or name in parent["children"]:
            return False
        parent["children"][name] = {"type": "file", "content": content}
        return True

    def make_dir(self, path):
        parent, name = self._parent(path)
        if parent is None or parent["type"] != "dir" or name in parent["children"]:
            return False
        parent["children"][name] = {"type": "dir", "children": {}}
        return True

    def read_file(self, path):
        node = self._resolve(path)
        if node is None or node["type"] != "file":
            return None
        return node["content"]

    def delete(self, path):
        parent, name = self._parent(path)
        if parent is None or name not in parent["children"]:
            return False
        node = parent["children"][name]
        if node["type"] == "dir" and node["children"]:
            return False
        del parent["children"][name]
        return True
`;

const SOL_2 = SOL_1 + `
    def list_dir(self, path):
        node = self._resolve(path)
        if node is None or node["type"] != "dir":
            return []
        return sorted(node["children"].keys())

    def write_file(self, path, content):
        node = self._resolve(path)
        if node is None or node["type"] != "file":
            return False
        node["content"] = content
        return True

    def exists(self, path):
        return self._resolve(path) is not None
`;

const SOL_3 = SOL_2 + `
    def _walk(self, node, path, out):
        for name, child in node["children"].items():
            child_path = path + "/" + name
            out.append((child_path, child))
            if child["type"] == "dir":
                self._walk(child, child_path, out)

    def _usage(self, node):
        if node["type"] == "file":
            return len(node["content"])
        return sum(self._usage(c) for c in node["children"].values())

    def find(self, name):
        out = []
        self._walk(self._root, "", out)
        return sorted(p for p, node in out if p.split("/")[-1] == name)

    def disk_usage(self, path):
        node = self._resolve(path)
        return self._usage(node) if node is not None else 0

    def largest_files(self, n):
        out = []
        self._walk(self._root, "", out)
        files = [(p, len(node["content"])) for p, node in out if node["type"] == "file"]
        files.sort(key=lambda x: (-x[1], x[0]))
        return [p for p, _ in files[:n]]
`;

/* Level 4 gives file nodes an expiry. */
const SOL_4 = `import copy


class FileSystem:
    def __init__(self):
        self._root = {"type": "dir", "children": {}}
        self._snapshots = {}
        self._snap_id = 0

    def _split(self, path):
        return [p for p in path.split("/") if p]

    def _resolve(self, path):
        node = self._root
        for part in self._split(path):
            if node["type"] != "dir" or part not in node["children"]:
                return None
            node = node["children"][part]
        return node

    def _parent(self, path):
        parts = self._split(path)
        if not parts:
            return None, None
        return self._resolve("/".join(parts[:-1])), parts[-1]

    def _live(self, node, timestamp):
        if node["type"] != "file":
            return True
        return node.get("expiry") is None or timestamp < node["expiry"]

    def _walk(self, node, path, out):
        for name, child in node["children"].items():
            child_path = path + "/" + name
            out.append((child_path, child))
            if child["type"] == "dir":
                self._walk(child, child_path, out)

    def _usage(self, node):
        if node["type"] == "file":
            return len(node["content"])
        return sum(self._usage(c) for c in node["children"].values())

    def create_file(self, path, content=""):
        parent, name = self._parent(path)
        if parent is None or parent["type"] != "dir" or name in parent["children"]:
            return False
        parent["children"][name] = {"type": "file", "content": content, "expiry": None}
        return True

    def make_dir(self, path):
        parent, name = self._parent(path)
        if parent is None or parent["type"] != "dir" or name in parent["children"]:
            return False
        parent["children"][name] = {"type": "dir", "children": {}}
        return True

    def read_file(self, path):
        node = self._resolve(path)
        if node is None or node["type"] != "file":
            return None
        return node["content"]

    def delete(self, path):
        parent, name = self._parent(path)
        if parent is None or name not in parent["children"]:
            return False
        node = parent["children"][name]
        if node["type"] == "dir" and node["children"]:
            return False
        del parent["children"][name]
        return True

    def list_dir(self, path):
        node = self._resolve(path)
        if node is None or node["type"] != "dir":
            return []
        return sorted(node["children"].keys())

    def write_file(self, path, content):
        node = self._resolve(path)
        if node is None or node["type"] != "file":
            return False
        node["content"] = content
        return True

    def exists(self, path):
        return self._resolve(path) is not None

    def find(self, name):
        out = []
        self._walk(self._root, "", out)
        return sorted(p for p, node in out if p.split("/")[-1] == name)

    def disk_usage(self, path):
        node = self._resolve(path)
        return self._usage(node) if node is not None else 0

    def largest_files(self, n):
        out = []
        self._walk(self._root, "", out)
        files = [(p, len(node["content"])) for p, node in out if node["type"] == "file"]
        files.sort(key=lambda x: (-x[1], x[0]))
        return [p for p, _ in files[:n]]

    def create_file_at(self, path, content, timestamp, ttl=None):
        parent, name = self._parent(path)
        if parent is None or parent["type"] != "dir" or name in parent["children"]:
            return False
        expiry = None if ttl is None else timestamp + ttl
        parent["children"][name] = {"type": "file", "content": content, "expiry": expiry}
        return True

    def read_file_at(self, path, timestamp):
        node = self._resolve(path)
        if node is None or node["type"] != "file" or not self._live(node, timestamp):
            return None
        return node["content"]

    def list_dir_at(self, path, timestamp):
        node = self._resolve(path)
        if node is None or node["type"] != "dir":
            return []
        return sorted(name for name, child in node["children"].items()
                      if self._live(child, timestamp))
`;

const SOL_5 = SOL_4 + `
    def snapshot(self):
        self._snap_id += 1
        self._snapshots[self._snap_id] = copy.deepcopy(self._root)
        return self._snap_id

    def restore(self, snapshot_id):
        snap = self._snapshots.get(snapshot_id)
        if snap is None:
            return
        self._root = copy.deepcopy(snap)
`;

const SOL_6 = SOL_5 + `
    def move(self, src, dst):
        sp, sname = self._parent(src)
        if sp is None or sname not in sp["children"]:
            return False
        dp, dname = self._parent(dst)
        if dp is None or dp["type"] != "dir" or dname in dp["children"]:
            return False
        dp["children"][dname] = sp["children"].pop(sname)
        return True

    def copy(self, src, dst):
        node = self._resolve(src)
        if node is None:
            return False
        dp, dname = self._parent(dst)
        if dp is None or dp["type"] != "dir" or dname in dp["children"]:
            return False
        dp["children"][dname] = copy.deepcopy(node)
        return True
`;

const TESTS_1 = `import unittest
from solution import FileSystem


class Level1Tests(unittest.TestCase):
    def testLevel1_create_and_read_file(self):
        fs = FileSystem()
        self.assertTrue(fs.create_file("/notes.txt", "hello"))
        self.assertEqual(fs.read_file("/notes.txt"), "hello")

    def testLevel1_create_file_missing_parent(self):
        fs = FileSystem()
        self.assertFalse(fs.create_file("/nodir/x.txt", "x"))

    def testLevel1_create_duplicate_path(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "1")
        self.assertFalse(fs.create_file("/a.txt", "2"))

    def testLevel1_make_dir_and_nest(self):
        fs = FileSystem()
        self.assertTrue(fs.make_dir("/docs"))
        self.assertTrue(fs.create_file("/docs/a.txt", "inside"))
        self.assertEqual(fs.read_file("/docs/a.txt"), "inside")

    def testLevel1_read_missing_or_dir(self):
        fs = FileSystem()
        fs.make_dir("/docs")
        self.assertIsNone(fs.read_file("/missing"))
        self.assertIsNone(fs.read_file("/docs"))

    def testLevel1_delete_file(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "x")
        self.assertTrue(fs.delete("/a.txt"))
        self.assertIsNone(fs.read_file("/a.txt"))

    def testLevel1_delete_nonempty_dir_fails(self):
        fs = FileSystem()
        fs.make_dir("/docs")
        fs.create_file("/docs/a.txt", "x")
        self.assertFalse(fs.delete("/docs"))
        self.assertTrue(fs.delete("/docs/a.txt"))
        self.assertTrue(fs.delete("/docs"))

    def testLevel1_delete_missing(self):
        self.assertFalse(FileSystem().delete("/ghost"))
`;

const TESTS_2 = `import unittest
from solution import FileSystem


class Level2Tests(unittest.TestCase):
    def testLevel2_list_dir_sorted(self):
        fs = FileSystem()
        fs.create_file("/c.txt", "")
        fs.create_file("/a.txt", "")
        fs.make_dir("/b")
        self.assertEqual(fs.list_dir("/"), ["a.txt", "b", "c.txt"])

    def testLevel2_list_dir_non_dir(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "")
        self.assertEqual(fs.list_dir("/a.txt"), [])
        self.assertEqual(fs.list_dir("/missing"), [])

    def testLevel2_write_file_overwrites(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "old")
        self.assertTrue(fs.write_file("/a.txt", "new"))
        self.assertEqual(fs.read_file("/a.txt"), "new")

    def testLevel2_write_file_missing(self):
        self.assertFalse(FileSystem().write_file("/ghost", "x"))

    def testLevel2_exists(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "")
        self.assertTrue(fs.exists("/a.txt"))
        self.assertTrue(fs.exists("/"))
        self.assertFalse(fs.exists("/ghost"))
`;

const TESTS_3 = `import unittest
from solution import FileSystem


class Level3Tests(unittest.TestCase):
    def _fs(self):
        fs = FileSystem()
        fs.create_file("/readme.txt", "root file")
        fs.make_dir("/docs")
        fs.create_file("/docs/readme.txt", "ab")
        fs.create_file("/docs/big.txt", "abcdefghij")
        return fs

    def testLevel3_find_recursive(self):
        self.assertEqual(self._fs().find("readme.txt"),
                         ["/docs/readme.txt", "/readme.txt"])

    def testLevel3_find_no_match(self):
        self.assertEqual(self._fs().find("nope.txt"), [])

    def testLevel3_disk_usage_subtree(self):
        fs = self._fs()
        self.assertEqual(fs.disk_usage("/docs"), 12)

    def testLevel3_disk_usage_root(self):
        fs = self._fs()
        self.assertEqual(fs.disk_usage("/"), 21)

    def testLevel3_largest_files(self):
        self.assertEqual(self._fs().largest_files(2),
                         ["/docs/big.txt", "/readme.txt"])
`;

const TESTS_4 = `import unittest
from solution import FileSystem


class Level4Tests(unittest.TestCase):
    def testLevel4_create_and_read_at(self):
        fs = FileSystem()
        fs.create_file_at("/a.txt", "hi", 0)
        self.assertEqual(fs.read_file_at("/a.txt", 5), "hi")

    def testLevel4_temp_file_expires(self):
        fs = FileSystem()
        fs.create_file_at("/tmp.txt", "x", 0, 10)
        self.assertEqual(fs.read_file_at("/tmp.txt", 9), "x")
        self.assertIsNone(fs.read_file_at("/tmp.txt", 10))

    def testLevel4_list_dir_at_excludes_expired(self):
        fs = FileSystem()
        fs.create_file_at("/keep.txt", "k", 0)
        fs.create_file_at("/gone.txt", "g", 0, 5)
        self.assertEqual(fs.list_dir_at("/", 10), ["keep.txt"])

    def testLevel4_level1_methods_still_work(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "hello")
        self.assertEqual(fs.read_file("/a.txt"), "hello")
        self.assertTrue(fs.delete("/a.txt"))
`;

const TESTS_5 = `import unittest
from solution import FileSystem


class Level5Tests(unittest.TestCase):
    def testLevel5_snapshot_and_restore(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "original")
        sid = fs.snapshot()
        fs.write_file("/a.txt", "changed")
        fs.create_file("/b.txt", "new")
        fs.restore(sid)
        self.assertEqual(fs.read_file("/a.txt"), "original")
        self.assertIsNone(fs.read_file("/b.txt"))

    def testLevel5_restore_unknown_is_noop(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "x")
        fs.restore(999)
        self.assertEqual(fs.read_file("/a.txt"), "x")

    def testLevel5_restore_reverts_deletes(self):
        fs = FileSystem()
        fs.make_dir("/d")
        fs.create_file("/d/a.txt", "x")
        sid = fs.snapshot()
        fs.delete("/d/a.txt")
        fs.restore(sid)
        self.assertEqual(fs.read_file("/d/a.txt"), "x")
`;

const TESTS_6 = `import unittest
from solution import FileSystem


class Level6Tests(unittest.TestCase):
    def testLevel6_move_file(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "data")
        fs.make_dir("/docs")
        self.assertTrue(fs.move("/a.txt", "/docs/a.txt"))
        self.assertIsNone(fs.read_file("/a.txt"))
        self.assertEqual(fs.read_file("/docs/a.txt"), "data")

    def testLevel6_move_subtree(self):
        fs = FileSystem()
        fs.make_dir("/src")
        fs.create_file("/src/f.txt", "x")
        fs.make_dir("/dst")
        self.assertTrue(fs.move("/src", "/dst/src"))
        self.assertEqual(fs.read_file("/dst/src/f.txt"), "x")

    def testLevel6_move_onto_existing_fails(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "1")
        fs.create_file("/b.txt", "2")
        self.assertFalse(fs.move("/a.txt", "/b.txt"))

    def testLevel6_copy_is_independent(self):
        fs = FileSystem()
        fs.create_file("/a.txt", "data")
        self.assertTrue(fs.copy("/a.txt", "/b.txt"))
        fs.write_file("/a.txt", "changed")
        self.assertEqual(fs.read_file("/b.txt"), "data")

    def testLevel6_copy_missing_source(self):
        self.assertFalse(FileSystem().copy("/ghost", "/x.txt"))
`;

export default {
  id: "file-system",
  title: "In-Memory File System",
  domain: "File System",
  kind: "exam",
  implFile: "solution.py",
  className: "FileSystem",
  pointsPerLevel: 100,
  blurb: "Files & directories, listing, recursive search, temp-file TTL, snapshots, and move/copy.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Files & Directories", points: 100, mode: "sync",
      changed: "The core file-system operations.",
      spec: `# Level 1 — Files & Directories

Paths look like \`/dir/file\`; the root is \`/\`. Implement on \`FileSystem\`:

- \`create_file(path, content="")\` — create a file. \`False\` if the path is taken or its parent directory does not exist.
- \`make_dir(path)\` — create a directory. \`False\` if the path is taken or its parent is missing.
- \`read_file(path)\` — the file's content, or \`None\` (also \`None\` for a directory).
- \`delete(path)\` — remove a file or an **empty** directory. \`False\` if the path is missing or names a non-empty directory.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Listing & Navigation", points: 100, mode: "sync",
      changed: "Adds directory listing, overwrite, and existence checks.",
      spec: `# Level 2 — Listing & Navigation

Add:

- \`list_dir(path)\` — a **sorted** list of the immediate child names of a directory. \`[]\` if the path is missing or is a file.
- \`write_file(path, content)\` — overwrite an existing file's content; \`False\` if it is not an existing file.
- \`exists(path)\` — whether anything (file or directory) exists at \`path\`.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Search & Usage", points: 100, mode: "sync",
      changed: "Adds recursive search, disk usage, and a largest-files ranking.",
      spec: `# Level 3 — Search & Usage

Add (these walk the whole tree):

- \`find(name)\` — every full path whose final component equals \`name\`, **sorted**.
- \`disk_usage(path)\` — the total content length of every file under \`path\` (a subtree). \`0\` if the path is missing.
- \`largest_files(n)\` — the \`n\` largest files by content length **descending**, ties by **path ascending**.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Temporary Files", points: 100, mode: "sync",
      changed: "Files can be created with a time-to-live — and the file node is refactored.",
      spec: `# Level 4 — Temporary Files

A file can now be created at a point in time, with an optional lifetime.

- \`create_file_at(path, content, timestamp, ttl=None)\` — create a file; with a \`ttl\` it is **live** only for timestamps \`t\` where \`t < timestamp + ttl\`.
- \`read_file_at(path, timestamp)\` — the content if the file is live at \`timestamp\`, else \`None\`.
- \`list_dir_at(path, timestamp)\` — \`list_dir\` restricted to children live at \`timestamp\` (directories never expire).

**The refactor**: file nodes gain an \`expiry\`. Your Level 1–3 methods must keep passing — a plainly-created file never expires.`,
      tests: TESTS_4, solution: SOL_4,
    },
    {
      n: 5, title: "Snapshots", points: 100, mode: "sync",
      changed: "Adds whole-tree snapshot and restore.",
      spec: `# Level 5 — Snapshots

Add:

- \`snapshot()\` — save the entire file tree; return an integer id.
- \`restore(snapshot_id)\` — revert the tree to that snapshot; do nothing for an unknown id.

The tree is deeply nested — snapshot with \`copy.deepcopy\`.`,
      tests: TESTS_5, solution: SOL_5,
    },
    {
      n: 6, title: "Move & Copy", points: 100, mode: "sync",
      changed: "Adds relocating and deep-copying files and whole subtrees.",
      spec: `# Level 6 — Move & Copy

Add:

- \`move(src, dst)\` — relocate a file or a whole subtree from \`src\` to \`dst\`. \`False\` if \`src\` is missing, or \`dst\` is taken, or \`dst\`'s parent directory does not exist.
- \`copy(src, dst)\` — deep-copy a file or subtree to \`dst\`. Same failure conditions. The copy must be **independent** — later edits to \`src\` must not affect \`dst\`.`,
      tests: TESTS_6, solution: SOL_6,
    },
  ],
};
