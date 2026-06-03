/* sources.js — every public URL the trainer is built from.
 *
 * Each source has: title, url, kind, blurb. `kind` is one of:
 *   "official"   — primary documentation from CodeSignal or Anthropic
 *   "repo"       — a GitHub repository
 *   "writeup"    — a candidate's first-person account
 *   "aggregator" — a prep-guide site (Exponent, LinkJob, aiofferly, etc.)
 *   "forum"      — Blind, 1Point3Acres, LeetCode discuss
 *   "spec"       — a problem spec or test harness reproduction
 *
 * Categories group sources by intent. Every URL was verified during the
 * trainer's research pass — see the meta block at the bottom for the
 * verification date and the agents that surfaced each link.
 */

export default [
  {
    id: "codesignal",
    title: "CodeSignal — Official",
    blurb:
      "The vendor's own documentation of the Industry Coding Assessment. The KB rules page is the only primary source for the 4-level / 90-min / 200-600 normalized-score structure.",
    sources: [
      {
        kind: "official",
        title: "ICA Rules (Knowledge Base)",
        url: "https://support.codesignal.com/hc/en-us/articles/19116922232983-What-are-the-Industry-Coding-Assessment-ICA-rules",
        blurb:
          "\"The ICA contains 1 domain-agnostic, project-based question with 4 progressive levels.\" The single most-cited line in this trainer.",
      },
      {
        kind: "official",
        title: "GCA Rules (Knowledge Base)",
        url: "https://support.codesignal.com/hc/en-us/articles/360051960134-General-Coding-Assessment-GCA-Rules-and-Setup",
        blurb:
          "The GCA is the OTHER CodeSignal assessment — 70 min, 4 unrelated algorithmic problems. Useful for telling people which one they're sitting.",
      },
      {
        kind: "official",
        title: "Understanding Assessment Score",
        url: "https://support.codesignal.com/hc/en-us/articles/13261190299287-Understanding-Assessment-Score",
        blurb:
          "Scoring is normalized to a 200-600 scale; only non-submitters get 200. The 250-pts-per-level / 1000-raw figure that prep guides quote is candidate-reported, not officially published here.",
      },
      {
        kind: "official",
        title: "What are Frameworks",
        url: "https://support.codesignal.com/hc/en-us/articles/4413651969431-What-are-Frameworks",
        blurb: "CodeSignal's own description of the Industry Coding Framework as a product.",
      },
      {
        kind: "official",
        title: "Industry Coding Framework — marketing page",
        url: "https://codesignal.com/resource/industry-coding-framework/",
        blurb: "Higher-level pitch for employers buying ICA. Useful for understanding why CodeSignal believes the format predicts on-the-job performance.",
      },
      {
        kind: "official",
        title: "Industry Coding Framework — Technical Brief (PDF)",
        url: "https://discover.codesignal.com/rs/659-AFH-023/images/Industry-Coding-Skills-Evaluation-Framework-CodeSignal-Skills-Evaluation-Lab-Short.pdf",
        blurb: "The skills-evaluation white paper, distributed as a binary PDF. Documents the level-by-level skill rubric.",
      },
      {
        kind: "official",
        title: "Proctoring Requirements",
        url: "https://support.codesignal.com/hc/en-us/articles/360039872174",
        blurb: "Webcam + mic + screen recording + government ID. External resources prohibited. Recordings deleted within 15 days.",
      },
      {
        kind: "official",
        title: "Progressive Workspace Level Changes",
        url: "https://support.codesignal.com/hc/en-us/articles/13291037055255",
        blurb: "Describes how the workspace evolves between levels — what state carries forward and what the candidate sees when L2 unlocks.",
      },
      {
        kind: "official",
        title: "Robinhood × CodeSignal case study",
        url: "https://codesignal.com/customers/robinhood/",
        blurb: "Public customer case study showing the same framework being used outside Anthropic.",
      },
    ],
  },

  {
    id: "anthropic",
    title: "Anthropic — Primary Sources",
    blurb:
      "What Anthropic itself publishes about the Fellows program. Notably, Anthropic does NOT publicly name CodeSignal or 'ICA' on any official page — that linkage comes from candidate reports.",
    sources: [
      {
        kind: "official",
        title: "Anthropic Fellows Program 2026 announcement",
        url: "https://alignment.anthropic.com/2025/anthropic-fellows-program-2026/",
        blurb: "Cohorts May & July 2026, 4-month program, $3,850/wk stipend, ~$15k/mo compute, 25-50% conversion to full-time offers.",
      },
      {
        kind: "official",
        title: "Anthropic — Candidate AI Guidance",
        url: "https://www.anthropic.com/candidate-ai-guidance",
        blurb: "\"Complete these without Claude unless we indicate otherwise.\" The official policy on AI assistance during the screen — explicitly forbidden.",
      },
      {
        kind: "official",
        title: "Anthropic Fellows — Greenhouse listing (London)",
        url: "https://job-boards.greenhouse.io/anthropic/jobs/5023394008",
        blurb: "Public job posting for the Fellows program. Mentions \"technical assessments\" generically; never names CodeSignal.",
      },
      {
        kind: "official",
        title: "Anthropic Fellows — Greenhouse listing (Bay Area)",
        url: "https://job-boards.greenhouse.io/anthropic/jobs/5030244008",
        blurb: "Companion job listing for the Bay Area cohort.",
      },
      {
        kind: "writeup",
        title: "Fortune — Anthropic bans AI during job applications",
        url: "https://fortune.com/2025/05/19/ai-company-anthropic-chatbots-banned-hiring-job-applicants-communication/",
        blurb: "Reuters/Fortune story quoting Anthropic's stated reason for the no-AI-during-screening rule — useful as a citable AP-style source.",
      },
    ],
  },

  {
    id: "repos",
    title: "Practice Repos (GitHub)",
    blurb:
      "The most useful public solution repos. LibreSignal is the best ICF simulator overall; PaulLockett is the canonical file-storage spec. The trainer's mock exams cite these by name.",
    sources: [
      {
        kind: "repo",
        title: "EricZheng0404/LibreSignal",
        url: "https://github.com/EricZheng0404/LibreSignal",
        blurb: "The best 4-level ICA simulator. Ships Banking System and In-Memory DB, each with level1-4 markdown specs, simulation.py stubs, reference solutions, and pytest suites. This trainer's mock-bank-4 and mock-imdb-4 cite it directly.",
      },
      {
        kind: "repo",
        title: "PaulLockett/CodeSignal_Practice_Industry_Coding_Framework",
        url: "https://github.com/PaulLockett/CodeSignal_Practice_Industry_Coding_Framework",
        blurb: "Mock ICF pre-screen with the canonical file_storage 4-level project (FILE_UPLOAD / FILE_GET / FILE_COPY / FILE_SEARCH / FILE_UPLOAD_AT / ROLLBACK). Pins Python 3.10.6 to match CodeSignal. mock-files-4 is built directly from this.",
      },
      {
        kind: "repo",
        title: "MayukhSobo/in-memory-db",
        url: "https://github.com/MayukhSobo/in-memory-db",
        blurb: "Independent in-memory DB implementation in Go with the L1-L3 method names (Set/Get/Delete/Scan/ScanByPrefix/SetAtWithTtl/...). Useful cross-reference for method signatures.",
      },
      {
        kind: "repo",
        title: "Leader-board/OA-and-Interviews",
        url: "https://github.com/Leader-board/OA-and-Interviews",
        blurb: "A cross-company OA tracker that catalogs which firms use CodeSignal vs HackerRank vs Codility. Interview-experience corpus — not a problem-spec source — but useful for surveying the landscape.",
      },
      {
        kind: "repo",
        title: "amshrestha2020/CodeSignal",
        url: "https://github.com/amshrestha2020/CodeSignal",
        blurb: "Broad CodeSignal solution dump organized by company and topic. Includes legacy arcade problems alongside ICA.",
      },
      {
        kind: "repo",
        title: "topic — codesignal-solutions",
        url: "https://github.com/topics/codesignal-solutions",
        blurb: "GitHub topic feed aggregating ~hundreds of community CodeSignal-solution repos. The discovery starting point for any new variant you encounter.",
      },
      {
        kind: "repo",
        title: "topic — codesignal-interview-practice",
        url: "https://github.com/topics/codesignal-interview-practice",
        blurb: "Companion topic feed scoped to interview-prep repos specifically.",
      },
    ],
  },

  {
    id: "anthropic-archetypes",
    title: "Anthropic Archetype Writeups",
    blurb:
      "Third-party documentation of the specific problems candidates report seeing on the Anthropic Fellows / SWE / ML-intern CodeSignal screen.",
    sources: [
      {
        kind: "writeup",
        title: "aonecode — Anthropic OA: In-Memory DB",
        url: "https://aonecode.com/iq/docs/antropic/online-assessment/in-memory-db",
        blurb: "Full level-by-level breakdown of the Anthropic in-memory-DB prompt with backup/restore L4. Cited by mock-imdb-4.",
      },
      {
        kind: "writeup",
        title: "aonecode — Anthropic OA: Cloud Storage",
        url: "https://aonecode.com/iq/docs/antropic/online-assessment/cloud-storage-system",
        blurb: "Anthropic cloud-storage variant. Confirms the sequential unlock + always-readable-earlier-levels contract.",
      },
      {
        kind: "writeup",
        title: "csoahelp — In-Memory DB ICA breakdown (Feb 2025)",
        url: "https://csoahelp.com/2025/02/09/codesignal-in-memory-database-industry-oa/",
        blurb: "Dense Chinese/English bilingual walk-through with method signatures and the L3 timestamp refactor pattern.",
      },
      {
        kind: "writeup",
        title: "prachub — In-Memory DB with TTL + Backup",
        url: "https://prachub.com/interview-questions/design-in-memory-db-with-ttl-and-backup",
        blurb: "Confirms the backup(timestamp) -> int signature and the TTL re-anchoring rule on restore.",
      },
      {
        kind: "writeup",
        title: "linkjob — Anthropic CodeSignal practice",
        url: "https://www.linkjob.ai/interview-questions/codesignal-anthropic-practice/",
        blurb: "Candidate report: \"In 90 minutes, candidates had to solve one coding challenge split into four escalating levels.\" Difficulty pegged L1 easy / L2-L3 medium / L4 hard.",
      },
      {
        kind: "writeup",
        title: "linkjob — Anthropic Software Engineer interview",
        url: "https://www.linkjob.ai/interview-questions/anthropic-software-engineer-interview/",
        blurb: "Full SWE pipeline writeup. CodeSignal is the first screen.",
      },
      {
        kind: "writeup",
        title: "Lodely — Anthropic OA 2025 breakdown",
        url: "https://www.lodely.com/blog/anthropic-oa",
        blurb: "Candidate-aggregator post covering 2025 OA reports.",
      },
      {
        kind: "writeup",
        title: "aiofferly — Anthropic Pre-Screen 2026 guide",
        url: "https://www.aiofferly.com/career-guide/anthropic-pre-screen-coding-assessment-2026",
        blurb: "Quotes the disputed Anthropic CodeSignal cutoff: HR says 480, candidate reports suggest ~600 is the real bar.",
      },
      {
        kind: "writeup",
        title: "Final Round — How to ace the Anthropic CodeSignal",
        url: "https://www.finalroundai.com/blog/how-to-ace-your-anthropic-code-signal-assessment-a-step-by-step-guide",
        blurb: "Prep aggregator with a step-by-step pacing plan.",
      },
      {
        kind: "writeup",
        title: "Exponent — Anthropic AI Safety Fellow guide",
        url: "https://www.tryexponent.com/guides/anthropic-ai-safety-fellow-interview",
        blurb: "Best single overview of the full Fellows pipeline. \"a single system that extends across four progressively harder stages\" with 250 pts per stage.",
      },
      {
        kind: "writeup",
        title: "Josh Roy — ICF Reflections (Medium)",
        url: "https://medium.com/@thosehippos/advice-preparation-for-codesignal-industry-coding-framework-test-reflections-0260f903ce7f",
        blurb: "First-person reflection from a successful candidate. \"The ICF Test is comprised of 4 levels.\" Advocates Python for speed.",
      },
      {
        kind: "writeup",
        title: "Zack Hui — I Didn't Get the Anthropic Fellowship",
        url: "https://medium.com/@zackhui52/i-didnt-get-the-anthropic-fellowship-but-i-got-a-story-and-a-cigar-4615fea6edc0",
        blurb: "Failed-finalist post-mortem. \"Didn't think anyone could finish both parts in 55 minutes.\"",
      },
      {
        kind: "writeup",
        title: "Georg Lange — I Reviewed Hundreds of AI Safety Applications",
        url: "https://georglange.com/post/ai-safety-application-guide/",
        blurb: "Inside-the-process view from someone who reviewed applications.",
      },
    ],
  },

  {
    id: "non-anthropic-archetypes",
    title: "Same Framework, Other Companies",
    blurb:
      "CodeSignal sells the ICA to many employers. These reports document the same 4-level shape with different domain archetypes — useful for breadth practice.",
    sources: [
      {
        kind: "writeup",
        title: "eBay — Bank System ICA (LeetCode discuss)",
        url: "https://leetcode.com/discuss/post/7302772/",
        blurb: "The original eBay banking-system writeup with create_account, deposit, transfer, top_spenders, pay (cashback), merge_accounts, get_balance signatures.",
      },
      {
        kind: "writeup",
        title: "eBay — additional ICA thread (LeetCode discuss)",
        url: "https://leetcode.com/discuss/post/7316549/",
        blurb: "Companion thread on the eBay banking ICA.",
      },
      {
        kind: "writeup",
        title: "interviewexperiences.in — eBay CodeSignal OA",
        url: "https://interviewexperiences.in/experience/ebay/ebay-codesignal-oa-industry-coding-assessment",
        blurb: "Polished writeup of the eBay banking ICA experience.",
      },
      {
        kind: "writeup",
        title: "oavoservice — eBay CodeSignal breakdown",
        url: "https://oavoservice.com/en/articles/ebay-oa-codesignal-simulation-2025-12",
        blurb: "December 2025 eBay OA breakdown.",
      },
      {
        kind: "writeup",
        title: "Persona OA (DEV.to)",
        url: "https://dev.to/net_programhelp_e160eef28/persona-oa-ultimate-guide-codesignal-90-minute-4-question-full-breakdown-ood-system-design-1b4j",
        blurb: "Persona's cloud-storage variant with find_by_prefix/find_by_suffix, add_user/update_capacity (largest-first eviction), compress_file/decompress_file. The source for mock-cloud-4.",
      },
      {
        kind: "writeup",
        title: "programhelp — Persona OA interview experience",
        url: "https://programhelp.net/en/oa/persona-oa-interview-experience/",
        blurb: "Original-language source for the Persona compression+quota variant.",
      },
      {
        kind: "writeup",
        title: "linkjob — Coinbase CodeSignal insider guide",
        url: "https://www.linkjob.ai/interview-questions/coinbase-codesignal-assessment-insider-guide/",
        blurb: "Coinbase variant: banking-system + recipe-management problems.",
      },
      {
        kind: "writeup",
        title: "prachub — Coinbase coding & algorithms set",
        url: "https://prachub.com/companies/coinbase/categories/coding-and-algorithms",
        blurb: "Aggregated Coinbase OA reports.",
      },
      {
        kind: "writeup",
        title: "linkjob — Trade Desk CodeSignal",
        url: "https://www.linkjob.ai/interview-questions/the-trade-desk-codesignal-questions/",
        blurb: "Trade Desk's ad-serving variant.",
      },
      {
        kind: "writeup",
        title: "linkjob — Capital One CodeSignal journey",
        url: "https://www.linkjob.ai/interview-questions/capital-one-codesignal-questions-preparation-tips-experience/",
        blurb: "Capital One ICA writeup; the company also uses GCA at the same stage.",
      },
      {
        kind: "writeup",
        title: "Final Round — top 10 Capital One CodeSignal questions",
        url: "https://www.finalroundai.com/blog/top-10-capital-one-code-signal-questions-you-should-prepare-for",
        blurb: "Per-question prep guide.",
      },
      {
        kind: "writeup",
        title: "Meta CodeSignal OA 2026 (Medium)",
        url: "https://medium.com/@programhelp/meta-oa-2026-full-ac-experience-codesignal-70-min-4-question-breakdown-pro-tips-349571e4548d",
        blurb: "Meta's GCA-style 4-question OA — NOT ICA. Useful contrast to know which one you're sitting.",
      },
      {
        kind: "writeup",
        title: "Shadecoder — Meta interview guide 2026",
        url: "https://www.shadecoder.com/blogs/meta-interview-guide-2026-oa-coding-assessment-prep",
        blurb: "Full Meta interview prep guide.",
      },
    ],
  },

  {
    id: "forums",
    title: "Forum Threads (Anecdotes)",
    blurb:
      "Login-gated but search-indexed. Use these for tone and candidate sentiment; don't treat any one anecdote as ground truth.",
    sources: [
      {
        kind: "forum",
        title: "Blind — Anthropic Fellows: CodeSignal",
        url: "https://www.teamblind.com/post/anthropic-fellows-codesignal-7arda4gi",
        blurb: "Candidate impressions of the Fellows-specific CodeSignal experience.",
      },
      {
        kind: "forum",
        title: "Blind — Anthropic CodeSignal Passing Score",
        url: "https://www.teamblind.com/post/Anthropic-CodeSignal-Passing-Score-aWOaMCAW",
        blurb: "\"The bar is likely 600 out of 600\" — perfect-score anecdotes from rejected candidates.",
      },
      {
        kind: "forum",
        title: "Blind — Anthropic CodeSignal Experience",
        url: "https://www.teamblind.com/post/Anthropic-Codesignal-Experience-Jzww5q7T",
        blurb: "\"4 parts that involve a toy simulator\" + planning advice.",
      },
      {
        kind: "forum",
        title: "Blind — Which companies use 4-level CodeSignal",
        url: "https://www.teamblind.com/post/which-companies-use-codesignal-4-levels-assessment-test-6kCh6vq0",
        blurb: "Crowd-sourced list of ICA employers.",
      },
      {
        kind: "forum",
        title: "Blind — Companies using ICA",
        url: "https://www.teamblind.com/post/what-companies-use-codesignal-industry-coding-assessment-r0qauxqt",
        blurb: "Companion thread.",
      },
      {
        kind: "forum",
        title: "1point3acres — Anthropic ML Intern two-round CodeSignal",
        url: "https://www.1point3acres.com/interview/thread/1177056",
        blurb: "Chinese-language candidate report of a two-round screen for ML intern roles.",
      },
      {
        kind: "forum",
        title: "1point3acres — In-Memory DB OA guide",
        url: "https://www.1point3acres.com/interview/thread/1110874",
        blurb: "Detailed Chinese-language guide to the in-memory DB ICA with scoring math (40 test cases, 1000 max, normalized to 600).",
      },
    ],
  },

  {
    id: "practice-problem",
    title: "Practice Problem (Integer Container)",
    blurb:
      "The public CodeSignal practice task for the ICA. Worth rehearsing before the real test simply for environment familiarity.",
    sources: [
      {
        kind: "spec",
        title: "CodeSignal — practice landing",
        url: "https://app.codesignal.com/assessments/practice",
        blurb: "The official practice gateway (requires CodeSignal login).",
      },
      {
        kind: "spec",
        title: "Chegg — Integer Container task statement",
        url: "https://www.chegg.com/homework-help/questions-and-answers/program-starts-empty-container-add-add-specified-integer-value-container-delete-attempt-re-q95527476",
        blurb: "Reposted problem statement (Chegg paywall). Confirms the add / delete / getMedian signature with leftmost-middle even-length rule.",
      },
      {
        kind: "spec",
        title: "Brainly — Integer Container task statement",
        url: "https://brainly.com/question/30002186",
        blurb: "Companion repost. Use either source to cross-check the spec wording.",
      },
      {
        kind: "writeup",
        title: "Elijer — CodeSignal Practice Challenge",
        url: "https://elijer.github.io/garden/Programming/LeetCode-Journal/16)-Code-Signal-Practice-Challenge",
        blurb: "Worked solution with the explicit leftmost-middle median rule. The clearest single source for the practice problem.",
      },
      {
        kind: "writeup",
        title: "Interview Coder — CodeSignal questions",
        url: "https://www.interviewcoder.co/blog/code-signal-questions",
        blurb: "Catalog of CodeSignal question types including the Integer Container practice task.",
      },
    ],
  },

  {
    id: "context",
    title: "Context & Privacy",
    blurb:
      "Adjacent reading on how the platform actually works during the test — proctoring, recording, what to expect from the browser environment.",
    sources: [
      {
        kind: "writeup",
        title: "Shadecoder — Does CodeSignal record your screen? (2025)",
        url: "https://www.shadecoder.com/blogs/does-codesignal-record-your-screen-2025-privacy-monitoring-and-candidate-preparation-guide",
        blurb: "What the proctoring layer captures, what it retains, what's flagged.",
      },
    ],
  },
];
