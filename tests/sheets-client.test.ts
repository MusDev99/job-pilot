import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createSheetsClient } from "../lib/sheets-client.ts";

const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const config = { spreadsheetId: "sheet-1", clientEmail: "svc@example.iam.gserviceaccount.com", privateKey };

type Call = { url: string; method: string; body: string };

function fakeFetch(responses: (Response | ((call: Call) => Response))[]) {
  const calls: Call[] = [];
  const queue = [...responses];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), method: init?.method ?? "GET", body: String(init?.body ?? "") };
    calls.push(call);
    if (call.url.startsWith("https://oauth2.googleapis.com/")) return Response.json({ access_token: "tok-123", expires_in: 3600 });
    const next = queue.shift();
    assert.ok(next, `unexpected request ${call.method} ${call.url}`);
    return typeof next === "function" ? next(call) : next;
  }) as typeof fetch;
  return {
    fn,
    calls,
    get api() {
      return calls.filter((c) => c.url.startsWith("https://sheets.googleapis.com/"));
    },
  };
}

test("sheets client: reads with one cached token and only talks to Google hosts", async () => {
  const f = fakeFetch([Response.json({ values: [["id"], ["1"]] }), Response.json({ values: [["id"]] })]);
  const client = createSheetsClient(config, { fetch: f.fn, now: () => 0 });
  assert.deepEqual(await client.getValues("search_profiles"), [["id"], ["1"]]);
  await client.getValues("search_profiles");
  assert.equal(f.calls.filter((c) => c.url.includes("oauth2.googleapis.com")).length, 1, "token is cached");
  for (const call of f.calls) assert.match(call.url, /^https:\/\/(sheets|oauth2)\.googleapis\.com\//);
  assert.match(f.calls[1]?.url ?? "", /\/sheet-1\/values\/search_profiles\?valueRenderOption=UNFORMATTED_VALUE$/);
});

test("sheets client: appends with RAW input so nothing is reinterpreted", async () => {
  const f = fakeFetch([Response.json({})]);
  await createSheetsClient(config, { fetch: f.fn, now: () => 0 }).appendRow("search_profiles", ["a", "'=x"]);
  const call = f.api[0];
  assert.match(call?.url ?? "", /:append\?valueInputOption=RAW&insertDataOption=INSERT_ROWS$/);
  assert.deepEqual(JSON.parse(call?.body ?? ""), { values: [["a", "'=x"]] });
});

test("sheets client: deletes the highest row first in one batch", async () => {
  const meta = Response.json({ sheets: [{ properties: { sheetId: 7, title: "search_profiles" } }] });
  const f = fakeFetch([meta, Response.json({})]);
  await createSheetsClient(config, { fetch: f.fn, now: () => 0 }).deleteRows("search_profiles", [3, 9, 5]);
  const { requests } = JSON.parse(f.api[1]?.body ?? "") as { requests: { deleteDimension: { range: { startIndex: number; sheetId: number } } }[] };
  assert.deepEqual(requests.map((r) => r.deleteDimension.range.startIndex), [8, 4, 2]);
  assert.equal(requests[0]?.deleteDimension.range.sheetId, 7);
});

test("sheets client: ensureTab leaves an existing tab alone and creates a missing one with its header", async () => {
  const present = fakeFetch([Response.json({ sheets: [{ properties: { sheetId: 1, title: "search_profiles" } }] })]);
  await createSheetsClient(config, { fetch: present.fn, now: () => 0 }).ensureTab("search_profiles", ["id", "userId"]);
  assert.equal(present.api.length, 1, "only the metadata read");

  const missing = fakeFetch([Response.json({ sheets: [] }), Response.json({}), Response.json({})]);
  await createSheetsClient(config, { fetch: missing.fn, now: () => 0 }).ensureTab("search_profiles", ["id", "userId"]);
  assert.match(missing.api[1]?.url ?? "", /:batchUpdate$/);
  assert.deepEqual(JSON.parse(missing.api[2]?.body ?? ""), { values: [["id", "userId"]] });
});

test("sheets client: retries a 429 with backoff, then gives up with a message that has no token", async () => {
  const waits: number[] = [];
  const retried = fakeFetch([new Response("{}", { status: 429 }), Response.json({ values: [] })]);
  const ok = createSheetsClient(config, { fetch: retried.fn, now: () => 0, sleep: async (ms) => void waits.push(ms) });
  assert.deepEqual(await ok.getValues("t"), []);
  assert.deepEqual(waits, [500]);

  const failing = fakeFetch([Response.json({ error: { message: "Quota exceeded" } }, { status: 403 })]);
  const bad = createSheetsClient(config, { fetch: failing.fn, now: () => 0 });
  await assert.rejects(bad.getValues("t"), (error: Error) => /\(403\).*Quota exceeded/.test(error.message) && !error.message.includes("tok-123"));
});
