/* mock-imdb-merge-4 — In-Memory Database, alt-L4 variant.
 *
 * L1-L3 identical to mock-imdb-4 (CRUD → formatted scans → timestamps & TTL).
 * L4 swapped: instead of backup/restore, the capstone is RECORD MERGE — fold
 * one record into another, with field-collision conflict resolution and
 * surviving-record TTL preservation.
 *
 * Source: this capstone pattern is documented as a less-common L4 variant of
 * the in-memory DB archetype on Blind candidate reports. It surfaces the same
 * skill — refactoring storage under a new constraint — without rehearsing
 * the backup/restore mechanics already drilled in mock-imdb-4.
 */

const STARTER = `class InMemoryDB:
    """An in-memory database — same L1-L3 as the canonical mock, but a
    different L4 capstone (record merge). Build the four levels in order."""

    def __init__(self):
        pass

    def set(self, key, field, value):
        pass

    def get(self, key, field):
        pass

    def delete(self, key, field):
        pass
`;

/* L1-L3 solutions identical to mock-imdb-4 in approach. Re-stated here so the
 * project is fully self-contained — the trainer loads each project as one file. */

const SOL_1 = `class InMemoryDB:
    def __init__(self):
        self._db = {}

    def _cell(self, key, field):
        rec = self._db.get(key)
        return None if rec is None else rec.get(field)

    def _put(self, key, field, value, set_at=0, expiry=None):
        self._db.setdefault(key, {})[field] = (value, set_at, expiry)

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
    def _format(self, key, fields):
        if not fields:
            return ""
        rec = self._db[key]
        return ", ".join(f + "(" + rec[f][0] + ")" for f in fields)

    def scan(self, key):
        rec = self._db.get(key)
        if not rec:
            return ""
        return self._format(key, sorted(rec))

    def scan_by_prefix(self, key, prefix):
        rec = self._db.get(key)
        if not rec:
            return ""
        fields = sorted(f for f in rec if f.startswith(prefix))
        return self._format(key, fields)
`;

const SOL_3 = `class InMemoryDB:
    def __init__(self):
        self._db = {}

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

    def _format(self, key, fields):
        if not fields:
            return ""
        rec = self._db[key]
        return ", ".join(f + "(" + rec[f][0] + ")" for f in fields)

    # L1
    def set(self, key, field, value):
        self._put(key, field, value, 0, None)

    def get(self, key, field):
        cell = self._cell(key, field)
        return None if cell is None else cell[0]

    def delete(self, key, field):
        return self._drop(key, field)

    # L2
    def scan(self, key):
        return self._format(key, self._live_fields_at(key, float("inf")))

    def scan_by_prefix(self, key, prefix):
        fields = [f for f in self._live_fields_at(key, float("inf")) if f.startswith(prefix)]
        return self._format(key, fields)

    # L3
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
    # ---- L4 merge_records ----
    def merge_records(self, timestamp, key_target, key_source):
        """Fold key_source's live fields into key_target at this timestamp.

        - If both records have a field, the **target's value wins** (the
          source's collision is silently dropped).
        - Dead (expired) fields in either record are skipped.
        - The source record is deleted.
        - Returns the count of fields actually copied from source to target.
        - Returns 0 if target or source is missing, or if they are the same
          key.
        """
        if key_target == key_source:
            return 0
        target = self._db.get(key_target)
        source = self._db.get(key_source)
        if target is None or source is None:
            return 0
        copied = 0
        new_target_fields = dict(target)
        for f, cell in source.items():
            if not self._live(cell, timestamp):
                continue
            if f in target and self._live(target[f], timestamp):
                continue
            new_target_fields[f] = cell
            copied += 1
        self._db[key_target] = new_target_fields
        del self._db[key_source]
        return copied
`;

const TESTS_1 = `import unittest
from solution import InMemoryDB


class Level1Tests(unittest.TestCase):
    def testLevel1_set_get(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        self.assertEqual(db.get("u", "a"), "1")

    def testLevel1_get_missing_none(self):
        db = InMemoryDB()
        self.assertIsNone(db.get("u", "a"))

    def testLevel1_set_overwrites(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        db.set("u", "a", "2")
        self.assertEqual(db.get("u", "a"), "2")

    def testLevel1_delete_present_true(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        self.assertTrue(db.delete("u", "a"))
        self.assertIsNone(db.get("u", "a"))

    def testLevel1_delete_absent_false(self):
        db = InMemoryDB()
        self.assertFalse(db.delete("u", "a"))
`;

