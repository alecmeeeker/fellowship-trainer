/* mock-imdb-4 — In-Memory Database, the canonical 4-level assessment shape.
 *
 * Adapted from public practice repos and candidate writeups. Fellowship
 * candidates consistently report this archetype with these four
 * levels: CRUD → scan-and-format → timestamps+TTL → backup/restore.
 *
 * Method names and return shapes match the published prompts: scans return
 * comma-joined `"field(value)"` strings sorted lexicographically; backup
 * returns a count; restore re-anchors TTLs.
 */

const STARTER = `class InMemoryDB:
    """An in-memory database of records.

    Each record is identified by a string \`key\` and holds a set of fields,
    where each field maps a name to a string value. Build the four levels in
    order — every later level keeps the earlier methods working.
    """

    def __init__(self):
        # TODO: design your storage so it survives the L3 timestamp refactor.
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
        self._db = {}  # key -> { field: (value, set_at, expiry) }

    # ---- internal helpers ----
    def _record(self, key):
        return self._db.get(key)

    def _put(self, key, field, value, set_at=0, expiry=None):
        self._db.setdefault(key, {})[field] = (value, set_at, expiry)

    def _cell(self, key, field):
        rec = self._db.get(key)
        if rec is None:
            return None
        return rec.get(field)

    # ---- L1 public api ----
    def set(self, key, field, value):
        self._put(key, field, value)

    def get(self, key, field):
        cell = self._cell(key, field)
        return None if cell is None else cell[0]

    def delete(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True
`;

const SOL_2 = SOL_1 + `
    # ---- L2 ----
    def _live_fields(self, key, now=None):
        rec = self._db.get(key)
        if not rec:
            return []
        return sorted(rec)

    def scan(self, key):
        fields = self._live_fields(key)
        if not fields:
            return ""
        rec = self._db[key]
        return ", ".join(f + "(" + rec[f][0] + ")" for f in fields)

    def scan_by_prefix(self, key, prefix):
        fields = [f for f in self._live_fields(key) if f.startswith(prefix)]
        if not fields:
            return ""
        rec = self._db[key]
        return ", ".join(f + "(" + rec[f][0] + ")" for f in fields)
`;

const SOL_3 = `class InMemoryDB:
    def __init__(self):
        self._db = {}  # key -> { field: (value, set_at, expiry) }

    # ---- helpers ----
    def _live(self, cell, now):
        if cell is None:
            return False
        expiry = cell[2]
        return expiry is None or now < expiry

    def _cell(self, key, field):
        rec = self._db.get(key)
        return None if rec is None else rec.get(field)

    def _put(self, key, field, value, set_at, expiry):
        self._db.setdefault(key, {})[field] = (value, set_at, expiry)

    def _drop(self, key, field):
        rec = self._db.get(key)
        if rec is None or field not in rec:
            return False
        del rec[field]
        if not rec:
            del self._db[key]
        return True

    def _live_fields_at(self, key, now):
        rec = self._db.get(key)
        if not rec:
            return []
        return sorted(f for f, cell in rec.items() if self._live(cell, now))

    # ---- L1 (now backward-compat shims over the timestamped store) ----
    def set(self, key, field, value):
        self._put(key, field, value, 0, None)

    def get(self, key, field):
        cell = self._cell(key, field)
        if cell is None:
            return None
        return cell[0]

    def delete(self, key, field):
        return self._drop(key, field)

    # ---- L2 (now backward-compat too) ----
    def scan(self, key):
        return self._format(key, self._live_fields_at(key, float("inf")))

    def scan_by_prefix(self, key, prefix):
        fields = [f for f in self._live_fields_at(key, float("inf")) if f.startswith(prefix)]
        return self._format(key, fields)

    def _format(self, key, fields):
        if not fields:
            return ""
        rec = self._db[key]
        return ", ".join(f + "(" + rec[f][0] + ")" for f in fields)

    # ---- L3 timestamped ops ----
    def set_at(self, key, field, value, timestamp):
        self._put(key, field, value, timestamp, None)

    def set_at_with_ttl(self, key, field, value, timestamp, ttl):
        self._put(key, field, value, timestamp, timestamp + ttl)

    def get_at(self, key, field, timestamp):
        cell = self._cell(key, field)
        if not self._live(cell, timestamp):
            return None
        return cell[0]

    def delete_at(self, key, field, timestamp):
        cell = self._cell(key, field)
        if not self._live(cell, timestamp):
            return False
        return self._drop(key, field)

    def scan_at(self, key, timestamp):
        return self._format(key, self._live_fields_at(key, timestamp))

    def scan_by_prefix_at(self, key, prefix, timestamp):
        fields = [f for f in self._live_fields_at(key, timestamp) if f.startswith(prefix)]
        return self._format(key, fields)
`;

