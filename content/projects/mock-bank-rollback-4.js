/* mock-bank-rollback-4 — Banking System, alt-L4 variant.
 *
 * L1-L3 identical to mock-bank-4 (accounts → top_spenders → cashback).
 * L4 swapped: instead of merge_accounts + get_balance, the capstone is
 * ROLLBACK to a past timestamp — undo every operation issued after the
 * rollback target, including reversing any cashback that had already
 * landed.
 *
 * Rationale: this exposes candidates to a different L4 storage requirement
 * (event-sourcing-style replay) while reusing the L1-L3 reps. The
 * file-storage mock also rolls back, but here the wrinkle is reversing
 * already-credited cashback — the bank's processed-payment set is also
 * rewound.
 */

const STARTER = `class BankingSystem:
    """Same L1-L3 as mock-bank-4 — different L4 (rollback). Build in order."""

    def __init__(self):
        pass

    def create_account(self, timestamp, account_id):
        pass

    def deposit(self, timestamp, account_id, amount):
        pass

    def transfer(self, timestamp, source_id, target_id, amount):
        pass
`;

/* L1-L3 implementations identical in approach to mock-bank-4. Re-stated here
 * so the project is fully self-contained. Each public method also records to
 * an append-only history list — L4 replays it. */

const SOL_1 = `class BankingSystem:
    def __init__(self):
        self._accounts = {}
        self._history = []  # (timestamp, op, args)

    def _exists(self, account_id):
        return account_id in self._accounts

    def _log(self, account_id, timestamp, kind, amount):
        self._accounts[account_id]["log"].append((timestamp, kind, amount))

    def _record(self, timestamp, op, args):
        self._history.append((timestamp, op, args))

    def create_account(self, timestamp, account_id):
        if self._exists(account_id):
            return False
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        self._record(timestamp, "create_account", (account_id,))
        return True

    def deposit(self, timestamp, account_id, amount):
        if not self._exists(account_id):
            return None
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, timestamp, "deposit", amount)
        self._record(timestamp, "deposit", (account_id, amount))
        return self._accounts[account_id]["balance"]

    def transfer(self, timestamp, source_id, target_id, amount):
        if source_id == target_id:
            return None
        if not (self._exists(source_id) and self._exists(target_id)):
            return None
        if self._accounts[source_id]["balance"] < amount:
            return None
        self._accounts[source_id]["balance"] -= amount
        self._accounts[target_id]["balance"] += amount
        self._accounts[source_id]["outgoing"] += amount
        self._log(source_id, timestamp, "transfer_out", amount)
        self._log(target_id, timestamp, "transfer_in", amount)
        self._record(timestamp, "transfer", (source_id, target_id, amount))
        return self._accounts[source_id]["balance"]
`;

const SOL_2 = SOL_1 + `
    def top_spenders(self, timestamp, n):
        ranked = sorted(
            self._accounts.items(),
            key=lambda kv: (-kv[1]["outgoing"], kv[0]),
        )
        return [aid + "(" + str(acc["outgoing"]) + ")" for aid, acc in ranked[:n]]
`;

