/* Async Job Scheduler — a 6-level concurrency project built on asyncio.
 * Every level runs live in-browser. Test modules are plain classes with
 * `async def test_*` methods, run by the custom await-based harness. */

const STARTER = `import asyncio


class JobScheduler:
    """An asyncio-based job scheduler. Implement the methods as you progress
    through the six levels. "Running" a job is simulated async work."""

    def __init__(self):
        # TODO: set up your storage here
        pass

    def add_job(self, job_id):
        pass

    async def run_job(self, job_id):
        pass

    def status(self, job_id):
        pass
`;

const SOL_1 = `import asyncio


class JobScheduler:
    def __init__(self):
        self._jobs = {}  # job_id -> {"status": str}

    def add_job(self, job_id):
        if job_id in self._jobs:
            return False
        self._jobs[job_id] = {"status": "pending"}
        return True

    async def run_job(self, job_id):
        job = self._jobs.get(job_id)
        if job is None:
            return None
        await asyncio.sleep(0)
        job["status"] = "done"
        return job_id

    def status(self, job_id):
        job = self._jobs.get(job_id)
        return job["status"] if job else "unknown"
`;

const SOL_2 = SOL_1 + `
    def pending_jobs(self):
        return sorted(jid for jid, j in self._jobs.items() if j["status"] == "pending")

    async def run_all(self):
        pend = self.pending_jobs()
        await asyncio.gather(*[self.run_job(jid) for jid in pend])
        return sorted(pend)
`;

/* Level 3: add_job now records a priority. */
const SOL_3 = SOL_2.replace(
  '        self._jobs[job_id] = {"status": "pending"}',
  '        self._jobs[job_id] = {"status": "pending", "priority": 0}'
) + `
    def set_priority(self, job_id, priority):
        job = self._jobs.get(job_id)
        if job is None:
            return False
        job["priority"] = priority
        return True

    def _by_priority(self, ids):
        return sorted(ids, key=lambda jid: (-self._jobs[jid]["priority"], jid))

    def top_pending(self, n):
        return self._by_priority(self.pending_jobs())[:n]

    async def run_by_priority(self):
        order = self._by_priority(self.pending_jobs())
        for jid in order:
            await self.run_job(jid)
        return order
`;

/* Level 4: records gain a duration; run_job is refactored to take a timeout. */
const SOL_4 = `import asyncio


class JobScheduler:
    def __init__(self):
        self._jobs = {}  # job_id -> {"status", "priority", "duration"}

    def add_job(self, job_id):
        if job_id in self._jobs:
            return False
        self._jobs[job_id] = {"status": "pending", "priority": 0, "duration": 0}
        return True

    async def run_job(self, job_id, timeout=None):
        job = self._jobs.get(job_id)
        if job is None or job["status"] == "cancelled":
            return None
        if timeout is not None and job["duration"] > timeout:
            job["status"] = "timeout"
            return None
        await asyncio.sleep(0)
        job["status"] = "done"
        return job_id

    def status(self, job_id):
        job = self._jobs.get(job_id)
        return job["status"] if job else "unknown"

    def pending_jobs(self):
        return sorted(jid for jid, j in self._jobs.items() if j["status"] == "pending")

    async def run_all(self):
        pend = self.pending_jobs()
        await asyncio.gather(*[self.run_job(jid) for jid in pend])
        return sorted(pend)

    def set_priority(self, job_id, priority):
        job = self._jobs.get(job_id)
        if job is None:
            return False
        job["priority"] = priority
        return True

    def _by_priority(self, ids):
        return sorted(ids, key=lambda jid: (-self._jobs[jid]["priority"], jid))

    def top_pending(self, n):
        return self._by_priority(self.pending_jobs())[:n]

    async def run_by_priority(self):
        order = self._by_priority(self.pending_jobs())
        for jid in order:
            await self.run_job(jid)
        return order

    def set_duration(self, job_id, duration):
        job = self._jobs.get(job_id)
        if job is None:
            return False
        job["duration"] = duration
        return True

    def cancel_job(self, job_id):
        job = self._jobs.get(job_id)
        if job is None or job["status"] != "pending":
            return False
        job["status"] = "cancelled"
        return True

    def failed_jobs(self):
        return sorted(jid for jid, j in self._jobs.items() if j["status"] == "timeout")
`;

