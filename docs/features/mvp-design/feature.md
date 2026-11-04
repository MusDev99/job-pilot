Status: spec-review

# MVP design (v1.0.0): screens and flows

Written by the lead in the Product Owner role. Design only: no code, libraries or file layout (the Senior Architect decides those per slice). Builds on `docs/decisions/0001-stack-and-scope.md`.

**Problem:** A job seeker gets dozens of job alert emails and cannot tell which roles fit. JobPilot turns those emails into one ranked list. Who it is for: someone checking jobs on a phone between meetings.

**The one promise of v1.0.0:** open the app, see today's jobs ranked by how well they fit my resume, and know why.

## Core flow

Sign in → Connect Gmail → Upload resume → Sync → Ranked job list → Job detail → Open original posting.
A daily digest email repeats the top jobs, with an unsubscribe link.

## Screens (mobile first, 375px)

| # | Screen | Content | State rules |
|---|---|---|---|
| S1 | Landing and sign-in | Done (Week 1). | Done. |
| S2 | Setup checklist (empty dashboard) | Three steps: Connect Gmail, Upload resume, First sync. Each shows done or to do; only the next step is the filled button. | Empty state is the checklist. Failed step shows a generic message and a retry. |
| S3 | Job list (home) | Cards ranked by score: title, company, location, score badge, salary or "not stated", seniority or "not stated", matched and missing skill chips. Filters: minimum score, source, new only. "Synced <time>" and a Sync now button. | Empty: no jobs yet, with the next setup step. Loading: skeleton cards. Error: generic message and retry. Never fills a missing field with a guess. |
| S4 | Job detail | Score with a "why this score" breakdown (matched and missing skills), salary, seniority, source, Open original posting (http/https only), Save, Applied, Hide. | Hidden jobs leave the list; status persists. |
| S5 | Resume profile | The structured profile parsed from the upload: skills, seniority, years. Edit skills, replace resume. No original file is stored. | Parse failure: generic message, upload again. |
| S6 | Settings | Gmail connection (Disconnect), Daily digest on or off, Delete all my data (typed confirmation). | Delete and disconnect are the only destructive actions; both confirm. |
| S7 | Digest email | Top 5 jobs with score and link to the app; unsubscribe link works without signing in. | Sent only if there are new jobs. |

## User stories and acceptance criteria

1. As a job seeker, I want my job alerts in one list ranked by fit, so that I apply to the best roles first.
2. As a job seeker, I want to see why a job scored what it did, so that I trust the ranking.
3. As a job seeker, I want to disconnect Gmail and delete my data, so that I stay in control.

| ID | Given | When | Then |
|---|---|---|---|
| AC1 | A new user | Opens the dashboard | Sees the setup checklist with one filled button for the next step |
| AC2 | Gmail connected and a resume uploaded | A sync finishes | Jobs appear ranked by score, highest first, with no duplicates |
| AC3 | A job email lacks a salary or seniority | The job is shown | The field says "not stated"; nothing is invented |
| AC4 | Any job | The user opens it | The matched and missing skills that explain the score are shown |
| AC5 | A job has a link | The user opens the original posting | Only http or https links open |
| AC6 | A second user signs in | They open their list | They see none of the first user's jobs, resume or settings |
| AC7 | The user presses Delete all my data and confirms | It finishes | Their rows and Gmail connection are gone and they are signed out |
| AC8 | A digest email is received | The user opens the unsubscribe link | Digests stop without signing in |
| AC9 | Every screen | Viewed at 375px, keyboard only | No horizontal scroll, 44px targets, visible focus, reduced motion respected |

## Laws of UX

- Von Restorff: one filled button per screen (the next setup step, Open original posting).
- Hick: three filters only; three actions on a job (Save, Applied, Hide).
- Miller and Common Region: cards group each job; max five jobs in the digest.
- Fitts: full-width 44px+ buttons on phones.
- Doherty threshold: skeletons and "Synced <time>" so waiting is visible.
- Goal-gradient: the setup checklist shows progress toward the first ranked list.
- Peak-End: the first ranked list and the clean delete confirmation are the moments to get right.
- Postel: forgiving of messy emails ("not stated"), strict about what is stored.

## Build order (maps to the roadmap)

S2 + Gmail connect (Week 2) → S3/S4 with rule-based details (Week 3) → S5, score, S7 digest (Week 4) → S6 and hardening (Week 5). S6 Disconnect and Delete land with Gmail connect, since that is when data first exists.

## Out of scope for v1.0.0

AI extraction and resume tailoring (v1.1), job portal scraping, cover letters, application stats, multiple resumes, push notifications, roles or teams, dark/light toggle.

## Open questions for the CTO

1. Is the score shown as 0 to 100 or as bands (Strong, Good, Weak)? Proposed: number, with a band colour.
2. Should Hide be undoable from a "Hidden" filter? Proposed: yes, one extra filter value.
3. Which alert senders are in the first release? Proposed: LinkedIn, JobStreet, Indeed.
