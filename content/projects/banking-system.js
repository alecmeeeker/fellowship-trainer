/* Banking System — a 6-level progressive project (synchronous).
 * Accounts and balances → transfers → ranking → timestamped operations and
 * holds → statements & rollback → scheduled payments. */

const STARTER = `class BankingSystem:
    """A banking system. Accounts hold an integer balance. Implement the
    methods below as you progress through the six levels."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def create_account(self, account_id):
        pass

    def deposit(self, account_id, amount):
        pass

    def withdraw(self, account_id, amount):
        pass

    def balance(self, account_id):
        pass
`;

const SOL_1 = `class BankingSystem:
    def __init__(self):
        self._accounts = {}  # id -> {"balance": int, "txns": int}

    def create_account(self, account_id):
        if account_id in self._accounts:
            return False
        self._accounts[account_id] = {"balance": 0, "txns": 0}
        return True

    def deposit(self, account_id, amount):
        acct = self._accounts.get(account_id)
        if acct is None:
            return None
        acct["balance"] += amount
        acct["txns"] += 1
        return acct["balance"]

    def withdraw(self, account_id, amount):
        acct = self._accounts.get(account_id)
        if acct is None or amount > acct["balance"]:
            return None
        acct["balance"] -= amount
        acct["txns"] += 1
        return acct["balance"]

    def balance(self, account_id):
        acct = self._accounts.get(account_id)
        return acct["balance"] if acct else None
`;

const SOL_2 = SOL_1 + `
    def transfer(self, from_id, to_id, amount):
        src = self._accounts.get(from_id)
        dst = self._accounts.get(to_id)
        if src is None or dst is None or amount > src["balance"]:
            return False
        src["balance"] -= amount
        dst["balance"] += amount
        src["txns"] += 1
        dst["txns"] += 1
        return True

    def transaction_count(self, account_id):
        acct = self._accounts.get(account_id)
        return acct["txns"] if acct else None

    def total_balance(self):
        return sum(a["balance"] for a in self._accounts.values())
`;

const SOL_3 = SOL_2 + `
    def top_accounts_by_balance(self, n):
        return sorted(self._accounts, key=lambda a: (-self._accounts[a]["balance"], a))[:n]

    def top_accounts_by_activity(self, n):
        return sorted(self._accounts, key=lambda a: (-self._accounts[a]["txns"], a))[:n]
`;

/* Level 4 refactors the account record: it now carries a transaction log and
 * a list of holds. (snapshot / payment fields are set up here too, ready for
 * Levels 5 and 6 — a small, harmless bit of forward planning.) */
const SOL_4 = `import copy


class BankingSystem:
    def __init__(self):
        self._accounts = {}   # id -> {"balance","txns","log","holds"}
        self._snapshots = {}
        self._snap_id = 0
        self._payments = {}
        self._payment_id = 0

    def create_account(self, account_id):
        if account_id in self._accounts:
            return False
        self._accounts[account_id] = {"balance": 0, "txns": 0, "log": [], "holds": []}
        return True

    def deposit(self, account_id, amount, timestamp=0):
        acct = self._accounts.get(account_id)
        if acct is None:
            return None
        acct["balance"] += amount
        acct["txns"] += 1
        acct["log"].append((timestamp, "deposit", amount))
        return acct["balance"]

    def withdraw(self, account_id, amount, timestamp=0):
        acct = self._accounts.get(account_id)
        if acct is None or amount > acct["balance"]:
            return None
        acct["balance"] -= amount
        acct["txns"] += 1
        acct["log"].append((timestamp, "withdraw", amount))
        return acct["balance"]

    def balance(self, account_id):
        acct = self._accounts.get(account_id)
        return acct["balance"] if acct else None

    def transfer(self, from_id, to_id, amount, timestamp=0):
        src = self._accounts.get(from_id)
        dst = self._accounts.get(to_id)
        if src is None or dst is None or amount > src["balance"]:
            return False
        src["balance"] -= amount
        dst["balance"] += amount
        src["txns"] += 1
        dst["txns"] += 1
        src["log"].append((timestamp, "transfer_out", amount))
        dst["log"].append((timestamp, "transfer_in", amount))
        return True

    def transaction_count(self, account_id):
        acct = self._accounts.get(account_id)
        return acct["txns"] if acct else None

    def total_balance(self):
        return sum(a["balance"] for a in self._accounts.values())

    def top_accounts_by_balance(self, n):
        return sorted(self._accounts, key=lambda a: (-self._accounts[a]["balance"], a))[:n]

    def top_accounts_by_activity(self, n):
        return sorted(self._accounts, key=lambda a: (-self._accounts[a]["txns"], a))[:n]

    def place_hold(self, account_id, amount, timestamp, ttl):
        acct = self._accounts.get(account_id)
        if acct is None:
            return False
        acct["holds"].append((amount, timestamp + ttl))
        return True

    def available_balance(self, account_id, timestamp):
        acct = self._accounts.get(account_id)
        if acct is None:
            return None
        held = sum(amt for amt, expiry in acct["holds"] if timestamp < expiry)
        return acct["balance"] - held
`;