const SOL_5 = `import asyncio
import copy
` + SOL_4.slice("import asyncio\n".length).replace(
  "        self._jobs = {}  # job_id -> {\"status\", \"priority\", \"duration\"}",
  "        self._jobs = {}  # job_id -> {\"status\", \"priority\", \"duration\"}\n" +
  "        self._snapshots = {}\n        self._snap_id = 0\n        self.last_peak = 0"
) + `
    def snapshot(self):
        self._snap_id += 1
        self._snapshots[self._snap_id] = copy.deepcopy(self._jobs)
        return self._snap_id

    def restore(self, snapshot_id):
        snap = self._snapshots.get(snapshot_id)
        if snap is None:
            return
        self._jobs = copy.deepcopy(snap)

    async def run_all_limited(self, limit):
        pend = self.pending_jobs()
        sem = asyncio.Semaphore(limit)
        active = 0
        peak = 0

        async def worker(jid):
            nonlocal active, peak
            async with sem:
                active += 1
                peak = max(peak, active)
                await self.run_job(jid)
                active -= 1

        await asyncio.gather(*[worker(jid) for jid in pend])
        self.last_peak = peak
        return sorted(pend)
`;

const SOL_6 = SOL_5.replace(
  '        self._jobs[job_id] = {"status": "pending", "priority": 0, "duration": 0}',
  '        self._jobs[job_id] = {"status": "pending", "priority": 0, "duration": 0, "deps": []}'
) + `
    def add_dependency(self, job_id, depends_on):
        job = self._jobs.get(job_id)
        if job is None:
            return False
        job["deps"].append(depends_on)
        return True

    async def run_respecting_deps(self):
        done = set(jid for jid, j in self._jobs.items() if j["status"] == "done")
        completed = []
        while True:
            ready = sorted(
                jid for jid, j in self._jobs.items()
                if j["status"] == "pending" and all(d in done for d in j["deps"])
            )
            if not ready:
                break
            await asyncio.gather(*[self.run_job(jid) for jid in ready])
            for jid in ready:
                done.add(jid)
                completed.append(jid)
        return completed

    def find_unrunnable(self):
        runnable = set()
        changed = True
        while changed:
            changed = False
            for jid, j in self._jobs.items():
                if jid in runnable or j["status"] == "cancelled":
                    continue
                if all(d in runnable for d in j["deps"]):
                    runnable.add(jid)
                    changed = True
        return sorted(jid for jid, j in self._jobs.items()
                      if jid not in runnable and j["status"] != "cancelled")
`;

const TESTS_1 = `import asyncio
from solution import JobScheduler


class Level1Tests:
    async def testLevel1_add_job(self):
        s = JobScheduler()
        assert s.add_job("a") is True

    async def testLevel1_add_duplicate_returns_false(self):
        s = JobScheduler()
        s.add_job("a")
        assert s.add_job("a") is False

    async def testLevel1_run_job_completes(self):
        s = JobScheduler()
        s.add_job("a")
        assert await s.run_job("a") == "a"
        assert s.status("a") == "done"

    async def testLevel1_run_unknown_job(self):
        s = JobScheduler()
        assert await s.run_job("ghost") is None

    async def testLevel1_status_starts_pending(self):
        s = JobScheduler()
        s.add_job("a")
        assert s.status("a") == "pending"

    async def testLevel1_status_unknown(self):
        assert JobScheduler().status("nope") == "unknown"
`;

const TESTS_2 = `import asyncio
from solution import JobScheduler


class Level2Tests:
    async def testLevel2_run_all_completes_every_job(self):
        s = JobScheduler()
        for jid in ("a", "b", "c"):
            s.add_job(jid)
        assert await s.run_all() == ["a", "b", "c"]
        assert all(s.status(j) == "done" for j in ("a", "b", "c"))

    async def testLevel2_pending_jobs_sorted(self):
        s = JobScheduler()
        for jid in ("c", "a", "b"):
            s.add_job(jid)
        assert s.pending_jobs() == ["a", "b", "c"]

    async def testLevel2_pending_excludes_done(self):
        s = JobScheduler()
        s.add_job("a")
        s.add_job("b")
        await s.run_job("a")
        assert s.pending_jobs() == ["b"]

    async def testLevel2_run_all_empty(self):
        assert await JobScheduler().run_all() == []
`;

const TESTS_3 = `import asyncio
from solution import JobScheduler


class Level3Tests:
    async def testLevel3_run_by_priority_order(self):
        s = JobScheduler()
        for jid in ("a", "b", "c"):
            s.add_job(jid)
        s.set_priority("a", 1)
        s.set_priority("b", 5)
        s.set_priority("c", 3)
        assert await s.run_by_priority() == ["b", "c", "a"]

    async def testLevel3_priority_ties_break_by_id(self):
        s = JobScheduler()
        for jid in ("z", "a", "m"):
            s.add_job(jid)
        assert s.top_pending(2) == ["a", "m"]

    async def testLevel3_top_pending_respects_priority(self):
        s = JobScheduler()
        for jid in ("a", "b", "c"):
            s.add_job(jid)
        s.set_priority("c", 10)
        assert s.top_pending(1) == ["c"]

    async def testLevel3_set_priority_unknown(self):
        assert JobScheduler().set_priority("ghost", 5) is False
`;