const SOL_4 = SOL_3 + `
    # ---- L4 backup / restore ----
    def backup(self, timestamp):
        if not hasattr(self, "_backups"):
            self._backups = []
        live_count = 0
        snap = {}
        for key, rec in self._db.items():
            live_fields = {}
            for f, (val, set_at, expiry) in rec.items():
                if expiry is None:
                    live_fields[f] = (val, set_at, None)
                elif timestamp < expiry:
                    remaining = expiry - timestamp
                    live_fields[f] = (val, set_at, remaining)  # store as remaining for re-anchor
            if live_fields:
                snap[key] = live_fields
                live_count += 1
        self._backups.append((timestamp, snap))
        self._backups.sort(key=lambda b: b[0])
        return live_count

    def restore(self, timestamp, timestamp_to_restore):
        if not hasattr(self, "_backups") or not self._backups:
            return
        candidate = None
        for ts, snap in self._backups:
            if ts <= timestamp_to_restore:
                candidate = (ts, snap)
            else:
                break
        if candidate is None:
            return
        _, snap = candidate
        self._db = {}
        for key, fields in snap.items():
            rebuilt = {}
            for f, (val, set_at, remaining) in fields.items():
                if remaining is None:
                    rebuilt[f] = (val, set_at, None)
                else:
                    rebuilt[f] = (val, timestamp, timestamp + remaining)
            self._db[key] = rebuilt
`;

/* ---- tests, one module per level ---- */

const TESTS_1 = `import unittest
from solution import InMemoryDB


class Level1Tests(unittest.TestCase):
    def testLevel1_set_get(self):
        db = InMemoryDB()
        db.set("alice", "age", "30")
        self.assertEqual(db.get("alice", "age"), "30")

    def testLevel1_get_missing_record_is_none(self):
        db = InMemoryDB()
        self.assertIsNone(db.get("nobody", "age"))

    def testLevel1_get_missing_field_is_none(self):
        db = InMemoryDB()
        db.set("alice", "age", "30")
        self.assertIsNone(db.get("alice", "name"))

    def testLevel1_set_overwrites(self):
        db = InMemoryDB()
        db.set("alice", "age", "30")
        db.set("alice", "age", "31")
        self.assertEqual(db.get("alice", "age"), "31")

    def testLevel1_delete_present_returns_true(self):
        db = InMemoryDB()
        db.set("alice", "age", "30")
        self.assertTrue(db.delete("alice", "age"))
        self.assertIsNone(db.get("alice", "age"))

    def testLevel1_delete_absent_returns_false(self):
        db = InMemoryDB()
        self.assertFalse(db.delete("alice", "age"))
        db.set("alice", "age", "30")
        self.assertFalse(db.delete("alice", "name"))

    def testLevel1_independent_records(self):
        db = InMemoryDB()
        db.set("a", "x", "1")
        db.set("b", "x", "2")
        self.assertEqual(db.get("a", "x"), "1")
        self.assertEqual(db.get("b", "x"), "2")
        self.assertTrue(db.delete("a", "x"))
        self.assertEqual(db.get("b", "x"), "2")
`;

