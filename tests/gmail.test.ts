import assert from "node:assert/strict";
import { test } from "node:test";
import { GMAIL_SCOPE, alertQuery, buildGmailAuthUrl, createGmailClient, decodeMessage } from "../lib/gmail.ts";

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const config = { clientId: "cid", clientSecret: "sec", redirectUri: "https://app.example/api/gmail/callback" };

test("auth url: read-only scope, PKCE, state, login hint", () => {
  const url = new URL(buildGmailAuthUrl({ clientId: "cid", redirectUri: config.redirectUri, state: "st", challenge: "ch", loginHint: "a@b.co" }));
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("scope"), GMAIL_SCOPE);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "st");
  assert.equal(url.searchParams.get("login_hint"), "a@b.co");
});

test("query is limited to job-board senders", () => {
  assert.match(alertQuery(30), /^from:\(linkedin\.com OR indeed\.com .* wellfound\.com\) newer_than:30d$/);
});

test("decodeMessage: nested parts, headers, date", () => {
  const email = decodeMessage({
    id: "abc",
    internalDate: "1793692800000",
    payload: {
      mimeType: "multipart/alternative",
      headers: [{ name: "From", value: "Jobs <jobs@linkedin.com>" }, { name: "Subject", value: "3 new jobs" }],
      parts: [
        { mimeType: "text/plain", body: { data: b64("plain body") } },
        { mimeType: "multipart/related", parts: [{ mimeType: "text/html", body: { data: b64("<p>héllo</p>") } }] },
      ],
    },
  });
  assert.deepEqual([email.messageId, email.from, email.subject, email.text, email.html], ["abc", "Jobs <jobs@linkedin.com>", "3 new jobs", "plain body", "<p>héllo</p>"]);
  assert.equal(email.receivedAt, new Date(1793692800000).toISOString());
});

function fakeFetch(routes: Record<string, unknown | number>) {
  const calls: { url: string; auth: string | null }[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, auth: new Headers(init?.headers).get("authorization") });
    const key = Object.keys(routes).find((k) => url.includes(k));
    const value = key ? routes[key] : 404;
    return typeof value === "number" ? new Response("{}", { status: value }) : Response.json(value);
  }) as typeof fetch;
  return { fn, calls };
}

test("exchangeCode: needs gmail.readonly to be granted", async () => {
  const ok = createGmailClient(config, { fetch: fakeFetch({ "oauth2.googleapis.com/token": { access_token: "tok", scope: `openid ${GMAIL_SCOPE}` } }).fn });
  assert.equal(await ok.exchangeCode("c", "v"), "tok");
  const noScope = createGmailClient(config, { fetch: fakeFetch({ "oauth2.googleapis.com/token": { access_token: "tok", scope: "openid" } }).fn });
  await assert.rejects(noScope.exchangeCode("c", "v"), /not granted/);
  const bad = createGmailClient(config, { fetch: fakeFetch({ "oauth2.googleapis.com/token": 400 }).fn });
  await assert.rejects(bad.exchangeCode("c", "v"), /Token exchange failed \(400\)/);
});

test("fetchAlertEmails: lists, fetches each message with the bearer token, ignores odd ids", async () => {
  const { fn, calls } = fakeFetch({
    "/messages?": { messages: [{ id: "m1" }, { id: "../evil" }, { id: "m2" }] },
    "/messages/m1": { id: "m1", payload: { mimeType: "text/plain", body: { data: b64("one") } } },
    "/messages/m2": { id: "m2", payload: { mimeType: "text/plain", body: { data: b64("two") } } },
  });
  const emails = await createGmailClient(config, { fetch: fn }).fetchAlertEmails("tok", { max: 50, days: 30 });
  assert.deepEqual(emails.map((e) => e.text), ["one", "two"]);
  assert.ok(calls.every((c) => c.url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/") && c.auth === "Bearer tok"));
  assert.equal(calls.length, 3);
});

test("mailboxEmail and outages", async () => {
  const gmail = createGmailClient(config, { fetch: fakeFetch({ "/profile": { emailAddress: "Me@Example.com" } }).fn });
  assert.equal(await gmail.mailboxEmail("tok"), "me@example.com");
  const down = createGmailClient(config, { fetch: fakeFetch({ "/profile": 503 }).fn });
  await assert.rejects(down.mailboxEmail("tok"), /Gmail request failed \(503\)/);
});
