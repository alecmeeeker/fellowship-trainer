/* In-Memory Database — a 6-level progressive project.
 * Each level: spec (markdown), tests (a unittest module), and a reference
 * solution (the complete class as it should look after that level).
 * Test modules import from `solution`; the learner's code is solution.py. */

const STARTER = `class InMemoryDB:
    """An in-memory database of records.

    Each record is identified by a string \`key\` and holds a set of fields,
    where each field maps a name to a string value. Implement the methods
    below as you work through the six levels.
    """

    def __init__(self):
        # TODO: set up your storage here
        pass

    def set(self, key, field, value):
        pass

    def get(self, key, field):
        pass

    def delete(self, key, field):
        pass
`;

/* ---- reference solutions, built up level by level ---- */

const SOL_1 = `class InMemoryDB:
    def __init__(self):
        self._db = {}  # key -> { field: value }

    def set(self, key, field, value):
        self._db.setdefault(key, {})[field] = value

    def get(self, key, field):
        rec = self._db.get(key)
        if rec is None:
            return None
        return rec.get(field)

    def delete(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True
`;

const SOL_2 = `class InMemoryDB:
    def __init__(self):
        self._db = {}

    def set(self, key, field, value):
        self._db.setdefault(key, {})[field] = value

    def get(self, key, field):
        rec = self._db.get(key)
        return None if rec is None else rec.get(field)

    def delete(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True

    def scan(self, key):
        rec = self._db.get(key)
        if not rec:
            return []
        return [(f, rec[f]) for f in sorted(rec)]

    def scan_by_prefix(self, key, prefix):
        return [(f, v) for (f, v) in self.scan(key) if f.startswith(prefix)]
`;

const SOL_3 = `class InMemoryDB:
    def __init__(self):
        self._db = {}

    def set(self, key, field, value):
        self._db.setdefault(key, {})[field] = value

    def get(self, key, field):
        rec = self._db.get(key)
        return None if rec is None else rec.get(field)

    def delete(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True

    def scan(self, key):
        rec = self._db.get(key)
        if not rec:
            return []
        return [(f, rec[f]) for f in sorted(rec)]

    def scan_by_prefix(self, key, prefix):
        return [(f, v) for (f, v) in self.scan(key) if f.startswith(prefix)]

    def top_keys(self, n):
        return sorted(self._db, key=lambda k: (-len(self._db[k]), k))[:n]
`;

/* Level 4 refactors storage: each field is now (value, set_at, expiry). */
const SOL_4 = `class InMemoryDB:
    def __init__(self):
        self._db = {}  # key -> { field: (value, set_at, expiry) }

    # ---- internal helpers ----
    def _live(self, cell, timestamp):
        _, set_at, expiry = cell
        return set_at <= timestamp and (expiry is None or timestamp < expiry)

    def _put(self, key, field, value, set_at, expiry):
        self._db.setdefault(key, {})[field] = (value, set_at, expiry)

    def _remove(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True

    # ---- Level 1 ----
    def set(self, key, field, value):
        self._put(key, field, value, 0, None)

    def get(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return None
        return rec[field][0]

    def delete(self, key, field):
        return self._remove(key, field)

    # ---- Level 2 ----
    def scan(self, key):
        rec = self._db.get(key)
        if not rec:
            return []
        return [(f, rec[f][0]) for f in sorted(rec)]

    def scan_by_prefix(self, key, prefix):
        return [(f, v) for (f, v) in self.scan(key) if f.startswith(prefix)]

    # ---- Level 3 ----
    def top_keys(self, n):
        return sorted(self._db, key=lambda k: (-len(self._db[k]), k))[:n]

    # ---- Level 4 ----
    def set_at(self, key, field, value, timestamp):
        self._put(key, field, value, timestamp, None)

    def set_at_with_ttl(self, key, field, value, timestamp, ttl):
        self._put(key, field, value, timestamp, timestamp + ttl)

    def get_at(self, key, field, timestamp):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return None
        cell = rec[field]
        return cell[0] if self._live(cell, timestamp) else None

    def delete_at(self, key, field, timestamp):
        rec = self._db.get(key)
        if rec is None or field not in rec or not self._live(rec[field], timestamp):
            return False
        return self._remove(key, field)

    def scan_at(self, key, timestamp):
        rec = self._db.get(key)
        if not rec:
            return []
        return [(f, rec[f][0]) for f in sorted(rec) if self._live(rec[f], timestamp)]

    def scan_by_prefix_at(self, key, prefix, timestamp):
        return [(f, v) for (f, v) in self.scan_at(key, timestamp) if f.startswith(prefix)]
`;