const TESTS_2 = `import unittest
from solution import InMemoryDB


class Level2Tests(unittest.TestCase):
    def testLevel2_scan_empty_record(self):
        db = InMemoryDB()
        self.assertEqual(db.scan("nobody"), "")

    def testLevel2_scan_single_field(self):
        db = InMemoryDB()
        db.set("alice", "age", "30")
        self.assertEqual(db.scan("alice"), "age(30)")

    def testLevel2_scan_sorted_lex(self):
        db = InMemoryDB()
        db.set("alice", "name", "Alice")
        db.set("alice", "age", "30")
        db.set("alice", "city", "NYC")
        self.assertEqual(db.scan("alice"), "age(30), city(NYC), name(Alice)")

    def testLevel2_scan_by_prefix_match(self):
        db = InMemoryDB()
        db.set("user1", "first_name", "Alice")
        db.set("user1", "last_name", "Smith")
        db.set("user1", "age", "30")
        self.assertEqual(db.scan_by_prefix("user1", "first"), "first_name(Alice)")

    def testLevel2_scan_by_prefix_multiple(self):
        db = InMemoryDB()
        db.set("u", "name_a", "1")
        db.set("u", "name_b", "2")
        db.set("u", "other", "3")
        self.assertEqual(db.scan_by_prefix("u", "name_"), "name_a(1), name_b(2)")

    def testLevel2_scan_by_prefix_no_match_empty(self):
        db = InMemoryDB()
        db.set("u", "age", "30")
        self.assertEqual(db.scan_by_prefix("u", "name"), "")

    def testLevel2_scan_after_delete(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        db.set("u", "b", "2")
        db.delete("u", "a")
        self.assertEqual(db.scan("u"), "b(2)")
`;

const TESTS_3 = `import unittest
from solution import InMemoryDB


class Level3Tests(unittest.TestCase):
    def testLevel3_set_at_then_get_at(self):
        db = InMemoryDB()
        db.set_at("u", "name", "Alice", 1)
        self.assertEqual(db.get_at("u", "name", 2), "Alice")

    def testLevel3_set_at_with_ttl_is_live_inside_window(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u", "session", "s1", 10, 5)
        self.assertEqual(db.get_at("u", "session", 10), "s1")
        self.assertEqual(db.get_at("u", "session", 14), "s1")

    def testLevel3_set_at_with_ttl_is_dead_at_expiry(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u", "session", "s1", 10, 5)
        self.assertIsNone(db.get_at("u", "session", 15))
        self.assertIsNone(db.get_at("u", "session", 999))

    def testLevel3_delete_at_only_when_live(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u", "session", "s1", 10, 5)
        self.assertFalse(db.delete_at("u", "session", 20))
        self.assertTrue(db.delete_at("u", "session", 12))
        self.assertIsNone(db.get_at("u", "session", 12))

    def testLevel3_scan_at_only_live_fields(self):
        db = InMemoryDB()
        db.set_at("u", "name", "Alice", 0)
        db.set_at_with_ttl("u", "session", "s1", 10, 5)
        self.assertEqual(db.scan_at("u", 12), "name(Alice), session(s1)")
        self.assertEqual(db.scan_at("u", 20), "name(Alice)")

    def testLevel3_scan_by_prefix_at(self):
        db = InMemoryDB()
        db.set_at("u", "name_first", "Alice", 0)
        db.set_at_with_ttl("u", "name_last", "Smith", 0, 5)
        self.assertEqual(db.scan_by_prefix_at("u", "name_", 2), "name_first(Alice), name_last(Smith)")
        self.assertEqual(db.scan_by_prefix_at("u", "name_", 10), "name_first(Alice)")

    def testLevel3_l1_set_remains_permanent(self):
        db = InMemoryDB()
        db.set("u", "permanent", "yes")
        self.assertEqual(db.get_at("u", "permanent", 10**9), "yes")

    def testLevel3_l1_get_still_works(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        self.assertEqual(db.get("u", "a"), "1")

    def testLevel3_l2_scan_still_works(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        db.set("u", "b", "2")
        self.assertEqual(db.scan("u"), "a(1), b(2)")
`;

