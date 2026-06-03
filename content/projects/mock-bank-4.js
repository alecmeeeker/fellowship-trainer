/* mock-bank-4 — Banking System, 4-level assessment variant.
 *
 * Adapted from public practice repos and candidate writeups. The canonical 4-level arc:
 *   L1 — create_account / deposit / transfer
 *   L2 — top_spenders (formatted "id(total)" strings)
 *   L3 — pay() with 24h-delayed 2% cashback + get_payment_status()
 *   L4 — merge_accounts() with redirected pending cashback + historical balance
 *
 * Timestamps are strictly increasing across all calls — this is part of the
 * exam contract and the L3/L4 logic depends on it.
 */

const STARTER = `class BankingSystem:
    """An in-memory banking system — a common multi-level assessment archetype.

    Every method takes \`timestamp\` (milliseconds since epoch) as its first
    argument; timestamps are strictly increasing across the entire run.
    Implement the four levels in order.
    """

    def __init__(self):
        # TODO: design storage so L3 (cashback queue) and L4 (merge, history)
        # don't force a rewrite. A transaction log per account is the move.
        pass

    def create_account(self, timestamp, account_id):
        pass

    def deposit(self, timestamp, account_id, amount):
        pass

    def transfer(self, timestamp, source_id, target_id, amount):
        pass
`;

const SOL_1 = `class BankingSystem:
    def __init__(self):
        self._accounts = {}  # id -> {"balance": int, "outgoing": int, "log": [(ts, kind, amount)]}

    def _exists(self, account_id):
        return account_id in self._accounts

    def _log(self, account_id, timestamp, kind, amount):
        self._accounts[account_id]["log"].append((timestamp, kind, amount))

    def create_account(self, timestamp, account_id):
        if self._exists(account_id):
            return False
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        return True

    def deposit(self, timestamp, account_id, amount):
        if not self._exists(account_id):
            return None
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, timestamp, "deposit", amount)
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
    CASHBACK_DELAY = 86_400_000  # 24 hours in ms
    CASHBACK_RATE = 2            # percent

    def __init__(self):
        self._accounts = {}
        self._pending = {}  # payment_id -> {"account": id, "due": ts, "amount": cashback}
        self._processed = set()
        self._payment_counter = 0
        self._last_processed_ts = -1

    # ---- helpers ----
    def _exists(self, account_id):
        return account_id in self._accounts

    def _log(self, account_id, timestamp, kind, amount):
        self._accounts[account_id]["log"].append((timestamp, kind, amount))

    def _process_due(self, now):
        for pid, info in list(self._pending.items()):
            if info["due"] <= now:
                acc = self._accounts.get(info["account"])
                if acc is not None:
                    acc["balance"] += info["amount"]
                    self._log(info["account"], info["due"], "cashback", info["amount"])
                self._processed.add(pid)
                del self._pending[pid]
        self._last_processed_ts = now

    # ---- L1 ----
    def create_account(self, timestamp, account_id):
        self._process_due(timestamp)
        if self._exists(account_id):
            return False
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        return True

    def deposit(self, timestamp, account_id, amount):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, timestamp, "deposit", amount)
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
        return pid

    def get_payment_status(self, timestamp, account_id, payment):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        if payment in self._pending and self._pending[payment]["account"] == account_id:
            return "IN_PROGRESS"
        if payment in self._processed:
            return "CASHBACK_RECEIVED"
        return None
`;

