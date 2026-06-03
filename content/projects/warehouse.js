/* Inventory & Warehouse — a 6-level progressive project (synchronous).
 * Stock CRUD → categories → ranking → perishable batches with TTL →
 * snapshots → transfers & restock. */

const STARTER = `class Warehouse:
    """A warehouse inventory. Each product has a SKU and a quantity in stock.
    Implement the methods below as you progress through the six levels."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def add_product(self, sku, quantity):
        pass

    def add_stock(self, sku, quantity):
        pass

    def remove_stock(self, sku, quantity):
        pass

    def quantity(self, sku):
        pass
`;

const SOL_1 = `class Warehouse:
    def __init__(self):
        self._products = {}  # sku -> {"qty", "category"}

    def add_product(self, sku, quantity):
        if sku in self._products:
            return False
        self._products[sku] = {"qty": quantity, "category": None}
        return True

    def add_stock(self, sku, quantity):
        p = self._products.get(sku)
        if p is None:
            return None
        p["qty"] += quantity
        return p["qty"]

    def remove_stock(self, sku, quantity):
        p = self._products.get(sku)
        if p is None or quantity > p["qty"]:
            return None
        p["qty"] -= quantity
        return p["qty"]

    def quantity(self, sku):
        p = self._products.get(sku)
        return p["qty"] if p else None
`;

const SOL_2 = SOL_1 + `
    def set_category(self, sku, category):
        p = self._products.get(sku)
        if p is None:
            return False
        p["category"] = category
        return True

    def products_in_category(self, category):
        return sorted(s for s, p in self._products.items() if p["category"] == category)

    def total_quantity(self):
        return sum(p["qty"] for p in self._products.values())

    def low_stock(self, threshold):
        return sorted(s for s, p in self._products.items() if p["qty"] < threshold)
`;

const SOL_3 = SOL_2 + `
    def top_stocked(self, n):
        return sorted(self._products, key=lambda s: (-self._products[s]["qty"], s))[:n]

    def category_quantity(self, category):
        return sum(p["qty"] for p in self._products.values() if p["category"] == category)
`;

/* Level 4 refactors stock into dated, perishable batches. */
const SOL_4 = `import copy


class Warehouse:
    def __init__(self):
        self._products = {}  # sku -> {"category", "batches": [[qty, added_at, expiry], ...]}
        self._snapshots = {}
        self._snap_id = 0

    def _total(self, product):
        return sum(b[0] for b in product["batches"])

    def _consume(self, product, qty, live_only, timestamp):
        batches = product["batches"]
        usable = lambda b: (not live_only) or (b[2] is None or timestamp < b[2])
        if sum(b[0] for b in batches if usable(b)) < qty:
            return False
        remaining = qty
        for b in sorted(batches, key=lambda x: x[1]):
            if remaining <= 0:
                break
            if not usable(b):
                continue
            take = min(b[0], remaining)
            b[0] -= take
            remaining -= take
        product["batches"] = [b for b in batches if b[0] > 0]
        return True

    def add_product(self, sku, quantity):
        if sku in self._products:
            return False
        self._products[sku] = {"category": None, "batches": [[quantity, 0, None]]}
        return True

    def add_stock(self, sku, quantity):
        p = self._products.get(sku)
        if p is None:
            return None
        p["batches"].append([quantity, 0, None])
        return self._total(p)

    def remove_stock(self, sku, quantity):
        p = self._products.get(sku)
        if p is None or not self._consume(p, quantity, False, 0):
            return None
        return self._total(p)

    def quantity(self, sku):
        p = self._products.get(sku)
        return self._total(p) if p else None

    def set_category(self, sku, category):
        p = self._products.get(sku)
        if p is None:
            return False
        p["category"] = category
        return True

    def products_in_category(self, category):
        return sorted(s for s, p in self._products.items() if p["category"] == category)

    def total_quantity(self):
        return sum(self._total(p) for p in self._products.values())

    def low_stock(self, threshold):
        return sorted(s for s, p in self._products.items() if self._total(p) < threshold)

    def top_stocked(self, n):
        return sorted(self._products, key=lambda s: (-self._total(self._products[s]), s))[:n]

    def category_quantity(self, category):
        return sum(self._total(p) for p in self._products.values() if p["category"] == category)

    def add_stock_at(self, sku, quantity, timestamp, shelf_life=None):
        p = self._products.get(sku)
        if p is None:
            return None
        expiry = None if shelf_life is None else timestamp + shelf_life
        p["batches"].append([quantity, timestamp, expiry])
        return self.quantity_at(sku, timestamp)

    def quantity_at(self, sku, timestamp):
        p = self._products.get(sku)
        if p is None:
            return None
        return sum(b[0] for b in p["batches"] if b[2] is None or timestamp < b[2])

    def remove_stock_at(self, sku, quantity, timestamp):
        p = self._products.get(sku)
        if p is None or not self._consume(p, quantity, True, timestamp):
            return None
        return self.quantity_at(sku, timestamp)
`;