const SOL_5 = SOL_4.replace(
  "    def __init__(self):\n        self._db = {}  # key -> { field: (value, set_at, expiry) }\n",
  "    def __init__(self):\n        self._db = {}  # key -> { field: (value, set_at, expiry) }\n        self._backups = {}  # backup_timestamp -> snapshot\n"
) + `
    # ---- Level 5 ----
    def backup(self, timestamp):
        snapshot = {}
        for key, rec in self._db.items():
            saved = {}
            for field, cell in rec.items():
                if self._live(cell, timestamp):
                    value, _, expiry = cell
                    remaining = None if expiry is None else expiry - timestamp
                    saved[field] = (value, remaining)
            if saved:
                snapshot[key] = saved
        self._backups[timestamp] = snapshot
        return len(snapshot)

    def restore(self, timestamp, timestamp_to_restore):
        candidates = [t for t in self._backups if t <= timestamp_to_restore]
        if not candidates:
            return
        snapshot = self._backups[max(candidates)]
        self._db = {}
        for key, saved in snapshot.items():
            for field, (value, remaining) in saved.items():
                expiry = None if remaining is None else timestamp + remaining
                self._put(key, field, value, timestamp, expiry)
`;

const SOL_6 = SOL_5 + `
    # ---- Level 6 ----
    def select_at(self, timestamp, field, value):
        out = []
        for key, rec in self._db.items():
            cell = rec.get(field)
            if cell is not None and cell[0] == value and self._live(cell, timestamp):
                out.append(key)
        return sorted(out)
`;

/* ---- test modules ---- */

const TESTS_1 = `import unittest
from solution import InMemoryDB


class Level1Tests(unittest.TestCase):
    def testLevel1_set_and_get(self):
        db = InMemoryDB()
        db.set("user", "name", "Ada")
        self.assertEqual(db.get("user", "name"), "Ada")

    def testLevel1_get_missing_key_is_none(self):
        self.assertIsNone(InMemoryDB().get("ghost", "name"))

    def testLevel1_get_missing_field_is_none(self):
        db = InMemoryDB()
        db.set("user", "name", "Ada")
        self.assertIsNone(db.get("user", "age"))

    def testLevel1_overwrite_field(self):
        db = InMemoryDB()
        db.set("user", "name", "Ada")
        db.set("user", "name", "Grace")
        self.assertEqual(db.get("user", "name"), "Grace")

    def testLevel1_delete_existing_returns_true(self):
        db = InMemoryDB()
        db.set("user", "name", "Ada")
        self.assertTrue(db.delete("user", "name"))
        self.assertIsNone(db.get("user", "name"))

    def testLevel1_delete_missing_returns_false(self):
        self.assertFalse(InMemoryDB().delete("user", "name"))

    def testLevel1_records_are_independent(self):
        db = InMemoryDB()
        db.set("a", "f", "1")
        db.set("b", "f", "2")
        self.assertEqual(db.get("a", "f"), "1")
        self.assertEqual(db.get("b", "f"), "2")
`;

const TESTS_2 = `import unittest
from solution import InMemoryDB


class Level2Tests(unittest.TestCase):
    def testLevel2_scan_returns_sorted_pairs(self):
        db = InMemoryDB()
        db.set("a", "c", "3")
        db.set("a", "a", "1")
        db.set("a", "b", "2")
        self.assertEqual(db.scan("a"), [("a", "1"), ("b", "2"), ("c", "3")])

    def testLevel2_scan_missing_key_is_empty(self):
        self.assertEqual(InMemoryDB().scan("nope"), [])

    def testLevel2_scan_by_prefix_filters(self):
        db = InMemoryDB()
        db.set("a", "bb_1", "x")
        db.set("a", "bb_2", "y")
        db.set("a", "cc", "z")
        self.assertEqual(db.scan_by_prefix("a", "bb"), [("bb_1", "x"), ("bb_2", "y")])

    def testLevel2_scan_by_prefix_no_match_is_empty(self):
        db = InMemoryDB()
        db.set("a", "x", "1")
        self.assertEqual(db.scan_by_prefix("a", "zz"), [])

    def testLevel2_scan_reflects_deletes(self):
        db = InMemoryDB()
        db.set("a", "x", "1")
        db.set("a", "y", "2")
        db.delete("a", "x")
        self.assertEqual(db.scan("a"), [("y", "2")])
`;

