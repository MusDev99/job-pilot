Status: ready

# Data layer: tenant-scoped Google Sheets store (Week 1, slice 1)

Written by the lead in the Product Owner role; approved by the CTO when this PR is merged. Slice 2 (Google sign-in) follows in its own PR.

**Problem:** every JobPilot user shares one spreadsheet, so a single missing filter would show one person's resume data to another. Who it is for: every signed-in user, indirectly; the developer, directly.

**User story:** As a signed-in user, I want my rows to be invisible and untouchable to everyone else, so that I can trust JobPilot with my job search.

| ID | Given | When | Then |
|---|---|---|---|
| AC1 | Two users each have rows in a tenant tab | Either lists, gets, updates or deletes | They only ever see and change their own rows |
| AC2 | User B knows the id of a row owned by user A | B tries to update or delete it | Nothing changes and the call reports "not found" |
| AC3 | A caller passes `id`, `userId` or an unknown column to `insert` or `update` | The call runs | It is rejected; the store sets `id`, owner and timestamps itself |
| AC4 | Text starting with `=`, `+`, `-` or `@` is saved | It is written and read back | It is stored guarded (apostrophe prefix) and returns unchanged |
| AC5 | The spreadsheet is unavailable or a header was edited by hand | Any call runs | It fails loudly; it never looks like an empty table and never writes misaligned data |
| AC6 | A user asks to delete their data | `removeAllMine` runs | Only that user's rows are removed |

**Laws of UX:** none apply yet (no screen). Peak-End and Tesler (system generates ids and dates) shape the later screens.

**Out of scope:** sign-in (slice 2), the `users` tab, Gmail, any UI, caching and quota batching (revisit at about 100 active users).

**Open question for the CTO:** none. Real Google credentials are only needed from slice 2 on.