const TESTS_4 = `import asyncio
from solution import JobScheduler


class Level4Tests:
    async def testLevel4_run_within_timeout(self):
        s = JobScheduler()
        s.add_job("a")
        s.set_duration("a", 5)
        assert await s.run_job("a", timeout=10) == "a"
        assert s.status("a") == "done"

    async def testLevel4_run_exceeds_timeout(self):
        s = JobScheduler()
        s.add_job("a")
        s.set_duration("a", 20)
        assert await s.run_job("a", timeout=10) is None
        assert s.status("a") == "timeout"

    async def testLevel4_cancel_job(self):
        s = JobScheduler()
        s.add_job("a")
        assert s.cancel_job("a") is True
        assert s.status("a") == "cancelled"
        assert await s.run_job("a") is None

    async def testLevel4_cancel_done_job_returns_false(self):
        s = JobScheduler()
        s.add_job("a")
        await s.run_job("a")
        assert s.cancel_job("a") is False

    async def testLevel4_run_all_skips_cancelled(self):
        s = JobScheduler()
        s.add_job("a")
        s.add_job("b")
        s.cancel_job("b")
        assert await s.run_all() == ["a"]

    async def testLevel4_failed_jobs(self):
        s = JobScheduler()
        s.add_job("a")
        s.set_duration("a", 99)
        await s.run_job("a", timeout=1)
        assert s.failed_jobs() == ["a"]
`;

const TESTS_5 = `import asyncio
from solution import JobScheduler


class Level5Tests:
    async def testLevel5_snapshot_and_restore(self):
        s = JobScheduler()
        s.add_job("a")
        sid = s.snapshot()
        await s.run_job("a")
        assert s.status("a") == "done"
        s.restore(sid)
        assert s.status("a") == "pending"

    async def testLevel5_restore_unknown_is_noop(self):
        s = JobScheduler()
        s.add_job("a")
        s.restore(999)
        assert s.status("a") == "pending"

    async def testLevel5_run_all_limited_completes(self):
        s = JobScheduler()
        for jid in ("a", "b", "c", "d", "e"):
            s.add_job(jid)
        assert await s.run_all_limited(2) == ["a", "b", "c", "d", "e"]
        assert all(s.status(j) == "done" for j in ("a", "b", "c", "d", "e"))

    async def testLevel5_run_all_limited_respects_bound(self):
        s = JobScheduler()
        for jid in ("a", "b", "c", "d", "e"):
            s.add_job(jid)
        await s.run_all_limited(2)
        assert s.last_peak <= 2

    async def testLevel5_snapshot_is_independent(self):
        s = JobScheduler()
        s.add_job("a")
        sid = s.snapshot()
        s.add_job("b")
        s.restore(sid)
        assert s.status("b") == "unknown"
`;

const TESTS_6 = `import asyncio
from solution import JobScheduler


class Level6Tests:
    async def testLevel6_runs_in_dependency_order(self):
        s = JobScheduler()
        for jid in ("a", "b", "c"):
            s.add_job(jid)
        s.add_dependency("c", "b")
        s.add_dependency("b", "a")
        assert await s.run_respecting_deps() == ["a", "b", "c"]

    async def testLevel6_independent_jobs_all_run(self):
        s = JobScheduler()
        for jid in ("x", "y", "z"):
            s.add_job(jid)
        assert sorted(await s.run_respecting_deps()) == ["x", "y", "z"]

    async def testLevel6_detects_cycle(self):
        s = JobScheduler()
        s.add_job("a")
        s.add_job("b")
        s.add_dependency("a", "b")
        s.add_dependency("b", "a")
        assert s.find_unrunnable() == ["a", "b"]

    async def testLevel6_detects_missing_dependency(self):
        s = JobScheduler()
        s.add_job("a")
        s.add_dependency("a", "ghost")
        assert s.find_unrunnable() == ["a"]

    async def testLevel6_all_runnable_when_acyclic(self):
        s = JobScheduler()
        s.add_job("a")
        s.add_job("b")
        s.add_dependency("b", "a")
        assert s.find_unrunnable() == []

    async def testLevel6_add_dependency_unknown_job(self):
        assert JobScheduler().add_dependency("ghost", "x") is False
`;