const TESTS_3 = `import unittest
from solution import InMemoryDB


class Level3Tests(unittest.TestCase):
    def testLevel3_top_keys_orders_by_field_count(self):
        db = InMemoryDB()
        for f in ("f1", "f2", "f3"):
            db.set("a", f, "v")
        db.set("b", "f1", "v")
        db.set("c", "f1", "v")
        db.set("c", "f2", "v")
        self.assertEqual(db.top_keys(3), ["a", "c", "b"])

    def testLevel3_top_keys_ties_break_by_key(self):
        db = InMemoryDB()
        db.set("z", "f", "v")
        db.set("a", "f", "v")
        db.set("m", "f", "v")
        self.assertEqual(db.top_keys(2), ["a", "m"])

    def testLevel3_top_keys_n_exceeds_count(self):
        db = InMemoryDB()
        db.set("a", "f", "v")
        self.assertEqual(db.top_keys(10), ["a"])

    def testLevel3_top_keys_zero(self):
        db = InMemoryDB()
        db.set("a", "f", "v")
        self.assertEqual(db.top_keys(0), [])

    def testLevel3_top_keys_empty_db(self):
        self.assertEqual(InMemoryDB().top_keys(3), [])
`;

const TESTS_4 = `import unittest
from solution import InMemoryDB


class Level4Tests(unittest.TestCase):
    def testLevel4_set_at_and_get_at(self):
        db = InMemoryDB()
        db.set_at("a", "x", "1", 5)
        self.assertEqual(db.get_at("a", "x", 5), "1")
        self.assertEqual(db.get_at("a", "x", 100), "1")

    def testLevel4_ttl_is_live_then_expires(self):
        db = InMemoryDB()
        db.set_at_with_ttl("a", "x", "1", 0, 10)
        self.assertEqual(db.get_at("a", "x", 0), "1")
        self.assertEqual(db.get_at("a", "x", 9), "1")
        self.assertIsNone(db.get_at("a", "x", 10))
        self.assertIsNone(db.get_at("a", "x", 50))

    def testLevel4_delete_at_live_field(self):
        db = InMemoryDB()
        db.set_at("a", "x", "1", 0)
        self.assertTrue(db.delete_at("a", "x", 5))
        self.assertIsNone(db.get_at("a", "x", 6))
        self.assertFalse(db.delete_at("a", "x", 7))

    def testLevel4_delete_at_expired_returns_false(self):
        db = InMemoryDB()
        db.set_at_with_ttl("a", "x", "1", 0, 10)
        self.assertFalse(db.delete_at("a", "x", 20))

    def testLevel4_scan_at_excludes_expired(self):
        db = InMemoryDB()
        db.set_at("a", "keep", "1", 0)
        db.set_at_with_ttl("a", "gone", "2", 0, 5)
        self.assertEqual(db.scan_at("a", 10), [("keep", "1")])

    def testLevel4_scan_by_prefix_at(self):
        db = InMemoryDB()
        db.set_at("a", "name_first", "Ada", 0)
        db.set_at("a", "name_last", "Lovelace", 0)
        db.set_at("a", "age", "36", 0)
        self.assertEqual(
            db.scan_by_prefix_at("a", "name", 5),
            [("name_first", "Ada"), ("name_last", "Lovelace")],
        )

    def testLevel4_level1_methods_still_work(self):
        db = InMemoryDB()
        db.set("a", "x", "1")
        self.assertEqual(db.get("a", "x"), "1")
        self.assertTrue(db.delete("a", "x"))
`;