const TESTS_2 = `import unittest
from solution import InMemoryDB


class Level2Tests(unittest.TestCase):
    def testLevel2_scan_empty(self):
        self.assertEqual(InMemoryDB().scan("u"), "")

    def testLevel2_scan_sorted_lex(self):
        db = InMemoryDB()
        db.set("u", "name", "A")
        db.set("u", "age", "30")
        self.assertEqual(db.scan("u"), "age(30), name(A)")

    def testLevel2_scan_by_prefix(self):
        db = InMemoryDB()
        db.set("u", "name_a", "1")
        db.set("u", "name_b", "2")
        db.set("u", "other", "3")
        self.assertEqual(db.scan_by_prefix("u", "name_"), "name_a(1), name_b(2)")

    def testLevel2_scan_by_prefix_no_match(self):
        db = InMemoryDB()
        db.set("u", "x", "1")
        self.assertEqual(db.scan_by_prefix("u", "name"), "")
`;

const TESTS_3 = `import unittest
from solution import InMemoryDB


class Level3Tests(unittest.TestCase):
    def testLevel3_set_at_then_get_at(self):
        db = InMemoryDB()
        db.set_at("u", "a", "1", 5)
        self.assertEqual(db.get_at("u", "a", 6), "1")

    def testLevel3_ttl_dead_at_expiry(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u", "a", "1", 10, 5)
        self.assertEqual(db.get_at("u", "a", 14), "1")
        self.assertIsNone(db.get_at("u", "a", 15))

    def testLevel3_scan_at_filters_dead(self):
        db = InMemoryDB()
        db.set_at("u", "perm", "1", 0)
        db.set_at_with_ttl("u", "temp", "2", 0, 5)
        self.assertEqual(db.scan_at("u", 3), "perm(1), temp(2)")
        self.assertEqual(db.scan_at("u", 10), "perm(1)")

    def testLevel3_delete_at_only_when_live(self):
        db = InMemoryDB()
        db.set_at_with_ttl("u", "a", "1", 0, 5)
        self.assertFalse(db.delete_at("u", "a", 10))
        self.assertTrue(db.delete_at("u", "a", 2))

    def testLevel3_l1_methods_still_work(self):
        db = InMemoryDB()
        db.set("u", "a", "1")
        self.assertEqual(db.get_at("u", "a", 10**9), "1")
`;

const TESTS_4 = `import unittest
from solution import InMemoryDB


class Level4Tests(unittest.TestCase):
    def testLevel4_merge_basic_copies_non_conflicting(self):
        db = InMemoryDB()
        db.set_at("target", "a", "1", 0)
        db.set_at("source", "b", "2", 0)
        db.set_at("source", "c", "3", 0)
        copied = db.merge_records(5, "target", "source")
        self.assertEqual(copied, 2)
        self.assertEqual(db.get_at("target", "a", 10), "1")
        self.assertEqual(db.get_at("target", "b", 10), "2")
        self.assertEqual(db.get_at("target", "c", 10), "3")

    def testLevel4_merge_drops_source(self):
        db = InMemoryDB()
        db.set_at("t", "a", "1", 0)
        db.set_at("s", "b", "2", 0)
        db.merge_records(5, "t", "s")
        self.assertEqual(db.scan_at("s", 10), "")

    def testLevel4_merge_target_value_wins_on_collision(self):
        db = InMemoryDB()
        db.set_at("t", "shared", "TARGET", 0)
        db.set_at("s", "shared", "source", 0)
        db.set_at("s", "only_in_source", "x", 0)
        copied = db.merge_records(5, "t", "s")
        self.assertEqual(db.get_at("t", "shared", 10), "TARGET")
        self.assertEqual(db.get_at("t", "only_in_source", 10), "x")
        self.assertEqual(copied, 1)

    def testLevel4_merge_skips_expired_source_fields(self):
        db = InMemoryDB()
        db.set_at("t", "a", "1", 0)
        db.set_at_with_ttl("s", "dead", "x", 0, 5)
        db.set_at("s", "alive", "y", 0)
        copied = db.merge_records(10, "t", "s")
        self.assertEqual(copied, 1)
        self.assertIsNone(db.get_at("t", "dead", 10))
        self.assertEqual(db.get_at("t", "alive", 10), "y")

    def testLevel4_merge_self_returns_zero(self):
        db = InMemoryDB()
        db.set_at("t", "a", "1", 0)
        self.assertEqual(db.merge_records(5, "t", "t"), 0)

    def testLevel4_merge_missing_returns_zero(self):
        db = InMemoryDB()
        db.set_at("t", "a", "1", 0)
        self.assertEqual(db.merge_records(5, "t", "ghost"), 0)
        self.assertEqual(db.merge_records(5, "ghost", "t"), 0)
`;

