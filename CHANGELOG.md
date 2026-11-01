# Changelog

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
