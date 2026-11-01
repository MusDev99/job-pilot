import assert from "node:assert/strict";
import { test } from "node:test";
import { TENANT_TABLES } from "../lib/schema.ts";
import { createStore } from "../lib/store.ts";
import { createMemorySheets } from "./helpers/memory-sheets.ts";

function setup() {
  const sheets = createMemorySheets();
  let n = 0;
  const store = createStore({
    api: sheets.api,
    newId: () => `row-${++n}`,
    now: () => new Date("2026-11-01T00:00:00.000Z"),
  });
  return { ...sheets, store };
}

test("schema: every tenant table starts with id and userId", () => {
  for (const [table, columns] of Object.entries(TENANT_TABLES)) {
    assert.deepEqual(columns.slice(0, 2), ["id", "userId"], table);
  }
});

test("tenant isolation: a second user sees none of the first user's rows", async () => {
  const { store } = setup();
  const alice = store.forUser("alice");
  const bob = store.forUser("bob");
  const a = await alice.insert("search_profiles", { name: "Backend", keywords: "python" });
  await bob.insert("search_profiles", { name: "Data", keywords: "sql" });

  assert.deepEqual((await alice.list("search_profiles")).map((r) => r.name), ["Backend"]);
  assert.deepEqual((await bob.list("search_profiles")).map((r) => r.name), ["Data"]);
  assert.equal(await bob.get("search_profiles", String(a.id)), null);
});

test("tenant isolation: another user's id cannot be updated or deleted", async () => {
  const { store, state } = setup();
  const alice = store.forUser("alice");
  const bob = store.forUser("bob");
  const a = await alice.insert("search_profiles", { name: "Backend" });
  const before = structuredClone(state.tabs.get("search_profiles"));

  assert.equal(await bob.update("search_profiles", String(a.id), { name: "Hacked" }), null);
  assert.equal(await bob.remove("search_profiles", String(a.id)), false);
  assert.deepEqual(state.tabs.get("search_profiles"), before, "sheet must be untouched");
  assert.equal((await alice.get("search_profiles", String(a.id)))?.name, "Backend");
});

test("insert: store sets id, owner and timestamps; callers cannot", async () => {
  const { store } = setup();
  const alice = store.forUser("alice");
  const row = await alice.insert("search_profiles", { name: "Backend" });
  assert.equal(row.id, "row-1");
  assert.equal(row.userId, "alice");
  assert.equal(row.createdAt, "2026-11-01T00:00:00.000Z");
  await assert.rejects(alice.insert("search_profiles", { userId: "bob", name: "x" }), /set by the store/);
  await assert.rejects(alice.insert("search_profiles", { id: "mine", name: "x" }), /set by the store/);
  await assert.rejects(alice.insert("search_profiles", { nope: "x" }), /Unknown column "nope"/);
});

test("update: patches only the owner's row and keeps the other columns", async () => {
  const { store } = setup();
  const alice = store.forUser("alice");
  const row = await alice.insert("search_profiles", { name: "Backend", keywords: "python" });
  const updated = await alice.update("search_profiles", String(row.id), { keywords: "python, gcp" });
  assert.equal(updated?.name, "Backend");
  assert.equal((await alice.get("search_profiles", String(row.id)))?.keywords, "python, gcp");
});

test("removeAllMine: deletes only this user's rows", async () => {
  const { store } = setup();
  const alice = store.forUser("alice");
  const bob = store.forUser("bob");
  await alice.insert("search_profiles", { name: "a1" });
  await bob.insert("search_profiles", { name: "b1" });
  await alice.insert("search_profiles", { name: "a2" });
  assert.equal(await alice.removeAllMine(), 2);
  assert.equal((await alice.list("search_profiles")).length, 0);
  assert.deepEqual((await bob.list("search_profiles")).map((r) => r.name), ["b1"]);
});

test("formula guard: text is stored guarded and read back unchanged", async () => {
  const { store, state } = setup();
  const alice = store.forUser("alice");
  await alice.insert("search_profiles", { name: "=HYPERLINK(\"http://evil\")" });
  assert.equal(state.tabs.get("search_profiles")?.[1]?.[2], "'=HYPERLINK(\"http://evil\")");
  assert.equal((await alice.list("search_profiles"))[0]?.name, "=HYPERLINK(\"http://evil\")");
});

test("user id: blank or odd ids are rejected", () => {
  const { store } = setup();
  for (const bad of ["", " ", "a b", "x".repeat(65), "a/b"]) assert.throws(() => store.forUser(bad), /valid user id/);
});

test("schema drift: a changed header fails loudly instead of writing misaligned data", async () => {
  const { store, state } = setup();
  const alice = store.forUser("alice");
  await alice.insert("search_profiles", { name: "x" });
  const grid = state.tabs.get("search_profiles");
  if (grid?.[0]) grid[0][2] = "renamed";
  await assert.rejects(alice.list("search_profiles"), /header does not match the schema/);
  await assert.rejects(alice.insert("search_profiles", { name: "y" }), /header does not match the schema/);
});

test("outage: a failing spreadsheet raises and never looks like an empty table", async () => {
  const { store, state } = setup();
  const alice = store.forUser("alice");
  await alice.insert("search_profiles", { name: "x" });
  state.down = true;
  await assert.rejects(alice.list("search_profiles"), /503/);
  state.down = false;
  assert.equal((await alice.list("search_profiles")).length, 1, "data is still there after the outage");
});