const TESTS_5 = `import unittest
from solution import InMemoryDB


class Level5Tests(unittest.TestCase):
    def testLevel5_backup_counts_live_records(self):
        db = InMemoryDB()
        db.set_at("a", "x", "1", 0)
        db.set_at("b", "y", "2", 0)
        db.set_at_with_ttl("c", "z", "3", 0, 5)
        self.assertEqual(db.backup(10), 2)

    def testLevel5_restore_reverts_state(self):
        db = InMemoryDB()
        db.set_at("a", "x", "old", 0)
        db.backup(0)
        db.set_at("a", "x", "new", 5)
        db.set_at("a", "y", "extra", 5)
        db.restore(10, 0)
        self.assertEqual(db.get_at("a", "x", 10), "old")
        self.assertIsNone(db.get_at("a", "y", 10))

    def testLevel5_restore_reanchors_ttl(self):
        db = InMemoryDB()
        db.set_at_with_ttl("a", "x", "1", 0, 100)
        db.backup(10)
        db.restore(1000, 10)
        self.assertEqual(db.get_at("a", "x", 1050), "1")
        self.assertIsNone(db.get_at("a", "x", 1090))

    def testLevel5_restore_picks_most_recent_backup(self):
        db = InMemoryDB()
        db.set_at("a", "x", "v0", 0)
        db.backup(0)
        db.set_at("a", "x", "v5", 5)
        db.backup(5)
        db.set_at("a", "x", "v9", 9)
        db.restore(20, 7)
        self.assertEqual(db.get_at("a", "x", 20), "v5")

    def testLevel5_restore_with_no_backup_is_noop(self):
        db = InMemoryDB()
        db.set_at("a", "x", "1", 0)
        db.restore(10, 5)
        self.assertEqual(db.get_at("a", "x", 10), "1")
`;

const TESTS_6 = `import unittest
from solution import InMemoryDB


class Level6Tests(unittest.TestCase):
    def testLevel6_select_at_finds_matching_keys(self):
        db = InMemoryDB()
        db.set_at("u1", "city", "NYC", 0)
        db.set_at("u2", "city", "LA", 0)
        db.set_at("u3", "city", "NYC", 0)
        self.assertEqual(db.select_at(5, "city", "NYC"), ["u1", "u3"])

    def testLevel6_select_at_excludes_expired(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u1", "city", "NYC", 0, 10)
        db.set_at("u2", "city", "NYC", 0)
        self.assertEqual(db.select_at(20, "city", "NYC"), ["u2"])

    def testLevel6_select_at_no_match_is_empty(self):
        db = InMemoryDB()
        db.set_at("u1", "city", "NYC", 0)
        self.assertEqual(db.select_at(5, "city", "Boston"), [])

    def testLevel6_select_at_ignores_other_fields(self):
        db = InMemoryDB()
        db.set_at("u1", "city", "NYC", 0)
        db.set_at("u1", "role", "admin", 0)
        db.set_at("u2", "role", "NYC", 0)
        self.assertEqual(db.select_at(5, "city", "NYC"), ["u1"])
`;