export default {
  id: "async-scheduler",
  title: "Async Job Scheduler",
  domain: "Concurrency · asyncio",
  kind: "practice",
  implFile: "solution.py",
  className: "JobScheduler",
  pointsPerLevel: 100,
  blurb: "A concurrency project built on asyncio — every level runs live in the browser.",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Register & Run", points: 100, mode: "async",
      changed: "Register jobs and run one asynchronously.",
      spec: `# Level 1 — Register & Run

Build an asyncio job scheduler. Implement on \`JobScheduler\`:

- \`add_job(job_id)\` — register a job. Return \`True\`, or \`False\` if that id already exists.
- \`async def run_job(job_id)\` — run the job (the work is \`await asyncio.sleep(0)\`). Mark it done and return \`job_id\`; return \`None\` if the job does not exist.
- \`status(job_id)\` — return \`"pending"\`, \`"done"\`, or \`"unknown"\`.

> Tests are async. In this sandbox you \`await\` directly — there is no \`asyncio.run\`.`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "Concurrent Batch", points: 100, mode: "async",
      changed: "Run every pending job concurrently with asyncio.gather.",
      spec: `# Level 2 — Concurrent Batch

Add:

- \`pending_jobs()\` — a **sorted** list of the ids of all jobs still \`"pending"\`.
- \`async def run_all()\` — run every pending job **concurrently** with \`asyncio.gather\`, then return the sorted list of ids that were run.

**Notes**

- A loop of \`await run_job(...)\` is *sequential*. Use \`asyncio.gather\` to run them together.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Priorities", points: 100, mode: "async",
      changed: "Jobs gain a priority; run highest-priority first.",
      spec: `# Level 3 — Priorities

Each job now has a priority (default \`0\`). Add:

- \`set_priority(job_id, priority)\` — set it; return \`False\` if the job is unknown.
- \`top_pending(n)\` — the \`n\` highest-priority pending ids, ordered by **priority descending**, ties by **job id ascending**.
- \`async def run_by_priority()\` — run all pending jobs in that priority order; return the ids in the order they ran.

**Notes**

- The familiar tuple key: \`sorted(ids, key=lambda j: (-priority[j], j))\`.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Durations, Timeouts, Cancellation", points: 100, mode: "async",
      changed: "Jobs gain a duration; run_job takes a timeout; jobs can be cancelled.",
      spec: `# Level 4 — Durations, Timeouts, Cancellation

The pivot. Add:

- \`set_duration(job_id, duration)\` — set how long a job takes (default \`0\`); \`False\` if unknown.
- \`cancel_job(job_id)\` — cancel a **pending** job (status becomes \`"cancelled"\`). Return \`False\` if it is unknown or no longer pending.
- \`async def run_job(job_id, timeout=None)\` — refactored: a cancelled job returns \`None\`; if \`timeout\` is given and the job's \`duration > timeout\`, mark it \`"timeout"\` and return \`None\`; otherwise run it.
- \`failed_jobs()\` — sorted ids of jobs whose status is \`"timeout"\`.

**The refactor**

\`run_job\` gains the \`timeout\` parameter (default \`None\`, so Level 1–3 callers are unaffected) and the cancelled/timeout checks. \`run_all\` should no longer run cancelled jobs — note that a cancelled job is not \`"pending"\`, so this falls out naturally.`,
      tests: TESTS_4, solution: SOL_4,
    },
    {
      n: 5, title: "Snapshots & Bounded Concurrency", points: 100, mode: "async",
      changed: "Adds snapshot/restore and a concurrency-limited batch run.",
      spec: `# Level 5 — Snapshots & Bounded Concurrency

Add:

- \`snapshot()\` — save the scheduler state; return an integer snapshot id.
- \`restore(snapshot_id)\` — revert to that snapshot; do nothing for an unknown id.
- \`async def run_all_limited(limit)\` — run every pending job concurrently, but with **at most \`limit\` running at once**. Return the sorted list of ids run, and set \`self.last_peak\` to the highest number that ran simultaneously.

**Notes**

- Bound concurrency with \`asyncio.Semaphore(limit)\` — \`async with sem:\` around each job.
- Snapshot with \`copy.deepcopy\` so later changes do not leak into the saved state.`,
      tests: TESTS_5, solution: SOL_5,
    },
    {
      n: 6, title: "Dependencies", points: 100, mode: "async",
      changed: "Jobs can depend on other jobs; run them in dependency order.",
      spec: `# Level 6 — Dependencies

A job can require other jobs to finish first. Add:

- \`add_dependency(job_id, depends_on)\` — record that \`job_id\` depends on \`depends_on\`. \`False\` if \`job_id\` is unknown (\`depends_on\` may be any id).
- \`async def run_respecting_deps()\` — repeatedly find every pending job whose dependencies are all done, run that **wave** concurrently, and continue until no job can run. Return the ids in the order they completed (sorted within each wave).
- \`find_unrunnable()\` — a sorted list of jobs that can **never** run: caught in a dependency cycle, or depending on a job that does not exist.

**Notes**

- No graph algorithms needed — \`find_unrunnable\` is a fixpoint sweep: a job is runnable once all its dependencies are known-runnable; repeat until nothing changes.`,
      tests: TESTS_6, solution: SOL_6,
    },
  ],
};