const SOL_5 = SOL_4 + `
    def snapshot(self):
        self._snap_id += 1
        self._snapshots[self._snap_id] = copy.deepcopy(self._products)
        return self._snap_id

    def restore(self, snapshot_id):
        snap = self._snapshots.get(snapshot_id)
        if snap is None:
            return
        self._products = copy.deepcopy(snap)
`;

const SOL_6 = SOL_5 + `
    def transfer(self, sku, quantity, target):
        if self.remove_stock(sku, quantity) is None:
            return False
        if target.quantity(sku) is None:
            target.add_product(sku, 0)
        target.add_stock(sku, quantity)
        return True

    def restock_needed(self, threshold):
        return sorted(s for s, p in self._products.items() if self._total(p) < threshold)
`;

const TESTS_1 = `import unittest
from solution import Warehouse


class Level1Tests(unittest.TestCase):
    def testLevel1_add_product(self):
        self.assertTrue(Warehouse().add_product("sku1", 10))

    def testLevel1_add_duplicate_returns_false(self):
        w = Warehouse()
        w.add_product("sku1", 10)
        self.assertFalse(w.add_product("sku1", 5))

    def testLevel1_add_stock(self):
        w = Warehouse()
        w.add_product("sku1", 10)
        self.assertEqual(w.add_stock("sku1", 5), 15)

    def testLevel1_add_stock_missing_sku(self):
        self.assertIsNone(Warehouse().add_stock("ghost", 5))

    def testLevel1_remove_stock(self):
        w = Warehouse()
        w.add_product("sku1", 10)
        self.assertEqual(w.remove_stock("sku1", 4), 6)

    def testLevel1_remove_insufficient(self):
        w = Warehouse()
        w.add_product("sku1", 10)
        self.assertIsNone(w.remove_stock("sku1", 50))
        self.assertEqual(w.quantity("sku1"), 10)

    def testLevel1_quantity_missing(self):
        self.assertIsNone(Warehouse().quantity("ghost"))
`;

const TESTS_2 = `import unittest
from solution import Warehouse


class Level2Tests(unittest.TestCase):
    def _wh(self):
        w = Warehouse()
        for sku, qty in [("a", 5), ("b", 30), ("c", 12)]:
            w.add_product(sku, qty)
        return w

    def testLevel2_set_and_query_category(self):
        w = self._wh()
        w.set_category("a", "tools")
        w.set_category("c", "tools")
        self.assertEqual(w.products_in_category("tools"), ["a", "c"])

    def testLevel2_set_category_missing(self):
        self.assertFalse(Warehouse().set_category("ghost", "x"))

    def testLevel2_total_quantity(self):
        self.assertEqual(self._wh().total_quantity(), 47)

    def testLevel2_low_stock(self):
        self.assertEqual(self._wh().low_stock(13), ["a", "c"])

    def testLevel2_low_stock_strictly_below(self):
        w = Warehouse()
        w.add_product("a", 10)
        self.assertEqual(w.low_stock(10), [])
`;