export default {
  id: "mock-imdb-merge-4",
  title: "In-Memory DB (merge) — 4-level Mock",
  domain: "Key-Value Store",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "InMemoryDB",
  pointsPerLevel: 250,
  blurb:
    "Alt-L4 variant of the canonical In-Memory DB mock. Same L1-L3 as mock-imdb-4 — different capstone. " +
    "L4 here is RECORD MERGE: fold one record into another, target wins collisions, expired source fields are skipped.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Records, Fields & Values", points: 250, mode: "sync",
      changed: "Identical L1 to the canonical mock. Same advice: store fields as cells with `(value, set_at, expiry)`.",
      spec: `# Level 1 — Records, Fields & Values

Same as the canonical In-Memory DB mock:

- \`set(key, field, value)\` — set or overwrite.
- \`get(key, field)\` — value or \`None\`.
- \`delete(key, field)\` — \`True\` if removed, \`False\` if absent.

Same storage advice: build cells as \`(value, set_at, expiry)\` from L1.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Formatted Scans", points: 250, mode: "sync",
      changed: "Identical L2 — scans return `field(value), field(value)` strings sorted lex.",
      spec: `# Level 2 — Formatted Scans

Identical to the canonical mock.

- \`scan(key)\` — return all fields formatted as \`"field(value), …"\`, lex-sorted. \`""\` if the record does not exist.
- \`scan_by_prefix(key, prefix)\` — same, filtered to fields starting with \`prefix\`.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Timestamps & TTL", points: 250, mode: "sync",
      changed: "Identical L3 — the timestamp refactor. Same six `_at` methods.",
      spec: `# Level 3 — Timestamps & TTL

Identical to the canonical mock. Add six methods:

- \`set_at(key, field, value, timestamp)\`
- \`set_at_with_ttl(key, field, value, timestamp, ttl)\` — alive on \`[ts, ts + ttl)\`
- \`get_at(key, field, timestamp)\`
- \`delete_at(key, field, timestamp)\` — \`True\` only if present **and live** at \`timestamp\`
- \`scan_at(key, timestamp)\`
- \`scan_by_prefix_at(key, prefix, timestamp)\`

L1/L2 calls keep working.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Record Merge", points: 250, mode: "sync",
      changed: "Capstone — fold one record into another with collision rules.",
      spec: `# Level 4 — Record Merge

Add a single method:

- \`merge_records(timestamp, key_target, key_source)\` — fold every live field of \`key_source\` into \`key_target\` at \`timestamp\`. Returns the **count** of fields actually copied.

**Conflict & liveness rules**

- A field that is **dead** (expired) in the source is skipped.
- A field that exists in **both** records: if the target's existing field is live at \`timestamp\`, the **target's value wins** and the source's is dropped. (If the target's field is dead at \`timestamp\`, the source's live field overwrites it.)
- After the merge, the source record is **deleted** entirely.
- Returns \`0\` if either record is missing, or if \`key_target == key_source\`.

> The trick: don't iterate source while mutating target's underlying dict in-place — build the new field set in a temporary dict, then assign it. The same trick the canonical L4 uses for backup snapshots.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