const SOL_5 = SOL_4 + `
    def snapshot(self, timestamp):
        self._snap_id += 1
        self._snapshots[self._snap_id] = copy.deepcopy(self._accounts)
        return self._snap_id

    def rollback(self, snapshot_id):
        snap = self._snapshots.get(snapshot_id)
        if snap is None:
            return
        self._accounts = copy.deepcopy(snap)

    def statement(self, account_id, start, end):
        acct = self._accounts.get(account_id)
        if acct is None:
            return []
        entries = [e for e in acct["log"] if start <= e[0] <= end]
        return sorted(entries, key=lambda e: e[0])
`;

const SOL_6 = SOL_5 + `
    def schedule_payment(self, account_id, amount, at):
        self._payment_id += 1
        pid = "payment" + str(self._payment_id)
        self._payments[pid] = {"account": account_id, "amount": amount,
                               "at": at, "status": "pending"}
        return pid

    def cancel_payment(self, payment_id, timestamp):
        p = self._payments.get(payment_id)
        if p is None or p["status"] != "pending" or p["at"] <= timestamp:
            return False
        p["status"] = "cancelled"
        return True

    def process_until(self, timestamp):
        due = sorted(
            (pid for pid, p in self._payments.items()
             if p["status"] == "pending" and p["at"] <= timestamp),
            key=lambda pid: (self._payments[pid]["at"], pid))
        executed = []
        for pid in due:
            p = self._payments[pid]
            if self.withdraw(p["account"], p["amount"], p["at"]) is not None:
                p["status"] = "executed"
                executed.append(pid)
        return executed
`;

const TESTS_1 = `import unittest
from solution import BankingSystem


class Level1Tests(unittest.TestCase):
    def testLevel1_create_account(self):
        self.assertTrue(BankingSystem().create_account("a"))

    def testLevel1_create_duplicate_returns_false(self):
        b = BankingSystem()
        b.create_account("a")
        self.assertFalse(b.create_account("a"))

    def testLevel1_deposit_returns_new_balance(self):
        b = BankingSystem()
        b.create_account("a")
        self.assertEqual(b.deposit("a", 100), 100)
        self.assertEqual(b.deposit("a", 50), 150)

    def testLevel1_deposit_missing_account(self):
        self.assertIsNone(BankingSystem().deposit("ghost", 10))

    def testLevel1_withdraw_ok(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100)
        self.assertEqual(b.withdraw("a", 30), 70)

    def testLevel1_withdraw_insufficient_funds(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 20)
        self.assertIsNone(b.withdraw("a", 50))
        self.assertEqual(b.balance("a"), 20)

    def testLevel1_balance_missing_account(self):
        self.assertIsNone(BankingSystem().balance("ghost"))
`;

const TESTS_2 = `import unittest
from solution import BankingSystem


class Level2Tests(unittest.TestCase):
    def _bank(self):
        b = BankingSystem()
        b.create_account("a")
        b.create_account("b")
        return b

    def testLevel2_transfer_moves_funds(self):
        b = self._bank()
        b.deposit("a", 100)
        self.assertTrue(b.transfer("a", "b", 40))
        self.assertEqual(b.balance("a"), 60)
        self.assertEqual(b.balance("b"), 40)

    def testLevel2_transfer_insufficient_funds(self):
        b = self._bank()
        b.deposit("a", 20)
        self.assertFalse(b.transfer("a", "b", 100))
        self.assertEqual(b.balance("a"), 20)

    def testLevel2_transfer_missing_account(self):
        b = self._bank()
        b.deposit("a", 50)
        self.assertFalse(b.transfer("a", "ghost", 10))

    def testLevel2_transaction_count(self):
        b = self._bank()
        b.deposit("a", 100)
        b.withdraw("a", 10)
        b.transfer("a", "b", 5)
        self.assertEqual(b.transaction_count("a"), 3)
        self.assertEqual(b.transaction_count("b"), 1)

    def testLevel2_total_balance(self):
        b = self._bank()
        b.deposit("a", 100)
        b.deposit("b", 250)
        self.assertEqual(b.total_balance(), 350)
`;