const TESTS_3 = `import unittest
from solution import Warehouse


class Level3Tests(unittest.TestCase):
    def testLevel3_top_stocked(self):
        w = Warehouse()
        for sku, qty in [("a", 5), ("b", 30), ("c", 12)]:
            w.add_product(sku, qty)
        self.assertEqual(w.top_stocked(2), ["b", "c"])

    def testLevel3_top_stocked_tie_break(self):
        w = Warehouse()
        w.add_product("z", 10)
        w.add_product("a", 10)
        self.assertEqual(w.top_stocked(2), ["a", "z"])

    def testLevel3_category_quantity(self):
        w = Warehouse()
        for sku, qty in [("a", 5), ("b", 30), ("c", 12)]:
            w.add_product(sku, qty)
        w.set_category("a", "tools")
        w.set_category("c", "tools")
        self.assertEqual(w.category_quantity("tools"), 17)

    def testLevel3_top_n_exceeds_count(self):
        w = Warehouse()
        w.add_product("a", 5)
        self.assertEqual(w.top_stocked(9), ["a"])
`;

const TESTS_4 = `import unittest
from solution import Warehouse


class Level4Tests(unittest.TestCase):
    def testLevel4_add_stock_at(self):
        w = Warehouse()
        w.add_product("a", 0)
        self.assertEqual(w.add_stock_at("a", 10, 0), 10)

    def testLevel4_perishable_batch_expires(self):
        w = Warehouse()
        w.add_product("a", 0)
        w.add_stock_at("a", 10, 0, 5)
        self.assertEqual(w.quantity_at("a", 4), 10)
        self.assertEqual(w.quantity_at("a", 5), 0)

    def testLevel4_remove_consumes_oldest_first(self):
        w = Warehouse()
        w.add_product("a", 0)
        w.add_stock_at("a", 10, 0)
        w.add_stock_at("a", 5, 10)
        self.assertEqual(w.remove_stock_at("a", 12, 20), 3)

    def testLevel4_remove_insufficient_live_stock(self):
        w = Warehouse()
        w.add_product("a", 0)
        w.add_stock_at("a", 10, 0, 5)
        self.assertIsNone(w.remove_stock_at("a", 5, 20))

    def testLevel4_level1_methods_still_work(self):
        w = Warehouse()
        w.add_product("a", 50)
        self.assertEqual(w.quantity("a"), 50)
        self.assertEqual(w.add_stock("a", 10), 60)
        self.assertEqual(w.remove_stock("a", 20), 40)
`;

const TESTS_5 = `import unittest
from solution import Warehouse


class Level5Tests(unittest.TestCase):
    def testLevel5_snapshot_and_restore(self):
        w = Warehouse()
        w.add_product("a", 10)
        sid = w.snapshot()
        w.add_stock("a", 90)
        w.restore(sid)
        self.assertEqual(w.quantity("a"), 10)

    def testLevel5_restore_unknown_is_noop(self):
        w = Warehouse()
        w.add_product("a", 10)
        w.restore(999)
        self.assertEqual(w.quantity("a"), 10)

    def testLevel5_restore_reverts_new_products(self):
        w = Warehouse()
        w.add_product("a", 10)
        sid = w.snapshot()
        w.add_product("b", 20)
        w.restore(sid)
        self.assertIsNone(w.quantity("b"))
`;

const TESTS_6 = `import unittest
from solution import Warehouse


class Level6Tests(unittest.TestCase):
    def testLevel6_transfer_moves_stock(self):
        a = Warehouse()
        b = Warehouse()
        a.add_product("sku1", 100)
        self.assertTrue(a.transfer("sku1", 40, b))
        self.assertEqual(a.quantity("sku1"), 60)
        self.assertEqual(b.quantity("sku1"), 40)

    def testLevel6_transfer_insufficient(self):
        a = Warehouse()
        b = Warehouse()
        a.add_product("sku1", 10)
        self.assertFalse(a.transfer("sku1", 50, b))
        self.assertEqual(a.quantity("sku1"), 10)

    def testLevel6_transfer_missing_sku(self):
        a = Warehouse()
        b = Warehouse()
        self.assertFalse(a.transfer("ghost", 5, b))

    def testLevel6_restock_needed(self):
        w = Warehouse()
        w.add_product("a", 5)
        w.add_product("b", 50)
        w.add_product("c", 8)
        self.assertEqual(w.restock_needed(10), ["a", "c"])
`;