const SOL_4 = `class BankingSystem:
    CASHBACK_DELAY = 86_400_000
    CASHBACK_RATE = 2

    def __init__(self):
        self._accounts = {}
        self._pending = {}
        self._processed = set()
        self._payment_owner = {}  # pid -> historical owner (account_id at pay-time)
        self._payment_counter = 0
        self._merged_into = {}    # absorbed_id -> surviving_id

    # ---- helpers ----
    def _exists(self, account_id):
        return account_id in self._accounts

    def _log(self, account_id, timestamp, kind, amount):
        self._accounts[account_id]["log"].append((timestamp, kind, amount))

    def _process_due(self, now):
        for pid, info in list(self._pending.items()):
            if info["due"] <= now:
                acc_id = info["account"]
                # follow merge chain
                while acc_id in self._merged_into:
                    acc_id = self._merged_into[acc_id]
                acc = self._accounts.get(acc_id)
                if acc is not None:
                    acc["balance"] += info["amount"]
                    self._log(acc_id, info["due"], "cashback", info["amount"])
                self._processed.add(pid)
                del self._pending[pid]

    # ---- L1 ----
    def create_account(self, timestamp, account_id):
        self._process_due(timestamp)
        if self._exists(account_id):
            return False
        self._accounts[account_id] = {"balance": 0, "outgoing": 0, "log": []}
        return True

    def deposit(self, timestamp, account_id, amount):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        self._accounts[account_id]["balance"] += amount
        self._log(account_id, timestamp, "deposit", amount)
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
        self._payment_owner[pid] = account_id
        return pid

    def get_payment_status(self, timestamp, account_id, payment):
        self._process_due(timestamp)
        if not self._exists(account_id):
            return None
        original_owner = self._payment_owner.get(payment)
        if original_owner is None:
            return None
        # follow merges to determine current owner
        cur = original_owner
        while cur in self._merged_into:
            cur = self._merged_into[cur]
        if cur != account_id:
            return None
        if payment in self._pending:
            return "IN_PROGRESS"
        if payment in self._processed:
            return "CASHBACK_RECEIVED"
        return None

    # ---- L4 ----
    def merge_accounts(self, timestamp, account_id_1, account_id_2):
        self._process_due(timestamp)
        if account_id_1 == account_id_2:
            return False
        if not (self._exists(account_id_1) and self._exists(account_id_2)):
            return False
        a = self._accounts[account_id_1]
        b = self._accounts[account_id_2]
        a["balance"] += b["balance"]
        a["outgoing"] += b["outgoing"]
        # merge logs (sorted by timestamp; preserve order)
        merged_log = sorted(a["log"] + b["log"], key=lambda r: r[0])
        a["log"] = merged_log
        # redirect pending cashback from account_id_2 to account_id_1
        for pid, info in self._pending.items():
            if info["account"] == account_id_2:
                info["account"] = account_id_1
        del self._accounts[account_id_2]
        self._merged_into[account_id_2] = account_id_1
        return True

    def get_balance(self, timestamp, account_id, time_at):
        self._process_due(timestamp)
        # walk the merge chain forward to find the surviving home of historical logs
        surviving = account_id
        while surviving in self._merged_into:
            surviving = self._merged_into[surviving]
        if surviving not in self._accounts:
            return None
        bal = 0
        for ts, kind, amount in self._accounts[surviving]["log"]:
            if ts > time_at:
                break
            if kind in ("deposit", "transfer_in", "cashback"):
                bal += amount
            elif kind in ("transfer_out", "payment"):
                bal -= amount
        return bal
`;

const TESTS_1 = `import unittest
from solution import BankingSystem


class Level1Tests(unittest.TestCase):
    def testLevel1_create_account_unique(self):
        b = BankingSystem()
        self.assertTrue(b.create_account(1, "a"))
        self.assertFalse(b.create_account(2, "a"))

    def testLevel1_deposit_returns_new_balance(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertEqual(b.deposit(2, "a", 100), 100)
        self.assertEqual(b.deposit(3, "a", 50), 150)

    def testLevel1_deposit_unknown_account_none(self):
        b = BankingSystem()
        self.assertIsNone(b.deposit(1, "ghost", 100))

    def testLevel1_transfer_returns_source_balance(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(2, "b")
        b.deposit(3, "a", 200)
        self.assertEqual(b.transfer(4, "a", "b", 50), 150)

    def testLevel1_transfer_insufficient_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(2, "b")
        b.deposit(3, "a", 30)
        self.assertIsNone(b.transfer(4, "a", "b", 50))
        # nothing changed
        self.assertEqual(b.deposit(5, "a", 0), 30)

    def testLevel1_transfer_unknown_account_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        self.assertIsNone(b.transfer(3, "a", "ghost", 10))
        self.assertIsNone(b.transfer(4, "ghost", "a", 10))

    def testLevel1_transfer_self_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        self.assertIsNone(b.transfer(3, "a", "a", 10))
`;