const TESTS_3 = `import unittest
from solution import BankingSystem


class Level3Tests(unittest.TestCase):
    def testLevel3_top_by_balance(self):
        b = BankingSystem()
        for acc, amt in [("a", 50), ("b", 300), ("c", 150)]:
            b.create_account(acc)
            b.deposit(acc, amt)
        self.assertEqual(b.top_accounts_by_balance(2), ["b", "c"])

    def testLevel3_top_by_balance_ties(self):
        b = BankingSystem()
        for acc in ("z", "a", "m"):
            b.create_account(acc)
            b.deposit(acc, 100)
        self.assertEqual(b.top_accounts_by_balance(2), ["a", "m"])

    def testLevel3_top_by_activity(self):
        b = BankingSystem()
        for acc in ("a", "b"):
            b.create_account(acc)
        b.deposit("a", 10)
        b.deposit("a", 10)
        b.deposit("b", 10)
        self.assertEqual(b.top_accounts_by_activity(1), ["a"])

    def testLevel3_top_n_exceeds_count(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 10)
        self.assertEqual(b.top_accounts_by_balance(9), ["a"])
`;

const TESTS_4 = `import unittest
from solution import BankingSystem


class Level4Tests(unittest.TestCase):
    def testLevel4_timestamped_deposit(self):
        b = BankingSystem()
        b.create_account("a")
        self.assertEqual(b.deposit("a", 100, 5), 100)

    def testLevel4_place_hold_reduces_available(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        b.place_hold("a", 30, 0, 10)
        self.assertEqual(b.available_balance("a", 5), 70)
        self.assertEqual(b.balance("a"), 100)

    def testLevel4_hold_expires(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        b.place_hold("a", 30, 0, 10)
        self.assertEqual(b.available_balance("a", 10), 100)

    def testLevel4_available_balance_missing(self):
        self.assertIsNone(BankingSystem().available_balance("ghost", 0))

    def testLevel4_place_hold_missing_account(self):
        self.assertFalse(BankingSystem().place_hold("ghost", 10, 0, 5))

    def testLevel4_level1_methods_still_work(self):
        b = BankingSystem()
        b.create_account("a")
        self.assertEqual(b.deposit("a", 40), 40)
        self.assertEqual(b.withdraw("a", 15), 25)
`;

const TESTS_5 = `import unittest
from solution import BankingSystem


class Level5Tests(unittest.TestCase):
    def testLevel5_snapshot_and_rollback(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        sid = b.snapshot(0)
        b.withdraw("a", 60, 5)
        b.rollback(sid)
        self.assertEqual(b.balance("a"), 100)

    def testLevel5_rollback_unknown_is_noop(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        b.rollback(999)
        self.assertEqual(b.balance("a"), 100)

    def testLevel5_statement_filters_by_time(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 5)
        b.withdraw("a", 10, 15)
        b.deposit("a", 50, 25)
        stmt = b.statement("a", 10, 20)
        self.assertEqual(stmt, [(15, "withdraw", 10)])

    def testLevel5_statement_sorted(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 10, 30)
        b.deposit("a", 20, 10)
        stmt = b.statement("a", 0, 100)
        self.assertEqual([e[0] for e in stmt], [10, 30])

    def testLevel5_snapshot_independent(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        sid = b.snapshot(0)
        b.deposit("a", 500, 1)
        b.rollback(sid)
        self.assertEqual(b.balance("a"), 100)
`;

const TESTS_6 = `import unittest
from solution import BankingSystem


class Level6Tests(unittest.TestCase):
    def testLevel6_schedule_returns_id(self):
        b = BankingSystem()
        b.create_account("a")
        pid = b.schedule_payment("a", 10, 100)
        self.assertIsInstance(pid, str)

    def testLevel6_process_executes_due_payment(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        pid = b.schedule_payment("a", 30, 10)
        self.assertEqual(b.process_until(5), [])
        self.assertEqual(b.process_until(10), [pid])
        self.assertEqual(b.balance("a"), 70)

    def testLevel6_underfunded_payment_is_skipped(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 10, 0)
        b.schedule_payment("a", 50, 5)
        self.assertEqual(b.process_until(5), [])
        self.assertEqual(b.balance("a"), 10)

    def testLevel6_cancel_before_due(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        pid = b.schedule_payment("a", 20, 100)
        self.assertTrue(b.cancel_payment(pid, 50))
        self.assertEqual(b.process_until(200), [])

    def testLevel6_cancel_after_due_returns_false(self):
        b = BankingSystem()
        b.create_account("a")
        pid = b.schedule_payment("a", 20, 10)
        self.assertFalse(b.cancel_payment(pid, 50))

    def testLevel6_payments_execute_in_time_order(self):
        b = BankingSystem()
        b.create_account("a")
        b.deposit("a", 100, 0)
        p_late = b.schedule_payment("a", 10, 20)
        p_early = b.schedule_payment("a", 10, 5)
        self.assertEqual(b.process_until(50), [p_early, p_late])
`;

