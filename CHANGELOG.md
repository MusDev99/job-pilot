# Changelog

## 2026-11-01

- Week 1 data layer: tenant-scoped Google Sheets store (`lib/store.ts`) with per-user isolation, formula-injection guard, strict header check and fail-loud outages; real Sheets client with service-account auth and retry (`lib/sheets-client.ts`); private-key normaliser (`lib/pem.ts`); feature spec in `docs/features/data-layer/`.

## 2026-10-31

- Week 0 scaffold: Next.js 16 + React 19 + Tailwind 4 + strict TypeScript, Netlify config, security headers/CSP, fail-closed `/api/health`, config checks with tests.
- CI (`verify`: typecheck, tests, build, dependency audit) and `branch-policy` workflows, PR template.
- Agent team: Product Owner, Senior Architect, QA, Security Auditor + `/team` command with two CTO gates; shared code-review skill.
- CLAUDE.md with architecture rules, OWASP Top 10 table and Definition of done; decision record 0001 with the roadmap.
