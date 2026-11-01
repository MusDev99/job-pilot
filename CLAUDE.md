# CLAUDE.md

JobPilot: multi-user SaaS job agent portal. Reads job alert emails from each user's Gmail, extracts job details (skills, salary, seniority), and scores each job against the user's ATS resume. AI extraction and resume tailoring are deferred to v1.1. Next.js 16 (App Router) + React 19 + Tailwind 4 + strict TypeScript, Google Sheets as the data store, deployed on Netlify. Decisions and roadmap: [docs/decisions/0001-stack-and-scope.md](docs/decisions/0001-stack-and-scope.md). Process: [Agentic Coding Style](https://musdev99.github.io/agentic-coding-style) and [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md).

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # node --test, Node 22.18+ (runs .ts directly)
npm run typecheck  # tsc --noEmit
npm run verify     # typecheck + tests + build (= CI, run before every commit)
```

## Team (`/team <idea>`)

Four Claude Code subagents in `.claude/agents/`, run by `/team` (`.claude/commands/team.md`). The repo owner is the **CTO** and holds both gates (spec approval, then push/merge/tag/deploy).

| Role | Agent | Writes |
|---|---|---|
| 🧑‍💼 Product Owner | `product-owner` | `docs/features/<slug>/feature.md` (stories, ACs, Laws of UX) |
| 🏗️ Senior Architect | `senior-architect` | design section + code + tests + docs |
| 🧪 QA | `qa` | verdict only (uses `.agents/skills/code-review/SKILL.md`) |
| 🛡️ Security Auditor | `security-auditor` | verdict only; release audit table for `docs/audits/` |

## Architecture rules

- Pure logic lives in `lib/*.ts` with tests in `tests/`; pass time and environment in, never read the clock or `process.env` inside pure code (see `lib/config.ts`).
- **Data store (from Week 1)**: one spreadsheet, one tab per entity, row 1 = header, column order defined once in `lib/schema.ts`. **All access goes through `lib/store.ts`**, and every function takes the signed-in `userId` and filters by it. Never call the Sheets API elsewhere. Batch reads/writes. Text written to a cell goes through a formula-injection guard.
- **Users and sessions**: the `users` tab is only touched by `store.users.signIn` (find by Google `sub`, else by email; a different `sub` on a known email is refused; inactive users are refused; optional `SIGNUP_ALLOWLIST` gates new accounts only). Session cookie `jp_session` = HMAC-signed `{uid,email,exp}` (24h); `uid` is the `userId` for every store call. Pure logic: `lib/auth-core.ts`, `lib/oidc.ts`, `lib/sign-in.ts`; wiring only in `lib/server.ts`.
- **Tenant isolation**: a route, server action or scheduled job must never return or change another user's rows. Every server action starts with `await requireSession()`.
- **Gmail (from Week 2)**: scope `gmail.readonly` only, queries limited to job alert senders/labels. Store parsed job fields, never raw email bodies. Users can disconnect Gmail and delete all their data.
- **Resume**: parsed in memory on upload; only the structured profile is stored. No original file is kept.
- **AI (deferred to v1.1, CTO decision 2026-11-01)**: v1.0.0 makes **no Claude calls** and needs no `ANTHROPIC_API_KEY`; job details come from rules (skills dictionary, salary and seniority patterns, "not stated" when unsure). When AI returns: Claude is called only from `lib/claude.ts` (`server-only`, key in `ANTHROPIC_API_KEY`, model `JOB_MODEL`, default `claude-opus-5-5`). Email and job text go in as data inside tags, with a rule to ignore instructions in it; outputs are schema-validated; extracted facts must quote their source text. The **match score is deterministic code**, never the model's opinion. Tailoring may only rephrase or reorder facts in the user's profile. Any AI failure falls back to a rule-based result with a note.
- Pages that read user data export `dynamic = "force-dynamic"`.

## UI libraries

- **Behaviour and accessibility** come from headless primitives: **Radix** (`radix-ui`) by default; **Base UI** (`@base-ui/react`) when Radix lacks a component or falls behind; React Aria or Headless UI are also acceptable. Never hand-roll dialogs, menus, popovers, comboboxes or tabs.
- **Look**: styled components are copied into `components/ui/*` (shadcn-style) and owned by us, built from tokens only. Pages and features import from `components/ui/*`, never from a vendor primitive directly, so a library can be swapped in one place.
- **Styling is Tailwind CSS** (free, v4, tokens in `@theme`). Tailwind UI is now Tailwind Plus (paid, licensed): CTO decision 2026-11-01 is to use Tailwind CSS only, so do not copy Plus blocks into this public repo; build layouts from primitives and tokens.
- **A new or emerging UI library** needs a design note from the Senior Architect and a Security check (OWASP A06/A08) before it is added: headless and accessible, works with React 19 and Tailwind 4, had a release in the last 6 months, exact version, lockfile committed, `npm audit` clean, nothing loaded from a CDN. Prefer one primitive library per component type.
- Client components only where interaction needs them (`"use client"`); keep the Laws of UX, 44px touch targets and reduced-motion rules below.

## Rules

- Strict TypeScript: no `any`, no `@ts-ignore`. No `dangerouslySetInnerHTML`.
- Design tokens only (`@theme` in `app/globals.css`); no raw hex in components.
- Mobile-first: 375px, no horizontal scroll, touch targets ≥ 44px, respect `prefers-reduced-motion`. Apply the [Laws of UX](https://lawsofux.com/) and name the law in the PR and in a short code comment where it drives a decision.
- Empty, loading and error states are required. User-facing errors are generic; details go to `console.error` only.
- Secrets only in env (Netlify environment variables); never commit `.env*`, `credentials/` or `keys/`. Document new variables in `.env.example`. Error messages name variables, never their values.
- Exact dependency versions; commit `package-lock.json`.

## Security: OWASP Top 10 (2021), mandatory

| Risk | Rule in this repo |
|---|---|
| A01 Access control | Every route except `/`, `/login`, `/api/auth/*` and `/api/health` needs a session; every server action calls `await requireSession()` first; every store call is scoped by `userId`. Redirect targets go through `safeNext()` |
| A02 Crypto | Secrets only in env. Sessions are HMAC-signed, `HttpOnly`, `SameSite=Lax`, `Secure` in prod. OAuth uses `state` + `nonce` + PKCE and verifies the ID token. Gmail refresh tokens are encrypted at rest. Never hand-roll other crypto |
| A03 Injection | Validate + trim on the server; formula-injection guard on every cell write; no `dangerouslySetInnerHTML`; links only http(s) |
| A04 Design | Fail closed: production without auth configuration returns 503 (`checkConfig` in `lib/config.ts`) |
| A05 Misconfiguration | Headers/CSP live in `next.config.ts`; generic user-facing errors; no debug output |
| A06 Components | `npm audit --omit=dev` in CI and before each release; never `npm audit fix --force` without a test pass |
| A07 Auth | Constant-time signature compare, throttled OAuth start/callback, one generic sign-in error |
| A08 Integrity | Commit the lockfile; a new external host must be added to the CSP deliberately |
| A09 Logging | Log failures server-side; never log tokens, keys, resume text or email bodies |
| A10 SSRF | Server code fetches fixed hosts only (Google APIs, Claude API, the email provider); never a URL taken from the client or an email |

## Git

Never commit to `main`. Branches `feat/` `fix/` `chore/` `docs/` (agent sessions may use their given `claude/` branch). Conventional Commits for commits and PR titles (checked by `branch-policy.yml`). Squash merge, one concern per PR, under ~400 changed lines. CI `verify` + `branch-policy` must be green. Update `README.md` and add a `CHANGELOG.md` entry at the top in the same PR. SemVer tags `vX.Y.Z`.

## Definition of done

1. `npm run verify` passes.
2. Exercised at 375px and desktop, including empty, error and keyboard-only paths.
3. A second test user cannot see or change the first user's data.
4. No new `any`, `@ts-ignore`, hardcoded data or secrets in the diff.
5. `README.md`, `CHANGELOG.md` and `.env.example` (and this file if rules changed) match the code.
