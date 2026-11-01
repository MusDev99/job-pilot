# 0001: Stack and scope

Date: 2026-10-31 · Decided by: the CTO (repo owner)

## Decisions

| # | Topic | Decision | What it means for the build |
|---|---|---|---|
| 1 | Who uses it | Multi-user SaaS, Google sign-in | Every row carries a `userId`; tenant isolation is a release blocker, not a nice-to-have |
| 2 | Job sources | Start with the job alert emails already in each user's Gmail (LinkedIn, JobStreet, Indeed, ...). Scraping job portals is a later phase | Gmail API with the `gmail.readonly` scope, limited to alert senders/labels; no portal scraping in v1 |
| 3 | Stack | Next.js full stack (App Router, React 19, TypeScript strict, Tailwind 4) on Netlify | Server actions + route handlers; Netlify Scheduled Functions for the periodic inbox sync |
| 4 | Data store | Google Sheets API | One spreadsheet, one tab per entity, written by a service account; all access through `lib/store.ts` |
| 5 | Tailoring | **Deferred to v1.1 (CTO, 2026-11-01): no AI in v1.0.0.** When it returns, AI only rephrases and reorders facts already in the user's resume and the user approves each edit | Grounding check rejects new skills, employers, dates or numbers. Until then no Claude calls, no `ANTHROPIC_API_KEY` |
| 6 | Repo | `MusDev99/job-pilot` | Follows agentic-coding-style and BRANCHING.md |

## Consequences to plan for

| Topic | Fact | Plan |
|---|---|---|
| Gmail scope | `gmail.readonly` is a Google **restricted** scope. While the OAuth app is in *Testing* it works for up to 100 named test users; a public launch needs Google's app verification and a yearly third-party security assessment | v1 runs in Testing mode for invited users. Before a public launch, either pass verification or switch to a per-user forwarding address (no Gmail scope) |
| Sheets as a database | Fine for an MVP; limits are about 10 million cells per spreadsheet and per-minute read/write quotas per project | Batch reads/writes, cache per request, keep raw email bodies out of Sheets (store parsed fields only), archive old jobs. Revisit at ~100 active users |
| Shared spreadsheet | All users share one spreadsheet, so one missing filter leaks data | `lib/store.ts` requires `userId` on every call; unit tests prove cross-user reads return nothing |
| Resume files | Sheets can't hold files | Parse the upload in memory and store only the structured profile (no original file kept). Export is generated on demand |
| Netlify functions | Function runs are time-limited (scheduled functions are short) | Sync a few users per scheduled run, resume from a cursor; heavier work in background functions if the plan allows |
| AI cost | None in v1.0.0 (AI deferred). From v1.1 every extraction and tailoring call costs credit | Extract once per job and cache; daily per-user limit |
| Job details without AI | Alert emails are semi-structured, so a skills dictionary plus salary and seniority patterns will miss some fields | Show "not stated" instead of guessing; measure recall on a hand-labelled set of real alerts; AI extraction in v1.1 can fill the gaps |

## Roadmap to v1.0.0

| Week | Phase | Exit gate |
|---|---|---|
| 0 | Setup: repo, CI, branch policy, four role agents, CLAUDE.md | CI green, main ruleset on |
| 1 | Google sign-in + Sheets store with tenant isolation | Two test users cannot see each other's rows |
| 2 | Connect Gmail, parse job alert emails into jobs, de-duplicate | 50+ real jobs from your inbox, no duplicates, no email bodies stored |
| 3 | Job details, rule-based: skills dictionary, salary and seniority patterns + job list UI | Hand-labelled set of real alerts: skill recall 80%+, 0 invented salaries ("not stated" otherwise) |
| 4 | Resume upload + match score + ranked daily digest email | Score order agrees with your hand ranking; unsubscribe works |
| 5 | Harden + release: OWASP audit, end-to-end tests, Netlify production | No High findings, CTO tags v1.0.0 |

v1.1 (after v1.0.0): AI job-detail extraction and resume tailoring with DOCX/PDF export (grounded, user-approved edits, golden set with 0 invented facts).

Later: job portal scraping (only where terms and robots.txt allow), more sources, cover letters, application tracker stats.

## UI libraries (decided 2026-11-01)

Headless primitives from **Radix** (`radix-ui`) by default, **Base UI** (`@base-ui/react`) when Radix lacks a component; styled components are copied into `components/ui/*` shadcn-style and owned by us. Styling is **Tailwind CSS** only (CTO, 2026-11-01); Tailwind UI is now Tailwind Plus (paid, licensed), so none of its blocks are committed to this public repo. Any other emerging library goes through the checks in `CLAUDE.md`.
