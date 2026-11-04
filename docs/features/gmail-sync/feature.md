# Gmail alert sync (MVP)

Status: in progress (3 PRs: parser, sync, dashboard). CTO scope cut 2026-11-04: v1.0.0 = sign-in + Gmail alert parsing + Sheets + job list. Resume match score, digest and AI move to v1.1.

## Story

As a signed-in user, I press **Sync Gmail** and see the jobs from my job alert emails in one list, with skills, salary and seniority when the email states them.

## Design decisions

| Decision | Why |
|---|---|
| Sync is on demand (button), no cron | No Vercel cron or duration limits to design around; the person is present |
| No Gmail token is stored | Each sync sends the person through Google (`gmail.readonly`, `login_hint`, PKCE, state) and uses the access token once, in memory. Nothing to encrypt or leak (OWASP A02) |
| Rules, not AI | `lib/job-extract.ts` (skills dictionary, salary and seniority patterns), `lib/alert-parse.ts` (job-board links + nearby lines). Unsure means "not stated" |
| Only job-board links | Parser keeps links on known boards (LinkedIn, Indeed, JobStreet, Jobsdb, Seek, Glassdoor, Wellfound) with a job-shaped path; links are stored, never fetched (OWASP A10) |
| No raw email stored | Only parsed fields go to the `jobs` tab (CLAUDE.md Gmail rule) |
| Dedupe | By canonical job URL per user, so syncing twice adds nothing |

## Acceptance criteria

1. (PR 1) `parseAlert` turns an alert email into candidates with title, company, location, canonical URL, skills, salary, seniority; non-job and lookalike links are ignored.
2. (PR 1) `extractSalary` returns null for prices and missing salary; `extractSkills` matches whole words only.
3. (PR 2) Sync reads only emails from job-board senders, newest first, at most 50 per sync; stores only new jobs for the signed-in user.
4. (PR 2) Declining Google consent, a Google error or a Gmail outage shows a generic message and changes nothing.
5. (PR 3) Dashboard lists the user's jobs (newest first), each linking out with `rel="noopener noreferrer"`; empty, loading and error states exist.

## Known limits

- Parser is generic and was built from synthetic fixtures until real alert samples arrive; per-sender tweaks follow.
- Dedupe is by URL: the same job posted on two boards shows twice.