const TESTS_2 = `import unittest
from solution import BankingSystem


class Level2Tests(unittest.TestCase):
    def testLevel2_top_spenders_empty(self):
        b = BankingSystem()
        self.assertEqual(b.top_spenders(1, 5), [])

    def testLevel2_top_spenders_basic(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.create_account(1, "c")
        b.deposit(2, "a", 1000)
        b.deposit(2, "b", 1000)
        b.deposit(2, "c", 1000)
        b.transfer(3, "a", "b", 300)
        b.transfer(3, "b", "c", 200)
        b.transfer(3, "c", "a", 100)
        self.assertEqual(b.top_spenders(4, 3), ["a(300)", "b(200)", "c(100)"])

    def testLevel2_top_spenders_format_is_id_paren_total(self):
        b = BankingSystem()
        b.create_account(1, "x")
        b.create_account(1, "y")
        b.deposit(2, "x", 100)
        b.deposit(2, "y", 100)
        b.transfer(3, "x", "y", 25)
        self.assertEqual(b.top_spenders(4, 1), ["x(25)"])

    def testLevel2_top_spenders_ties_sort_by_id_asc(self):
        b = BankingSystem()
        b.create_account(1, "z")
        b.create_account(1, "a")
        b.create_account(1, "m")
        for aid in ("z", "a", "m"):
            b.deposit(2, aid, 100)
        b.transfer(3, "z", "a", 50)
        b.transfer(3, "a", "m", 50)
        b.transfer(3, "m", "z", 50)
        self.assertEqual(b.top_spenders(4, 3), ["a(50)", "m(50)", "z(50)"])

    def testLevel2_top_spenders_n_larger_than_accounts(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        self.assertEqual(b.top_spenders(3, 99), ["a(0)"])
`;

const TESTS_3 = `import unittest
from solution import BankingSystem


DAY = 86_400_000


class Level3Tests(unittest.TestCase):
    def testLevel3_pay_returns_unique_id_and_debits(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        p1 = b.pay(3, "a", 100)
        self.assertEqual(p1, "payment1")
        p2 = b.pay(4, "a", 50)
        self.assertEqual(p2, "payment2")

    def testLevel3_pay_unknown_account_none(self):
        b = BankingSystem()
        self.assertIsNone(b.pay(1, "ghost", 10))

    def testLevel3_pay_insufficient_funds_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertIsNone(b.pay(2, "a", 10))

    def testLevel3_payment_status_in_progress(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(3, "a", 100)
        self.assertEqual(b.get_payment_status(4, "a", pid), "IN_PROGRESS")

    def testLevel3_payment_status_cashback_received_after_24h(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        pid = b.pay(10, "a", 100)
        # any operation past due triggers processing
        b.deposit(10 + DAY + 1, "a", 0)
        self.assertEqual(b.get_payment_status(10 + DAY + 2, "a", pid), "CASHBACK_RECEIVED")

    def testLevel3_cashback_credits_2_percent(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 1000)
        b.pay(3, "a", 500)              # 2% of 500 = 10 cashback
        # balance after pay: 500
        b.deposit(3 + DAY + 1, "a", 0)  # forces processing
        # 500 + 10 = 510
        self.assertEqual(b.deposit(3 + DAY + 2, "a", 0), 510)

    def testLevel3_payment_status_wrong_account_is_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 500)
        pid = b.pay(3, "a", 100)
        self.assertIsNone(b.get_payment_status(4, "b", pid))

    def testLevel3_payment_status_unknown_payment_is_none(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertIsNone(b.get_payment_status(2, "a", "nope"))
`;