const TESTS_4 = `import unittest
from solution import InMemoryDB


class Level4Tests(unittest.TestCase):
    def testLevel4_backup_counts_live_records(self):
        db = InMemoryDB()
        db.set_at("u1", "a", "1", 0)
        db.set_at("u2", "a", "2", 0)
        db.set_at_with_ttl("u3", "a", "3", 0, 5)
        self.assertEqual(db.backup(3), 3)
        self.assertEqual(db.backup(10), 2)  # u3 expired

    def testLevel4_backup_excludes_expired(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u1", "a", "1", 0, 5)
        self.assertEqual(db.backup(10), 0)

    def testLevel4_restore_reanchors_ttl(self):
        db = InMemoryDB()
        # ttl=10, set at 0 -> expires at 10. Backup at 3 -> remaining=7.
        db.set_at_with_ttl("u", "a", "1", 0, 10)
        db.backup(3)
        # mutate the db
        db.delete_at("u", "a", 5)
        self.assertIsNone(db.get_at("u", "a", 6))
        # restore at time 100 -> field re-expires at 100 + 7 = 107
        db.restore(100, 3)
        self.assertEqual(db.get_at("u", "a", 100), "1")
        self.assertEqual(db.get_at("u", "a", 106), "1")
        self.assertIsNone(db.get_at("u", "a", 107))

    def testLevel4_restore_preserves_permanent_fields(self):
        db = InMemoryDB()
        db.set_at("u", "permanent", "yes", 0)
        db.backup(5)
        db.delete_at("u", "permanent", 10)
        db.restore(50, 5)
        self.assertEqual(db.get_at("u", "permanent", 10**9), "yes")

    def testLevel4_restore_picks_latest_backup_at_or_before(self):
        db = InMemoryDB()
        db.set_at("u", "v", "first", 0)
        db.backup(10)
        db.set_at("u", "v", "second", 20)
        db.backup(30)
        db.set_at("u", "v", "third", 40)
        db.restore(100, 25)  # picks backup at 10
        self.assertEqual(db.get_at("u", "v", 100), "first")

    def testLevel4_restore_with_no_matching_backup_is_noop(self):
        db = InMemoryDB()
        db.set_at("u", "v", "current", 0)
        db.backup(10)
        db.restore(100, 5)  # no backup at or before 5
        self.assertEqual(db.get_at("u", "v", 100), "current")

    def testLevel4_backup_is_independent_snapshot(self):
        db = InMemoryDB()
        db.set_at("u", "a", "before", 0)
        db.backup(1)
        db.set_at("u", "a", "after", 5)
        db.restore(100, 1)
        self.assertEqual(db.get_at("u", "a", 100), "before")
`;