const SOL_3 = `class BankingSystem:
    CASHBACK_DELAY = 86_400_000
    CASHBACK_RATE = 2

    def __init__(self):
        self._accounts = {}
        self._pending = {}
        self._processed = set()
        self._payment_counter = 0
        self._payment_meta = {}  # pid -> (timestamp, account_id, amount)
        self._history = []

    # ---- helpers ----
    def _exists(self, account_id):
        return account_id in self._accounts

    def _log(self, account_id, timestamp, kind, amount):
        self._accounts[account_id]["log"].append((timestamp, kind, amount))

    def _record(self, timestamp, op, args):
        self._history.append((timestamp, op, args))

    def _process_due(self, now):
        for pid, info in list(self._pending.items()):
            if info["due"] <= now:
                acc = self._accounts.get(info["account"])
                if acc is not None:
                    acc["balance"] += info["amount"]
                    self._log(info["account"], info["due"], "cashback", info["amount"])
                self._processed.add(pid)
                del self._pending[pid]

    # ---- L1 ----
    def create_account(self, timestamp, account_id):
        self._process_due(timestamp)
        if self._exists(account_id):
            return False
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        self._record(timestamp, "create_account", (account_id,))
        return True

    def deposit(self, timestamp, account_id, amount):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, timestamp, "deposit", amount)
        self._record(timestamp, "deposit", (account_id, amount))
        return self._accounts[account_id]["balance"]

    def transfer(self, timestamp, source_id, target_id, amount):
        self._process_due(timestamp)
        if source_id == target_id:
            return None
        if not (self._exists(source_id) and self._exists(target_id)):
            return None
        if self._accounts[source_id]["balance"] < amount:
            return None
        self._accounts[source_id]["balance"] -= amount
        self._accounts[target_id]["balance"] += amount
        self._accounts[source_id]["outgoing"] += amount
        self._log(source_id, timestamp, "transfer_out", amount)
        self._log(target_id, timestamp, "transfer_in", amount)
        self._record(timestamp, "transfer", (source_id, target_id, amount))
        return self._accounts[source_id]["balance"]

    # ---- L2 ----
    def top_spenders(self, timestamp, n):
        self._process_due(timestamp)
        ranked = sorted(
            self._accounts.items(),
            key=lambda kv: (-kv[1]["outgoing"], kv[0]),
        )
        return [aid + "(" + str(acc["outgoing"]) + ")" for aid, acc in ranked[:n]]

    # ---- L3 ----
    def pay(self, timestamp, account_id, amount):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        if self._accounts[account_id]["balance"] < amount:
            return None
        self._accounts[account_id]["balance"] -= amount
        self._accounts[account_id]["outgoing"] += amount
        self._log(account_id, timestamp, "payment", amount)
        self._payment_counter += 1
        pid = "payment" + str(self._payment_counter)
        cashback = (amount * self.CASHBACK_RATE) // 100
        self._pending[pid] = {
            "account": account_id,
            "due": timestamp + self.CASHBACK_DELAY,
            "amount": cashback,
        }
        self._payment_meta[pid] = (timestamp, account_id, amount)
        self._record(timestamp, "pay", (account_id, amount, pid))
        return pid

    def get_payment_status(self, timestamp, account_id, payment):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        meta = self._payment_meta.get(payment)
        if meta is None or meta[1] != account_id:
            return None
        if payment in self._pending:
            return "IN_PROGRESS"
        if payment in self._processed:
            return "CASHBACK_RECEIVED"
        return None
`;

const SOL_4 = SOL_3 + `
    # ---- L4 rollback ----
    def rollback(self, timestamp):
        """Undo every public operation issued after \`timestamp\`. Replay the
        history list up to and including operations at \`timestamp\`. Cashback
        that landed at a time > \`timestamp\` is also rolled back."""
        old_history = list(self._history)
        # reset every mutable piece of state
        self._accounts = {}
        self._pending = {}
        self._processed = set()
        self._payment_counter = 0
        self._payment_meta = {}
        self._history = []
        # replay every op whose ts <= target — but use the raw replay path
        for ts, op, args in old_history:
            if ts > timestamp:
                continue
            if op == "create_account":
                self._replay_create(ts, args[0])
            elif op == "deposit":
                self._replay_deposit(ts, args[0], args[1])
            elif op == "transfer":
                self._replay_transfer(ts, args[0], args[1], args[2])
            elif op == "pay":
                self._replay_pay(ts, args[0], args[1], args[2])
        # process cashback that should have landed at or before the rollback target
        for pid, info in list(self._pending.items()):
            if info["due"] <= timestamp:
                acc = self._accounts.get(info["account"])
                if acc is not None:
                    acc["balance"] += info["amount"]
                    self._log(info["account"], info["due"], "cashback", info["amount"])
                self._processed.add(pid)
                del self._pending[pid]

    def _replay_create(self, ts, account_id):
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        self._history.append((ts, "create_account", (account_id,)))

    def _replay_deposit(self, ts, account_id, amount):
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, ts, "deposit", amount)
        self._history.append((ts, "deposit", (account_id, amount)))

    def _replay_transfer(self, ts, source_id, target_id, amount):
        self._accounts[source_id]["balance"] -= amount
        self._accounts[target_id]["balance"] += amount
        self._accounts[source_id]["outgoing"] += amount
        self._log(source_id, ts, "transfer_out", amount)
        self._log(target_id, ts, "transfer_in", amount)
        self._history.append((ts, "transfer", (source_id, target_id, amount)))

    def _replay_pay(self, ts, account_id, amount, pid):
        self._accounts[account_id]["balance"] -= amount
        self._accounts[account_id]["outgoing"] += amount
        self._log(account_id, ts, "payment", amount)
        cashback = (amount * self.CASHBACK_RATE) // 100
        self._pending[pid] = {
            "account": account_id,
            "due": ts + self.CASHBACK_DELAY,
            "amount": cashback,
        }
        self._payment_meta[pid] = (ts, account_id, amount)
        # bump counter so the next pay() after rollback gets a fresh id
        num = int(pid.replace("payment", ""))
        if num > self._payment_counter:
            self._payment_counter = num
        self._history.append((ts, "pay", (account_id, amount, pid)))
`;

