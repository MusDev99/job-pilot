Status: ready

# Google sign-in and route guard (Week 1, slice 2)

Written by the lead in the Product Owner role. Depends on the data layer (`docs/features/data-layer/`).

**Problem:** JobPilot is multi-user, so every page and action must know who is asking. Who it is for: a job seeker who wants one-click sign-in with the Google account they already use.

**User story:** As a job seeker, I want to sign in with Google, so that I get my own private job list without making another password.

| ID | Given | When | Then |
|---|---|---|---|
| AC1 | A signed-out visitor | Opens `/dashboard` (or any private page) | Is sent to `/login`, and after signing in lands back where they were |
| AC2 | A new person signs in with Google | Google confirms their verified email | A user row is created and a 24-hour session starts |
| AC3 | Anything goes wrong (cancelled at Google, tampered state, bad token, deactivated or non-allowlisted user) | They return to the app | They see one generic message; the real reason is only in the server log |
| AC4 | The data store is down | Someone signs in | They see "temporarily unavailable", never "not registered" |
| AC5 | Production is missing sign-in configuration | Any private page or sign-in route is requested | The server answers 503 and serves nothing private |
| AC6 | A signed-in user | Presses Sign out | The session cookie is cleared; the same action from another site is refused |
| AC7 | A cookie is copied, edited or expired | It is sent back | It is rejected; an OAuth cookie can never act as a session |

**Laws of UX:** Von Restorff (one filled button per screen), Fitts (44px+ full-width button on phones), Jakob (the familiar "Continue with Google"), Peak-End (clear signed-out and signed-in end states), Postel (emails trimmed and lower-cased).

**Out of scope:** Gmail access (Week 2, a separate consent), roles, server-side session revocation before the 24-hour expiry, a hard rate limit (the in-memory throttle is per instance), concurrent first sign-ins creating a duplicate user row (rare; revisit with the store's real limits).

**Open question for the CTO:** none. Set `SIGNUP_ALLOWLIST` while the Google app is in Testing mode.