const TESTS_4 = `import unittest
from solution import BankingSystem


DAY = 86_400_000


class Level4Tests(unittest.TestCase):
    def testLevel4_merge_combines_balances(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 100)
        b.deposit(2, "b", 50)
        self.assertTrue(b.merge_accounts(3, "a", "b"))
        # b is gone, a now has 150
        self.assertIsNone(b.deposit(4, "b", 10))
        self.assertEqual(b.deposit(5, "a", 0), 150)

    def testLevel4_merge_unknown_returns_false(self):
        b = BankingSystem()
        b.create_account(1, "a")
        self.assertFalse(b.merge_accounts(2, "a", "ghost"))
        self.assertFalse(b.merge_accounts(2, "a", "a"))

    def testLevel4_merge_redirects_pending_cashback(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "b", 1000)
        pid = b.pay(3, "b", 200)        # 4 cashback pending for "b"
        b.merge_accounts(4, "a", "b")    # b absorbed into a
        # process cashback by ticking past the due time
        b.deposit(10 + DAY, "a", 0)
        # cashback should land in a's balance: a had 0, +4 = 4
        # but "a" had no deposit before; check via get_balance after due
        bal = b.get_balance(11 + DAY, "a", 10 + DAY)
        self.assertEqual(bal, 800 + 4)  # 1000 - 200 payment + 4 cashback

    def testLevel4_payment_status_follows_merge(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "b", 1000)
        pid = b.pay(3, "b", 100)
        b.merge_accounts(4, "a", "b")
        # status for original owner "b" -> None (gone), for surviving "a" -> IN_PROGRESS
        self.assertIsNone(b.get_payment_status(5, "b", pid))
        self.assertEqual(b.get_payment_status(6, "a", pid), "IN_PROGRESS")

    def testLevel4_get_balance_historical(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.deposit(2, "a", 100)
        b.deposit(3, "a", 50)
        b.deposit(4, "a", 25)
        self.assertEqual(b.get_balance(5, "a", 2), 100)
        self.assertEqual(b.get_balance(5, "a", 3), 150)
        self.assertEqual(b.get_balance(5, "a", 4), 175)
        self.assertEqual(b.get_balance(5, "a", 99), 175)

    def testLevel4_get_balance_unknown_none(self):
        b = BankingSystem()
        self.assertIsNone(b.get_balance(1, "ghost", 1))

    def testLevel4_get_balance_with_transfers(self):
        b = BankingSystem()
        b.create_account(1, "a")
        b.create_account(1, "b")
        b.deposit(2, "a", 500)
        b.transfer(3, "a", "b", 200)
        self.assertEqual(b.get_balance(4, "a", 2), 500)
        self.assertEqual(b.get_balance(4, "a", 3), 300)
        self.assertEqual(b.get_balance(4, "b", 3), 200)
`;