const TESTS_1 = `import unittest
from solution import BankingSystem


class Level1Tests(unittest.TestCase):
    def testLevel1_create_unique(self):
        b = BankingSystem()
        self.assertTrue(b.create_account(1, "a"))
        self.assertFalse(b.create_account(2, "a"))

    def testLevel1_deposit_returns_balance(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertEqual(b.deposit(2, "a", 100), 100)
        self.assertEqual(b.deposit(3, "a", 50), 150)

    def testLevel1_transfer_basic(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 200)
        self.assertEqual(b.transfer(3, "a", "b", 50), 150)

    def testLevel1_transfer_insufficient_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 30)
        self.assertIsNone(b.transfer(3, "a", "b", 50))

    def testLevel1_transfer_unknown_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        self.assertIsNone(b.transfer(3, "a", "ghost", 10))

    def testLevel1_transfer_self_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        self.assertIsNone(b.transfer(3, "a", "a", 10))
`;

const TESTS_2 = `import unittest
from solution import BankingSystem


class Level2Tests(unittest.TestCase):
    def testLevel2_top_spenders_basic(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 1000)
        b.deposit(2, "b", 1000)
        b.transfer(3, "a", "b", 300)
        b.transfer(3, "b", "a", 100)
        self.assertEqual(b.top_spenders(4, 2), ["a(300)", "b(100)"])

    def testLevel2_top_spenders_ties_lex(self):
        b = BankingSystem()
        b.create_account(1, "z")
        b.create_account(1, "a")
        for aid in ("z", "a"):
            b.deposit(2, aid, 100)
        b.transfer(3, "z", "a", 50)
        b.transfer(3, "a", "z", 50)
        self.assertEqual(b.top_spenders(4, 2), ["a(50)", "z(50)"])

    def testLevel2_top_spenders_empty(self):
        b = BankingSystem()
        self.assertEqual(b.top_spenders(1, 3), [])
`;

const TESTS_3 = `import unittest
from solution import BankingSystem


DAY = 86_400_000


class Level3Tests(unittest.TestCase):
    def testLevel3_pay_returns_unique_id(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        self.assertEqual(b.pay(3, "a", 100), "payment1")
        self.assertEqual(b.pay(4, "a", 50), "payment2")

    def testLevel3_pay_insufficient_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertIsNone(b.pay(2, "a", 10))

    def testLevel3_status_in_progress(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(3, "a", 100)
        self.assertEqual(b.get_payment_status(4, "a", pid), "IN_PROGRESS")

    def testLevel3_status_cashback_received_after_24h(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(10, "a", 100)
        b.deposit(10 + DAY + 1, "a", 0)
        self.assertEqual(b.get_payment_status(10 + DAY + 2, "a", pid), "CASHBACK_RECEIVED")

    def testLevel3_status_wrong_account_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 100)
        pid = b.pay(3, "a", 10)
        self.assertIsNone(b.get_payment_status(4, "b", pid))
`;