export default {
  id: "warehouse",
  title: "Inventory & Warehouse",
  domain: "Inventory",
  kind: "exam",
  implFile: "solution.py",
  className: "Warehouse",
  pointsPerLevel: 100,
  blurb: "Stock CRUD, categories, ranking, perishable batches with TTL, snapshots, and transfers.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Stock Operations", points: 100, mode: "sync",
      changed: "The core stock operations.",
      spec: `# Level 1 — Stock Operations

Implement on \`Warehouse\`:

- \`add_product(sku, quantity)\` — register a product at a starting quantity. \`True\`, or \`False\` if the SKU exists.
- \`add_stock(sku, quantity)\` — add stock; return the new quantity, or \`None\` if no such SKU.
- \`remove_stock(sku, quantity)\` — remove stock; return the new quantity, or \`None\` if there is no such SKU or not enough stock (removing nothing).
- \`quantity(sku)\` — the current quantity, or \`None\`.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Categories", points: 100, mode: "sync",
      changed: "Adds product categories and filtered queries.",
      spec: `# Level 2 — Categories

Add:

- \`set_category(sku, category)\` — assign a category; \`False\` if the SKU is unknown.
- \`products_in_category(category)\` — a **sorted** list of SKUs in that category.
- \`total_quantity()\` — the total units across all products.
- \`low_stock(threshold)\` — sorted SKUs whose quantity is **strictly below** \`threshold\`.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Ranking", points: 100, mode: "sync",
      changed: "Adds a stock ranking and per-category totals.",
      spec: `# Level 3 — Ranking

Add:

- \`top_stocked(n)\` — the \`n\` SKUs with the most stock, by quantity **descending**, ties by **SKU ascending**.
- \`category_quantity(category)\` — the total units across all products in a category.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Perishable Batches", points: 100, mode: "sync",
      changed: "Stock becomes dated batches that can expire — and consumption is oldest-first.",
      spec: `# Level 4 — Perishable Batches

Stock is no longer a single number — it is a set of dated **batches**, each of which can perish.

- \`add_stock_at(sku, quantity, timestamp, shelf_life=None)\` — add a batch received at \`timestamp\`; with a \`shelf_life\` it expires at \`timestamp + shelf_life\`. Return the live quantity at \`timestamp\`, or \`None\` if no such SKU.
- \`quantity_at(sku, timestamp)\` — total **non-expired** units at \`timestamp\`, or \`None\`.
- \`remove_stock_at(sku, quantity, timestamp)\` — consume non-expired stock **oldest batch first** (FIFO). \`None\` if the SKU is missing or live stock is insufficient.

**The refactor**: a product's stock becomes a list of \`[quantity, added_at, expiry]\` batches. Your Level 1–3 methods must still pass — a plainly-added batch never expires.`,
      tests: TESTS_4, solution: SOL_4,
    },
    {
      n: 5, title: "Snapshots", points: 100, mode: "sync",
      changed: "Adds whole-warehouse snapshot and restore.",
      spec: `# Level 5 — Snapshots

Add:

- \`snapshot()\` — save the warehouse state; return an integer id.
- \`restore(snapshot_id)\` — revert to that snapshot; do nothing for an unknown id.

Use \`copy.deepcopy\` — the batch lists are nested and mutable.`,
      tests: TESTS_5, solution: SOL_5,
    },
    {
      n: 6, title: "Transfers & Restock", points: 100, mode: "sync",
      changed: "Adds inter-warehouse transfers and a restock report.",
      spec: `# Level 6 — Transfers & Restock

Add:

- \`transfer(sku, quantity, target)\` — move \`quantity\` units of \`sku\` from this warehouse to another \`Warehouse\`. Return \`False\` (changing nothing) if this warehouse lacks the SKU or the stock; otherwise move it and return \`True\`. Create the SKU in the target if needed.
- \`restock_needed(threshold)\` — a sorted list of SKUs whose total quantity is **below** \`threshold\`.`,
      tests: TESTS_6, solution: SOL_6,
    },
  ],
};
