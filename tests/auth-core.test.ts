import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createOAuthCookie, createRateLimiter, createSessionToken, isSameOrigin, readOAuthCookie, safeNext, verifySessionToken,
} from "../lib/auth-core.ts";

const secret = "s".repeat(40);
const user = { uid: "u1", email: "a@example.com" };
const T0 = 1_800_000_000_000;

test("session: a signed token verifies and carries the user", async () => {
  assert.deepEqual(await verifySessionToken(await createSessionToken(secret, user, T0), secret, T0 + 1000), user);
});

test("session: expired, tampered, wrong-secret and missing tokens are refused", async () => {
  const token = await createSessionToken(secret, user, T0);
  assert.equal(await verifySessionToken(token, secret, T0 + 25 * 3600 * 1000), null, "expired");
  const [payload = "", sig = ""] = token.split(".");
  const forged = btoa(JSON.stringify({ uid: "admin", email: "x@y.z", typ: "s", exp: 9_999_999_999 })).replace(/=+$/, "");
  assert.equal(await verifySessionToken(`${forged}.${sig}`, secret, T0), null, "payload swapped");
  assert.equal(await verifySessionToken(`${payload}.${sig.slice(0, -2)}AA`, secret, T0), null, "signature changed");
  assert.equal(await verifySessionToken(token, "other".repeat(10), T0), null, "wrong secret");
  for (const bad of [undefined, "", "abc", "a.b.c"]) assert.equal(await verifySessionToken(bad, secret, T0), null);
});

test("session: an OAuth cookie can never be replayed as a session", async () => {
  const oauth = await createOAuthCookie(secret, { state: "s", nonce: "n", verifier: "v", next: "/" }, T0);
  assert.equal(await verifySessionToken(oauth, secret, T0), null);
  const session = await createSessionToken(secret, user, T0);
  assert.equal(await readOAuthCookie(session, secret, T0), null);
  assert.deepEqual(await readOAuthCookie(oauth, secret, T0), { state: "s", nonce: "n", verifier: "v", next: "/" });
  assert.equal(await readOAuthCookie(oauth, secret, T0 + 11 * 60 * 1000), null, "OAuth cookie lives 10 minutes");
});

test("safeNext: only same-site relative paths", () => {
  assert.equal(safeNext("/dashboard?x=1"), "/dashboard?x=1");
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/a\r\nSet-Cookie: x", "", null, undefined]) {
    assert.equal(safeNext(bad), "/dashboard", String(bad));
  }
});

test("isSameOrigin: allows this site and rejects others and missing headers", () => {
  const req = (headers: Record<string, string>) => new Request("https://app.example/api/auth/logout", { method: "POST", headers });
  assert.equal(isSameOrigin(req({ "sec-fetch-site": "same-origin" })), true);
  assert.equal(isSameOrigin(req({ "sec-fetch-site": "cross-site" })), false);
  assert.equal(isSameOrigin(req({ origin: "https://app.example" })), true);
  assert.equal(isSameOrigin(req({ origin: "https://evil.example" })), false);
  assert.equal(isSameOrigin(req({})), false);
});

test("rate limiter: allows the limit, then refuses until the window passes", () => {
  const limiter = createRateLimiter(2, 1000);
  assert.deepEqual([limiter.take("ip", 0), limiter.take("ip", 1), limiter.take("ip", 2)], [true, true, false]);
  assert.equal(limiter.take("other", 2), true);
  assert.equal(limiter.take("ip", 1001), true);
});
