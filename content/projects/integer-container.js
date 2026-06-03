/* Integer Container — the assessment platform practice task itself, as a 2-level
 * warm-up. Rehearse the exact playground problem before the real assessment. */

const STARTER = `class IntegerContainer:
    """A simple container of integer numbers. Implement the operations as you
    work through the two levels."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def add(self, value):
        pass

    def delete(self, value):
        pass
`;

const SOL_1 = `class IntegerContainer:
    def __init__(self):
        self._items = []

    def add(self, value):
        self._items.append(value)
        return len(self._items)

    def delete(self, value):
        if value in self._items:
            self._items.remove(value)
            return True
        return False
`;

const SOL_2 = SOL_1 + `
    def get_median(self):
        if not self._items:
            return None
        ordered = sorted(self._items)
        return ordered[(len(ordered) - 1) // 2]
`;

const TESTS_1 = `import unittest
from solution import IntegerContainer


class Level1Tests(unittest.TestCase):
    def testLevel1_add_returns_count(self):
        c = IntegerContainer()
        self.assertEqual(c.add(5), 1)
        self.assertEqual(c.add(10), 2)
        self.assertEqual(c.add(5), 3)

    def testLevel1_delete_present_returns_true(self):
        c = IntegerContainer()
        c.add(5)
        c.add(10)
        self.assertTrue(c.delete(10))

    def testLevel1_delete_absent_returns_false(self):
        c = IntegerContainer()
        c.add(5)
        self.assertFalse(c.delete(1))

    def testLevel1_delete_removes_one_occurrence(self):
        c = IntegerContainer()
        c.add(5)
        c.add(5)
        self.assertTrue(c.delete(5))
        self.assertTrue(c.delete(5))
        self.assertFalse(c.delete(5))

    def testLevel1_example_sequence(self):
        c = IntegerContainer()
        self.assertEqual(c.add(5), 1)
        self.assertEqual(c.add(10), 2)
        self.assertEqual(c.add(5), 3)
        self.assertTrue(c.delete(10))
        self.assertFalse(c.delete(1))
        self.assertEqual(c.add(1), 3)
`;

const TESTS_2 = `import unittest
from solution import IntegerContainer


class Level2Tests(unittest.TestCase):
    def testLevel2_median_odd_count(self):
        c = IntegerContainer()
        for v in (3, 1, 2):
            c.add(v)
        self.assertEqual(c.get_median(), 2)

    def testLevel2_median_even_count_is_lower_middle(self):
        c = IntegerContainer()
        for v in (1, 2, 3, 4):
            c.add(v)
        self.assertEqual(c.get_median(), 2)

    def testLevel2_median_single_value(self):
        c = IntegerContainer()
        c.add(7)
        self.assertEqual(c.get_median(), 7)

    def testLevel2_median_unsorted_input(self):
        c = IntegerContainer()
        for v in (50, 10, 30, 20, 40):
            c.add(v)
        self.assertEqual(c.get_median(), 30)

    def testLevel2_median_reflects_deletes(self):
        c = IntegerContainer()
        for v in (1, 2, 3, 4, 5):
            c.add(v)
        c.delete(5)
        c.delete(4)
        self.assertEqual(c.get_median(), 2)
`;

export default {
  id: "integer-container",
  title: "Integer Container",
  domain: "Warm-up",
  kind: "practice",
  implFile: "solution.py",
  className: "IntegerContainer",
  pointsPerLevel: 100,
  blurb: "The exact assessment platform practice task — a 2-level warm-up for the testing environment.",
  starterCode: STARTER,
  levels: [
    {
      n: 1,
      title: "Add & Remove",
      points: 100,
      mode: "sync",
      changed: "The assessment platform practice task, recreated — start here to rehearse the workflow.",
      spec: `# Level 1 — Add & Remove

This is the assessment platform **practice task**, recreated here so you can rehearse the exact playground problem. Implement a simple container of integers; it starts empty.

- \`add(value)\` — add \`value\` to the container; return the **number of integers** in the container afterwards.
- \`delete(value)\` — if \`value\` is present, remove **one** occurrence and return \`True\`; otherwise return \`False\`.

**Example**

\`\`\`
add(5)      -> 1     [5]
add(10)     -> 2     [5, 10]
add(5)      -> 3     [5, 10, 5]
delete(10)  -> True  [5, 5]
delete(1)   -> False [5, 5]
add(1)      -> 3     [5, 5, 1]
\`\`\``,
      tests: TESTS_1,
      solution: SOL_1,
    },
    {
      n: 2,
      title: "Median",
      points: 100,
      mode: "sync",
      changed: "Adds get_median over the stored numbers.",
      spec: `# Level 2 — Median

Add one operation:

- \`get_median()\` — return the **median** of the numbers currently in the container.

The median is the middle value of the numbers in sorted order. When the count is **even**, return the **lower** of the two middle values. (Conventions vary — on the real assessment, let the tests tell you.) With an empty container, return \`None\`.`,
      tests: TESTS_2,
      solution: SOL_2,
    },
  ],
};