export default {
  id: "mock-imdb-4",
  title: "In-Memory Database — 4-level Mock",
  domain: "Key-Value Store",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "InMemoryDB",
  pointsPerLevel: 250,
  blurb:
    "exam-faithful 4-level mock. CRUD → formatted scans → timestamps & TTL → backup/restore. " +
    "Mirrors the canonical in-memory database prompt reported in candidate writeups and public practice repos.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Records, Fields & Values", points: 250, mode: "sync",
      changed: "The canonical L1 — three core methods + corner cases. ~10–15 min.",
      spec: `# Level 1 — Records, Fields & Values

Build an in-memory database of **records**. Each record has a string \`key\` and holds a set of **fields**; every field maps a name to a string value.

Implement three methods on \`InMemoryDB\`:

- \`set(key, field, value)\` — set \`field\` of record \`key\` to \`value\`. Creates the record if it does not exist; overwrites the field if it does.
- \`get(key, field)\` — return the value of \`field\` in record \`key\`, or \`None\` if the record or the field does not exist.
- \`delete(key, field)\` — remove \`field\` from record \`key\`. Return \`True\` if the field existed and was removed, \`False\` otherwise.

**Notes**

- Keys, fields, and values are all strings.
- Different records are independent.
- A record that loses its last field is treated as gone.

> **Design with L3 in mind.** L3 will retrofit timestamps and TTL onto every method. Store each field as a cell — for example, a 3-tuple \`(value, set_at, expiry)\` — even now. Future-you will save 20 minutes.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Formatted Scans", points: 250, mode: "sync",
      changed: "Scans return a comma-joined `field(value)` **string** — the canonical L2 output shape.",
      spec: `# Level 2 — Formatted Scans

A record can now be inspected. Add two methods. **Both return a single formatted string**, not a list — this is the canonical assessment platform output shape.

- \`scan(key)\` — return every field in record \`key\` formatted as \`"field(value), field(value), …"\`, **sorted by field name** ascending. Return \`""\` if the record does not exist.
- \`scan_by_prefix(key, prefix)\` — like \`scan\`, but include only fields whose name **starts with** \`prefix\`.

**Examples**

\`\`\`
set("alice", "age", "30")
set("alice", "name", "Alice")
scan("alice")             -> "age(30), name(Alice)"
scan_by_prefix("alice", "n") -> "name(Alice)"
scan_by_prefix("nobody", "x") -> ""
\`\`\`

**Notes**

- \`str.join\` over a comprehension is the natural pattern.
- Your L1 methods must keep passing.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Timestamps & TTL", points: 250, mode: "sync",
      changed: "**The refactor.** Six timestamped methods are added; TTL semantics are introduced. Earlier L1/L2 calls must still work.",
      spec: `# Level 3 — Timestamps & TTL

The hard pivot. Every operation now happens at a point in time, and a field can be given a limited lifetime.

Add timestamped operations:

- \`set_at(key, field, value, timestamp)\` — like \`set\`, recording that the write happened at \`timestamp\`.
- \`set_at_with_ttl(key, field, value, timestamp, ttl)\` — set the field with a time-to-live. The field is **live** at times \`t\` where \`timestamp <= t < timestamp + ttl\`.
- \`get_at(key, field, timestamp)\` — return the field's value if it is live at \`timestamp\`, else \`None\`.
- \`delete_at(key, field, timestamp)\` — delete the field; return \`True\` only if it was present and live at \`timestamp\`.
- \`scan_at(key, timestamp)\` and \`scan_by_prefix_at(key, prefix, timestamp)\` — the Level 2 scans, restricted to fields live at \`timestamp\`.

**Backward compatibility**

The plain \`set\` / \`get\` / \`delete\` / \`scan\` / \`scan_by_prefix\` from earlier levels must still pass. Treat a plain \`set\` as a write at time \`0\` with no expiry.

> Re-run **all** levels after this refactor — changing the storage shape is exactly where earlier levels silently break.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Backup & Restore", points: 250, mode: "sync",
      changed: "Capstone — point-in-time snapshots that re-anchor TTL on restore.",
      spec: `# Level 4 — Backup & Restore

Add point-in-time snapshots:

- \`backup(timestamp)\` — save a snapshot of every **live** field at \`timestamp\`. Return the number of records that have at least one live field at \`timestamp\`.
- \`restore(timestamp, timestamp_to_restore)\` — find the most recent backup taken at a time **at or before** \`timestamp_to_restore\` and restore the database to it. If no such backup exists, do nothing.

**Re-anchoring TTLs (this is what makes L4 hard)**

A field that still had time left when it was backed up keeps that *remaining* lifetime. After a restore at \`timestamp\`, such a field expires at \`timestamp + remaining\`. Fields with no expiry stay permanent.

**Example**

\`\`\`
set_at_with_ttl("u", "session", "s1", timestamp=0, ttl=10)   # expires at 10
backup(timestamp=3)                                            # field has 7 remaining
restore(timestamp=100, timestamp_to_restore=3)                 # field now expires at 107
get_at("u", "session", 106)   -> "s1"
get_at("u", "session", 107)   -> None
\`\`\`

> A snapshot must be an independent copy — later writes must never leak into a saved backup.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
