# 🧭 JobPilot

Job agent portal: your job alert emails, turned into one ranked list, scored against your ATS resume, with a resume you can tailor per job.

> Status: **Week 1 (in progress)**. Data layer is in; Google sign-in is next. The app is still a landing page and a health check; features arrive weekly (see the roadmap).

## Features (planned)

| | Feature | Week |
|---|---|---|
| 🔐 | Google sign-in, multi-user, each user sees only their own data | 1 |
| 📬 | Reads job alert emails (LinkedIn, JobStreet, Indeed, ...) from your Gmail | 2 |
| 🧾 | Extracts job details: skills, salary, seniority, location | 3 |
| 🎯 | Upload your ATS resume, get a 0 to 100 match score per job with matched and missing skills | 4 |
| 📧 | Daily digest email of your best matches | 4 |
| ✍️ | Tailored resume suggestions you approve, exported to DOCX/PDF | 5 |

Full decisions, trade-offs and roadmap: [docs/decisions/0001-stack-and-scope.md](docs/decisions/0001-stack-and-scope.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind 4 · Google Sheets API (data store) · Gmail API · Claude API · Netlify.

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

## Team and workflow

Built with a Claude Code agent team (`/team <idea>`): Product Owner, Senior Architect, QA and Security Auditor, with the repo owner as CTO holding the spec and release gates. See [CLAUDE.md](CLAUDE.md) for rules, OWASP table and Definition of done, and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md) for the git flow.

## Project structure

```
app/                  Next.js routes (page, layout, api/health)
lib/                  config checks, tenant-scoped store (`store.ts`), Sheets client (`sheets-client.ts`), schema, cell guard
tests/                node --test unit tests
docs/decisions/       architecture decisions + roadmap
docs/features/        one feature.md per feature (written by the Product Owner agent)
.claude/agents/       the four role agents
.claude/commands/     /team
.agents/skills/       shared code-review checklist
```
