import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore } from "../lib/store.ts";
import { createMemorySheets } from "./helpers/memory-sheets.ts";

function setup() {
  const sheets = createMemorySheets();
  let n = 0;
  const store = createStore({ api: sheets.api, newId: () => `u${++n}`, now: () => new Date("2026-11-01T00:00:00.000Z") });
  return { ...sheets, store };
}
const ada = { sub: "sub-ada", email: "Ada@Example.com", name: "Ada" };

test("users: first sign-in creates an active user with a lower-cased email", async () => {
  const { store, state } = setup();
  const result = await store.users.signIn(ada);
  assert.deepEqual(result, { ok: true, user: { id: "u1", email: "ada@example.com" }, created: true });
  assert.equal(state.tabs.get("users")?.length, 2, "header + one row");
});

test("users: signing in again reuses the row, even if the email changed at Google", async () => {
  const { store, state } = setup();
  await store.users.signIn(ada);
  const again = await store.users.signIn({ ...ada, email: "ada.new@example.com" });
  assert.deepEqual(again, { ok: true, user: { id: "u1", email: "ada.new@example.com" }, created: false });
  assert.equal(state.tabs.get("users")?.length, 2, "no duplicate row");
});

test("users: the same email under a different Google account is refused", async () => {
  const { store } = setup();
  await store.users.signIn(ada);
  assert.deepEqual(await store.users.signIn({ ...ada, sub: "someone-else" }), { ok: false, reason: "account_mismatch" });
});

test("users: a deactivated user is refused", async () => {
  const { store, state } = setup();
  await store.users.signIn(ada);
  const row = state.tabs.get("users")?.[1];
  if (row) row[5] = false; // column "active"
  assert.deepEqual(await store.users.signIn(ada), { ok: false, reason: "inactive" });
});

test("users: the sign-up allowlist limits new accounts but never blocks existing ones", async () => {
  const { store } = setup();
  const allowed = { allowedEmails: ["ada@example.com"] };
  assert.deepEqual(await store.users.signIn({ sub: "x", email: "eve@example.com" }, allowed), { ok: false, reason: "not_allowed" });
  assert.equal((await store.users.signIn(ada, allowed)).ok, true);
  assert.equal((await store.users.signIn(ada, { allowedEmails: ["someone@else.com"] })).ok, true, "existing user keeps access");
});

test("users: an outage raises, so it is never mistaken for 'not registered'", async () => {
  const { store, state } = setup();
  state.down = true;
  await assert.rejects(store.users.signIn(ada), /503/);
});