export default {
  id: "banking-system",
  title: "Banking System",
  domain: "Transactions",
  kind: "practice",
  implFile: "solution.py",
  className: "BankingSystem",
  pointsPerLevel: 100,
  blurb: "Accounts, transfers, ranking, timestamped holds, statements, and scheduled payments.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Accounts & Balances", points: 100, mode: "sync",
      changed: "The core account operations.",
      spec: `# Level 1 — Accounts & Balances

Implement on \`BankingSystem\`:

- \`create_account(account_id)\` — \`True\`, or \`False\` if the account already exists.
- \`deposit(account_id, amount)\` — add funds; return the new balance, or \`None\` if no such account.
- \`withdraw(account_id, amount)\` — remove funds; return the new balance, or \`None\` if there is no such account **or** \`amount\` exceeds the balance (an overdraft must not change anything).
- \`balance(account_id)\` — the current balance, or \`None\`.

New accounts start at a balance of 0.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Transfers & History", points: 100, mode: "sync",
      changed: "Adds transfers, a per-account transaction count, and a global total.",
      spec: `# Level 2 — Transfers & History

Add:

- \`transfer(from_id, to_id, amount)\` — move funds between accounts. Return \`False\` (changing nothing) if either account is missing or \`from_id\` lacks the funds; otherwise \`True\`.
- \`transaction_count(account_id)\` — how many transactions this account took part in (each deposit, withdrawal, and transfer counts as one — and a transfer counts for **both** accounts), or \`None\`.
- \`total_balance()\` — the sum of every account's balance.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Ranking", points: 100, mode: "sync",
      changed: "Adds leaderboards by balance and by activity.",
      spec: `# Level 3 — Ranking

Add:

- \`top_accounts_by_balance(n)\` — the \`n\` account ids with the highest balance, ordered by **balance descending**, ties by **id ascending**.
- \`top_accounts_by_activity(n)\` — the same, ranked by transaction count.

Fewer than \`n\` accounts → return them all. The tuple-key sort again.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Timestamps & Holds", points: 100, mode: "sync",
      changed: "Operations gain a timestamp, and funds can be put on a temporary hold.",
      spec: `# Level 4 — Timestamps & Holds

Operations now happen in time, and funds can be temporarily reserved.

- \`deposit\`, \`withdraw\`, and \`transfer\` gain a final \`timestamp\` parameter (default \`0\`, so Level 1–3 callers still work). Record each as an entry in the account's transaction log.
- \`place_hold(account_id, amount, timestamp, ttl)\` — reserve \`amount\` from \`timestamp\` until \`timestamp + ttl\`. \`False\` if the account is missing.
- \`available_balance(account_id, timestamp)\` — the balance **minus** every hold still live at \`timestamp\`, or \`None\`.

**The refactor**: the account record grows a transaction log and a list of holds. A hold does not change the real \`balance\` — only what is *available*.`,
      tests: TESTS_4, solution: SOL_4,
    },
    {
      n: 5, title: "Statements & Rollback", points: 100, mode: "sync",
      changed: "Adds snapshots, rollback, and time-ranged statements.",
      spec: `# Level 5 — Statements & Rollback

Add:

- \`snapshot(timestamp)\` — save the whole bank's state; return an integer id.
- \`rollback(snapshot_id)\` — revert to that snapshot; do nothing for an unknown id.
- \`statement(account_id, start, end)\` — every logged transaction for the account with a timestamp in \`[start, end]\` (inclusive), as \`(timestamp, kind, amount)\` tuples sorted by timestamp. \`[]\` if the account is missing.

\`kind\` is one of \`"deposit"\`, \`"withdraw"\`, \`"transfer_in"\`, \`"transfer_out"\`. Snapshot with \`copy.deepcopy\`.`,
      tests: TESTS_5, solution: SOL_5,
    },
    {
      n: 6, title: "Scheduled Payments", points: 100, mode: "sync",
      changed: "Adds future-dated payments that execute when their time arrives.",
      spec: `# Level 6 — Scheduled Payments

Add future-dated payments:

- \`schedule_payment(account_id, amount, at)\` — register a payment to run at time \`at\`; return a unique payment id (a string).
- \`cancel_payment(payment_id, timestamp)\` — cancel a still-pending payment, but only if it is not yet due (\`at > timestamp\`). Return whether it was cancelled.
- \`process_until(timestamp)\` — execute every pending payment whose \`at\` is \`<= timestamp\`, in **time order** (ties by payment id). Executing a payment withdraws the amount; if the account lacks the funds the payment is **skipped** and stays pending. Return the list of payment ids actually executed.`,
      tests: TESTS_6, solution: SOL_6,
    },
  ],
};