const TESTS_4 = `import unittest
from solution import BankingSystem


DAY = 86_400_000


class Level4Tests(unittest.TestCase):
    def testLevel4_rollback_undoes_later_deposits(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        b.deposit(20, "a", 50)
        b.deposit(30, "a", 25)
        b.rollback(15)
        # only the t=1 create and t=2 deposit survive
        self.assertEqual(b.deposit(40, "a", 0), 100)

    def testLevel4_rollback_undoes_account_creation(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(20, "b")
        b.deposit(25, "b", 500)
        b.rollback(10)
        # "b" never existed at t=10
        self.assertIsNone(b.deposit(50, "b", 100))
        # "a" still exists
        self.assertEqual(b.deposit(50, "a", 7), 7)

    def testLevel4_rollback_preserves_pre_target_cashback(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(10, "a", 500)   # cashback of 10 due at 10 + DAY
        # rollback after the cashback should land
        b.rollback(10 + DAY + 1)
        # cashback already due → it lands during rollback's replay
        self.assertEqual(b.deposit(10 + DAY + 5, "a", 0), 510)

    def testLevel4_rollback_undoes_post_target_cashback(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(10, "a", 500)
        # advance past cashback once to trigger original processing
        b.deposit(10 + DAY + 1, "a", 0)
        # now rollback to BEFORE cashback time
        b.rollback(10 + DAY - 1)
        # at any t strictly before the cashback due moment, only the pay debit remains
        bal_after = b.deposit(10 + DAY - 1, "a", 0)
        self.assertEqual(bal_after, 500)  # 1000 - 500 pay, no cashback yet
        # status at the same pre-cashback moment reverts to IN_PROGRESS
        self.assertEqual(b.get_payment_status(10 + DAY - 1, "a", pid), "IN_PROGRESS")
`;

export default {
  id: "mock-bank-rollback-4",
  title: "Banking System (rollback) — 4-level Mock",
  domain: "Banking · Event Sourcing",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "BankingSystem",
  pointsPerLevel: 250,
  blurb:
    "Alt-L4 variant of the canonical Banking mock. Same L1-L3 (accounts → top_spenders → cashback) — different capstone. " +
    "L4 here is ROLLBACK: replay the history list to a past timestamp, undoing every later op and reversing already-landed cashback.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Accounts, Deposits & Transfers", points: 250, mode: "sync",
      changed: "Identical L1 to the canonical mock — every method records into an append-only history list for L4.",
      spec: `# Level 1 — Accounts, Deposits & Transfers

Identical to the canonical Banking mock. Three methods, each taking \`timestamp\` first. **Record every mutation in an append-only history list from day one** — L4's rollback replays it.

- \`create_account(timestamp, account_id)\`
- \`deposit(timestamp, account_id, amount)\`
- \`transfer(timestamp, source_id, target_id, amount)\``,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Top Spenders", points: 250, mode: "sync",
      changed: "Identical to the canonical mock — `\"id(total)\"` strings, desc by total, lex tie-break.",
      spec: `# Level 2 — Top Spenders

Identical to the canonical mock.

- \`top_spenders(timestamp, n)\` — list of \`"<id>(<total>)"\` strings, ordered by outgoing total descending, id ascending lex.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Payments & Cashback", points: 250, mode: "sync",
      changed: "Identical to the canonical mock — `pay` debits and schedules a 2% cashback 24 hours later.",
      spec: `# Level 3 — Payments & Cashback

Identical to the canonical mock.

- \`pay(timestamp, account_id, amount)\` — debits the account, schedules 2% cashback for \`timestamp + 86_400_000\` ms. Returns \`"paymentN"\` id; \`None\` on missing/insufficient.
- \`get_payment_status(timestamp, account_id, payment)\` — \`"IN_PROGRESS"\` / \`"CASHBACK_RECEIVED"\` / \`None\`.

> Record \`pay\` ops in the history too — including the assigned payment id — so L4 can replay them deterministically.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Rollback", points: 250, mode: "sync",
      changed: "Capstone — return the bank to a past timestamp, undoing every later op.",
      spec: `# Level 4 — Rollback

Add a single method:

- \`rollback(timestamp)\` — return the bank to its state immediately after the last operation issued at or before \`timestamp\`. Every later operation is undone:
  - Accounts created after \`timestamp\` no longer exist.
  - Deposits, transfers, payments after \`timestamp\` are reversed.
  - **Cashback that landed at a time \`> timestamp\` is undone** — the cashback amount is removed and the payment's status reverts to \`"IN_PROGRESS"\`.
  - Cashback whose **due time** is \`<= timestamp\` lands during the replay (so a rollback to a time past the cashback maturity sees the cashback already credited).

**The design pattern**

Build an append-only history list of \`(timestamp, op, args)\` in L1/L3. \`rollback\` resets every mutable field, then replays the history up to and including \`timestamp\`. After replay, drain any pending cashback whose due time is at or before \`timestamp\`.

> The payment id counter should reset such that a new \`pay\` after rollback continues numbering from the last surviving payment id.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
