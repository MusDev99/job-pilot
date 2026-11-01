# 🧭 JobPilot

Job agent portal: your job alert emails, turned into one ranked list, scored against your ATS resume, with a resume you can tailor per job (tailoring arrives in v1.1).

> Status: **Week 1**. Data layer and Google sign-in are in; the signed-in dashboard is an empty shell until Gmail arrives in Week 2. Features arrive weekly (see the roadmap).

## Features (planned)

| | Feature | Week |
|---|---|---|
| 🔐 | Google sign-in, multi-user, each user sees only their own data | 1 |
| 📬 | Reads job alert emails (LinkedIn, JobStreet, Indeed, ...) from your Gmail | 2 |
| 🧾 | Extracts job details (skills, salary, seniority, location) with plain rules, no AI | 3 |
| 🎯 | Upload your ATS resume, get a 0 to 100 match score per job with matched and missing skills | 4 |
| 📧 | Daily digest email of your best matches | 4 |
| 🔒 | Security audit, end-to-end tests, v1.0.0 release | 5 |
| ✍️ | AI job-detail extraction and tailored resume suggestions you approve, exported to DOCX/PDF | v1.1 |

Full decisions, trade-offs and roadmap: [docs/decisions/0001-stack-and-scope.md](docs/decisions/0001-stack-and-scope.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind 4 + FlyonUI · Google Sheets API (data store) · Gmail API · Radix / Base UI primitives · Netlify. (Claude API arrives in v1.1.)

## Develop

```bash
npm install
cp .env.example .env.local   # fill in what the current week needs
npm run dev                  # http://localhost:3000
npm run verify               # typecheck + tests + build (same as CI)
```

`GET /api/health` returns `200 {"status":"ok"}` when configuration is complete and `503 {"status":"unconfigured"}` otherwise (fail closed).

## Deploy (Netlify)

1. Import the repo in Netlify; it detects Next.js (`netlify.toml` sets the build command and Node 22).
2. Add the variables from `.env.example` under Site configuration > Environment variables.
3. Check `https://<site>/api/health` returns `ok`.

## Data layer

All data lives in one Google Sheet (one tab per entity, row 1 = header, columns defined in `lib/schema.ts`). Code never calls the Sheets API directly: it goes through `createStore(...).forUser(userId)` in `lib/store.ts`, which filters every read and write by the signed-in user's id, so one user can never read or change another's rows. Text cells are guarded against spreadsheet formula injection, and a changed header or an outage fails loudly instead of looking like an empty table.

To prepare the sheet (needed from the sign-in slice on): create a Google Sheet, create a service account, share the sheet with its email as **Editor**, and set `SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (see `.env.example`). Tabs are created automatically.

## Sign-in setup (Google Cloud)

1. In Google Cloud Console create a project, then **APIs & Services → OAuth consent screen** (External, status *Testing*; add yourself and invited users as test users) and **Credentials → Create OAuth client ID → Web application**.
2. Add the authorised redirect URIs `http://localhost:3000/api/auth/callback` and `https://<your-site>/api/auth/callback`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` (the origin, no trailing slash) and `AUTH_SECRET` (`openssl rand -base64 48`). Optionally `SIGNUP_ALLOWLIST=you@example.com,friend@example.com`.
4. Create the data store: enable the **Google Sheets API**, create a service account and a key, create a Google Sheet and share it with the service account's email as **Editor**; set the three `SHEETS_*` / `GOOGLE_SERVICE_ACCOUNT_*` variables.

Flow: `/api/auth/google` (state + nonce + PKCE, signed 10-minute cookie) → Google → `/api/auth/callback` (verifies state, exchanges the code, checks the ID token's signature, issuer, audience, expiry, nonce and verified email, then finds or creates the user) → 24-hour signed `HttpOnly` session cookie. `proxy.ts` guards every route except `/`, `/login`, `/api/health` and `/api/auth/*`; without configuration, production answers 503.

## Team and workflow

Built with a Claude Code agent team (`/team <idea>`): Product Owner, Senior Architect, QA and Security Auditor, with the repo owner as CTO holding the spec and release gates. See [CLAUDE.md](CLAUDE.md) for rules, OWASP table and Definition of done, and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md) for the git flow.

## Project structure

```
app/                  Next.js routes (landing, login, dashboard, api/health, api/auth/*)
components/           Shared UI pieces (icons, Google mark); FlyonUI theme lives in app/globals.css
proxy.ts              route guard (session check, fail closed)
lib/                  config checks, tenant-scoped store + users (`store.ts`), Sheets client, schema, cell guard,
                      sessions (`auth-core.ts`), Google OIDC (`oidc.ts`, `google.ts`), sign-in decision (`sign-in.ts`)
tests/                node --test unit tests
docs/decisions/       architecture decisions + roadmap
docs/features/        one feature.md per feature (written by the Product Owner agent)
.claude/agents/       the four role agents
.claude/commands/     /team
.agents/skills/       shared code-review checklist
```