export default {
  id: "mock-bank-4",
  title: "Banking System — 4-level Mock",
  domain: "Banking · Transactions",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  className: "BankingSystem",
  pointsPerLevel: 250,
  blurb:
    "exam-faithful 4-level mock. Accounts → top-spender rankings → cashback payments → account merge + historical balance. " +
    "Built from public bank-system references and candidate writeups.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Accounts, Deposits & Transfers", points: 250, mode: "sync",
      changed: "Three core methods. Every method takes `timestamp` first — timestamps are strictly increasing across the run.",
      spec: `# Level 1 — Accounts, Deposits & Transfers

Implement on \`BankingSystem\`. **Every method's first argument is \`timestamp\`** (an int — milliseconds since epoch). Timestamps are **strictly increasing** across the entire run; you can assume this.

- \`create_account(timestamp, account_id)\` — return \`True\`, or \`False\` if the account already exists.
- \`deposit(timestamp, account_id, amount)\` — add funds. Return the new balance, or \`None\` if no such account.
- \`transfer(timestamp, source_id, target_id, amount)\` — move funds. Return the **source's new balance**, or \`None\` if either account is missing, \`source_id == target_id\`, or the source lacks the funds (an overdraft changes nothing).

New accounts start at balance 0. **Log every operation** in a per-account transaction log — L4 will replay it.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Top Spenders", points: 250, mode: "sync",
      changed: "Adds a single ranking method returning formatted strings.",
      spec: `# Level 2 — Top Spenders

Add an outgoing-spend ranking:

- \`top_spenders(timestamp, n)\` — return the \`n\` accounts that have sent the **most outgoing money** (transfers out + L3 payments), as a list of **formatted strings** \`"<id>(<total>)"\`.

**Ordering**

- By outgoing total, **descending**.
- Ties broken by account id, **ascending lex**.
- If fewer than \`n\` accounts exist, return them all.

**Example output**

\`\`\`
["a(300)", "b(200)", "c(100)"]
\`\`\``,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Payments & Cashback", points: 250, mode: "sync",
      changed: "**Refactor land.** Payments earn delayed cashback that the system must auto-credit at the right time.",
      spec: `# Level 3 — Payments & Cashback

Add merchant payments with delayed cashback. Each \`pay\` debits the account and schedules a 2% cashback to land **24 hours later** (24h = \`86_400_000\` ms).

- \`pay(timestamp, account_id, amount)\` — debit the account; return a unique payment id formatted \`"payment1"\`, \`"payment2"\`, … in creation order. Return \`None\` if the account is missing or lacks the funds. The payment counts as outgoing (it shows up in \`top_spenders\`).
- \`get_payment_status(timestamp, account_id, payment)\` — return \`"IN_PROGRESS"\` if the cashback has not yet posted, \`"CASHBACK_RECEIVED"\` if it has, or \`None\` if the account does not exist, the payment id is unknown, or the payment belongs to a different account.

**Auto-processing**

Cashback posts when the bank "sees" a timestamp past its due time. Process pending cashback at the start of **every** method (use the incoming \`timestamp\` as "now"). 2% cashback uses **integer truncation** — \`(amount * 2) // 100\`.

> Your L1/L2 methods must keep passing.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Account Merge & Historical Balance", points: 250, mode: "sync",
      changed: "Capstone — merge two accounts (redirecting pending cashback) and reconstruct any past balance from the log.",
      spec: `# Level 4 — Account Merge & Historical Balance

Add:

- \`merge_accounts(timestamp, account_id_1, account_id_2)\` — absorb \`account_id_2\` into \`account_id_1\`. The combined balance and outgoing total go to \`account_id_1\`; \`account_id_2\` is deleted from the bank. **Pending cashback for \`account_id_2\` is redirected to \`account_id_1\`** and lands on \`account_id_1\`'s balance at its original due time. Return \`True\`, or \`False\` if the ids are equal or either account is missing. After a merge, \`get_payment_status\` for \`account_id_2\` returns \`None\` (the account is gone); querying via \`account_id_1\` returns the live status. \`top_spenders\` reflects the combined outgoing total from both pre-merge histories.
- \`get_balance(timestamp, account_id, time_at)\` — return what the account's balance was at \`time_at\`, by replaying the account's transaction log. Return \`None\` if the account is unknown. The replay must include any cashback that posted at or before \`time_at\`.

**Storage hint**

This is the level that punishes shortcuts on L1. A per-account transaction log of \`(timestamp, kind, amount)\` tuples — with \`kind\` in \`{"deposit", "transfer_in", "transfer_out", "payment", "cashback"}\` — lets you replay any historical balance with a single pass.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