export default {
  id: "in-memory-db",
  title: "In-Memory Database",
  domain: "Key-Value Store",
  kind: "practice",
  implFile: "solution.py",
  className: "InMemoryDB",
  pointsPerLevel: 100,
  blurb: "A record/field key-value store, built across six levels — the canonical multi-level coding assessment shape.",
  starterCode: STARTER,
  levels: [
    {
      n: 1,
      title: "Basic Operations",
      points: 100,
      mode: "sync",
      changed: "The starting point — three core operations on records and fields.",
      spec: `# Level 1 — Basic Operations

Build an in-memory database of **records**. Each record has a string \`key\` and holds a set of **fields**; every field maps a name to a string value.

Implement three methods on \`InMemoryDB\`:

- \`set(key, field, value)\` — set \`field\` of record \`key\` to \`value\`. Creates the record if it does not exist; overwrites the field if it does. Returns nothing.
- \`get(key, field)\` — return the value of \`field\` in record \`key\`, or \`None\` if the record or the field does not exist.
- \`delete(key, field)\` — remove \`field\` from record \`key\`. Return \`True\` if the field existed and was removed, \`False\` otherwise.

**Notes**

- Keys, fields, and values are all strings.
- Different records are independent.
- A record that loses its last field can simply be treated as gone.

Read the tests on the left — they are the precise specification. Run them early and often.`,
      tests: TESTS_1,
      solution: SOL_1,
    },
    {
      n: 2,
      title: "Scans",
      points: 100,
      mode: "sync",
      changed: "Adds scan and scan_by_prefix. Your Level 1 methods are unchanged.",
      spec: `# Level 2 — Scans

A record can now be inspected as a whole. Add two methods:

- \`scan(key)\` — return a list of \`(field, value)\` tuples for every field in record \`key\`, **sorted by field name** ascending. Return \`[]\` if the record does not exist.
- \`scan_by_prefix(key, prefix)\` — like \`scan\`, but include only fields whose name **starts with** \`prefix\`.

**Notes**

- The result is a list of 2-tuples, e.g. \`[("age", "30"), ("name", "Ada")]\`.
- \`str.startswith\` and \`sorted\` are all you need.
- Your Level 1 methods must keep passing.`,
      tests: TESTS_2,
      solution: SOL_2,
    },
    {
      n: 3,
      title: "Ranking",
      points: 100,
      mode: "sync",
      changed: "Adds top_keys — an aggregation across records. No refactor needed.",
      spec: `# Level 3 — Ranking

Add an aggregation across all records:

- \`top_keys(n)\` — return the keys of the \`n\` records with the **most fields**, ordered by field count **descending**. Break ties by key name **ascending**. If fewer than \`n\` records exist, return them all.

**Notes**

- Return a list of keys (strings).
- This is the core assessment sort pattern — a **tuple key**:
  \`sorted(keys, key=lambda k: (-count(k), k))\`. Negate the number for descending; leave the string positive for ascending.`,
      tests: TESTS_3,
      solution: SOL_3,
    },
    {
      n: 4,
      title: "Timestamps & Expiry",
      points: 100,
      mode: "sync",
      changed: "Adds six timestamped operations and TTL — and forces a refactor of how fields are stored.",
      spec: `# Level 4 — Timestamps & Expiry

The hard pivot. Every operation now happens at a point in time, and a field can be given a limited lifetime.

Add timestamped operations:

- \`set_at(key, field, value, timestamp)\` — like \`set\`, recording that the write happened at \`timestamp\`.
- \`set_at_with_ttl(key, field, value, timestamp, ttl)\` — set the field with a time-to-live. The field is **live** at times \`t\` where \`timestamp <= t < timestamp + ttl\`, and **expired** at and after \`timestamp + ttl\`.
- \`get_at(key, field, timestamp)\` — return the field's value if it is live at \`timestamp\`, else \`None\`.
- \`delete_at(key, field, timestamp)\` — delete the field; return \`True\` only if it was present and live at \`timestamp\`.
- \`scan_at(key, timestamp)\` and \`scan_by_prefix_at(key, prefix, timestamp)\` — the Level 2 scans, restricted to fields live at \`timestamp\`.

**The refactor**

A field is no longer just a value — it also has an expiry. Store each field as a cell like \`(value, set_at, expiry)\` and route every read through one *"is this live at time t?"* helper. Your Level 1–3 methods must still pass: treat a plain \`set\` as a write at time 0 with no expiry.

> Re-run **all** levels after this refactor — changing the storage shape is exactly where earlier levels silently break.`,
      tests: TESTS_4,
      solution: SOL_4,
    },
    {
      n: 5,
      title: "Backup & Restore",
      points: 100,
      mode: "sync",
      changed: "Adds backup and restore, including the TTL re-anchoring rule.",
      spec: `# Level 5 — Backup & Restore

Add point-in-time snapshots:

- \`backup(timestamp)\` — save a snapshot of the database as it stands at \`timestamp\` (only fields live at \`timestamp\` are saved). Return the number of records saved — records with at least one live field.
- \`restore(timestamp, timestamp_to_restore)\` — find the most recent backup taken at a time **at or before** \`timestamp_to_restore\`, and restore the database to it. If no such backup exists, do nothing.

**Re-anchoring TTLs**

A field that still had time left when it was backed up keeps that *remaining* lifetime. After a restore at \`timestamp\`, such a field expires at \`timestamp + remaining\`. Fields with no expiry stay permanent.

> A snapshot must be an independent copy — later writes must never leak into a saved backup.`,
      tests: TESTS_5,
      solution: SOL_5,
    },
    {
      n: 6,
      title: "Search",
      points: 100,
      mode: "sync",
      changed: "Adds select_at — a reverse lookup across your timestamped store.",
      spec: `# Level 6 — Search

Add a reverse lookup across all records:

- \`select_at(timestamp, field, value)\` — return a **sorted** list of every record key whose \`field\` is set to exactly \`value\` and is **live** at \`timestamp\`.

**Notes**

- Iterate the records, check the field's value and its liveness, collect the keys, sort them.
- No new data structures are needed — this builds directly on your Level 4 storage and \`_live\` helper.
- A record that has no \`field\` at all is simply skipped.`,
      tests: TESTS_6,
      solution: SOL_6,
    },
  ],
};
