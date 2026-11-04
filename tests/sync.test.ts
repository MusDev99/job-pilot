import assert from "node:assert/strict";
import { test } from "node:test";
import type { AlertEmail } from "../lib/alert-parse.ts";
import { createStore } from "../lib/store.ts";
import { syncJobs } from "../lib/sync.ts";
import { createMemorySheets } from "./helpers/memory-sheets.ts";

const email = (id: string, receivedAt: string, jobs: string): AlertEmail => ({
  messageId: id, from: "jobs@linkedin.com", subject: "alert", text: "", receivedAt, html: jobs,
});
const job = (id: string, title: string) => `<a href="https://www.linkedin.com/jobs/view/${id}">${title}</a><div>Acme · KL</div>`;

function setup() {
  const sheets = createMemorySheets();
  let n = 0;
  const store = createStore({ api: sheets.api, newId: () => `id${++n}`, now: () => new Date("2026-11-04T09:00:00Z") });
  return { sheets, store };
}

test("stores new jobs once, with one spreadsheet write, and skips known ones on the next sync", async () => {
  const { sheets, store } = setup();
  const mine = store.forUser("u1");
  const emails = [
    email("m2", "2026-11-03T00:00:00.000Z", job("4000000002", "Senior Python Engineer") + job("4000000001", "Data Analyst")),
    email("m1", "2026-11-02T00:00:00.000Z", job("4000000001", "Data Analyst")),
  ];
  const first = await syncJobs(emails, mine);
  assert.deepEqual(first, { scanned: 2, found: 3, added: 2 });
  const rows = await mine.list("jobs");
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.url === "https://www.linkedin.com/jobs/view/4000000001")?.messageId, "m1", "earliest mention wins");
  assert.equal(rows.find((r) => r.title === "Senior Python Engineer")?.seniority, "Senior");
  assert.equal(rows.find((r) => r.title === "Senior Python Engineer")?.skills, "Python");
  assert.equal(sheets.state.tabs.get("jobs")?.length, 3);

  const second = await syncJobs(emails, mine);
  assert.deepEqual(second, { scanned: 2, found: 3, added: 0 });
  assert.equal((await mine.list("jobs")).length, 2);
});

test("jobs are private to their owner", async () => {
  const { store } = setup();
  await syncJobs([email("m1", "2026-11-02T00:00:00.000Z", job("4000000001", "Data Analyst"))], store.forUser("u1"));
  assert.equal((await store.forUser("u2").list("jobs")).length, 0);
  const other = await syncJobs([email("m1", "2026-11-02T00:00:00.000Z", job("4000000001", "Data Analyst"))], store.forUser("u2"));
  assert.equal(other.added, 1, "the same job is new for another user");
});

test("no emails or no jobs adds nothing and writes nothing", async () => {
  const { sheets, store } = setup();
  assert.deepEqual(await syncJobs([], store.forUser("u1")), { scanned: 0, found: 0, added: 0 });
  assert.equal(sheets.state.tabs.get("jobs")?.length, 1, "header only");
});

test("an outage raises instead of looking like an empty sync", async () => {
  const { sheets, store } = setup();
  sheets.state.down = true;
  await assert.rejects(syncJobs([email("m1", "2026-11-02T00:00:00.000Z", job("4000000001", "x y z"))], store.forUser("u1")));
});
