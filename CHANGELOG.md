# Changelog

## 2026-11-05 (dashboard complete)

- Dashboard: summary cards (jobs, last 7 days, salary stated), search plus source and "salary stated" filters (plain GET form, shareable URL), "received" dates, a "no jobs match" state, and a loading skeleton.
- "Delete my data": `POST /api/account/delete` (same-site, signed-in, must type DELETE) removes the user's rows in every tenant tab and signs them out. The `users` row (email, name) stays; removing it needs a store change and is a follow-up.
## 2026-11-04 (remove /login page)

- Removed the separate `/login` page: the landing page's buttons start Google sign-in directly and show sign-in errors (`/?error=`). Signed-out visitors, failed sign-ins and sign-out now go to `/`; `?next=` is still passed through `safeNext()`.

## 2026-11-04 (animated landing)

- Landing page redesigned: split hero ("All your job alerts. One clean list."), four feature cards, one Google button, and an animated app preview (rows rise in, sync ring draws, badges float). CSS only, transform/opacity, switched off under reduced motion. Copy now matches what v1.0.0 does (no match score or tailoring claims). New `--color-success` token, `components/landing-preview.tsx`.
## 2026-11-04 (dashboard job list)

- Dashboard shows the user's jobs (newest first, up to 100): title link (opens in a new tab, `noopener noreferrer`), company, location, source, seniority, salary, skills. **Sync Gmail** is the one primary button; a banner reports the sync outcome. Empty and error states. `lib/job-view.ts` (tested) shapes rows and allows http(s) links only.

## 2026-11-04 (Gmail sync)

- Sync Gmail backend: `/api/gmail/start` and `/api/gmail/callback` ask Google for read-only Gmail access for one sync (PKCE, state, mailbox must match the signed-in user), read up to 50 job-board alert emails from the last 30 days, store only parsed jobs, keep no token. `lib/gmail.ts`, `lib/sync.ts`, `store.insertMany` + `SheetsApi.appendRows` (one write for many rows).
- Setup: add `APP_URL/api/gmail/callback` as a second redirect URI and enable the Gmail API.

## 2026-11-04 (jobs parser)

- MVP scope cut: v1.0.0 = sign-in, Gmail alert parsing, Sheets, job list. Resume score, digest and AI move to v1.1.
- New `jobs` tab in the schema; rule-based `lib/job-extract.ts` (skills, salary, seniority) and `lib/alert-parse.ts` (alert email to job candidates), with tests. Spec: `docs/features/gmail-sync/feature.md`.
## 2026-11-04 (hosting: Vercel for now)

- Docs only: deployment moves from Netlify to Vercel. README deploy steps, `.env.example`, CLAUDE.md and decision record 0001 (with an update note) now name Vercel; the inbox sync is planned on Vercel Cron. `netlify.toml` is kept until Netlify is retired.

## 2026-11-04 (UI scaffold and page states)

- New `components/ui/button.tsx` (`Button`, `ButtonLink`, `ButtonAnchor`): pages no longer use FlyonUI button classes directly, so the look library can be swapped in one place.
- Added `app/loading.tsx`, `app/error.tsx` (generic message, details to `console.error`) and `app/not-found.tsx`.
- Documented why `themeColor` repeats `--color-bg`.

## 2026-11-01 (landing and login redesign)

- Redesigned the landing page (hero, how it works, privacy note) and the sign-in page (centred card, inline error) with FlyonUI 2.4.1 themed from our tokens (`@plugin "flyonui/theme"` in `globals.css`). No horizontal scroll at 375px.
- New shared `components/icons.tsx` (inline icons) and `components/google-icon.tsx`.

## 2026-11-01 (roadmap and UI rule)

- Decision: no AI in v1.0.0. Job details become rule-based (Week 3), Week 5 is harden + release, AI extraction and tailoring move to v1.1. `ANTHROPIC_API_KEY` is not used until then.
- New UI library rule: Radix by default, Base UI as second source, shadcn-style `components/ui/*`, FlyonUI as the look layer with Radix for behaviour (stale-release waiver noted), no Tailwind Plus blocks in the public repo, checks for any new library.

## 2026-11-01 (sign-in)

- Week 1 Google sign-in: OAuth code flow with PKCE, state and nonce; ID-token verification (signature, issuer, audience, expiry, nonce, verified email); users tab with find-or-create, deactivation and optional `SIGNUP_ALLOWLIST`; 24-hour signed session cookie; `proxy.ts` route guard that fails closed (503) in production; `/login`, `/dashboard` shell, CSRF-checked sign-out; `APP_URL` is now required. Feature spec in `docs/features/google-sign-in/`.

## 2026-11-01

- Week 1 data layer: tenant-scoped Google Sheets store (`lib/store.ts`) with per-user isolation, formula-injection guard, strict header check and fail-loud outages; real Sheets client with service-account auth and retry (`lib/sheets-client.ts`); private-key normaliser (`lib/pem.ts`); feature spec in `docs/features/data-layer/`.

## 2026-10-31

- Week 0 scaffold: Next.js 16 + React 19 + Tailwind 4 + strict TypeScript, Netlify config, security headers/CSP, fail-closed `/api/health`, config checks with tests.
- CI (`verify`: typecheck, tests, build, dependency audit) and `branch-policy` workflows, PR template.
- Agent team: Product Owner, Senior Architect, QA, Security Auditor + `/team` command with two CTO gates; shared code-review skill.
- CLAUDE.md with architecture rules, OWASP Top 10 table and Definition of done; decision record 0001 with the roadmap.
