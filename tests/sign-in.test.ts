import assert from "node:assert/strict";
import { test } from "node:test";
import { completeSignIn } from "../lib/sign-in.ts";
import type { CallbackDeps, CallbackInput } from "../lib/sign-in.ts";
import { createGoogleClient } from "../lib/google.ts";
import { toBase64Url } from "../lib/auth-core.ts";
import { googleEndpoints } from "../lib/oidc.ts";

const enc = new TextEncoder();
const keys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwks = { keys: [{ ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" }] };
const NOW = 1_800_000_000_000;

async function token(claims: Record<string, unknown>) {
  const unsigned = `${toBase64Url(enc.encode(JSON.stringify({ alg: "RS256", kid: "k1" })))}.${toBase64Url(enc.encode(JSON.stringify(claims)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, enc.encode(unsigned)));
  return `${unsigned}.${toBase64Url(sig)}`;
}
const claims = {
  iss: "https://accounts.google.com", aud: "client-1", exp: NOW / 1000 + 600, nonce: "n1",
  sub: "sub-1", email: "a@example.com", email_verified: true,
};
const pending = { state: "st", nonce: "n1", verifier: "ver", next: "/dashboard" };
const input = (over: Partial<CallbackInput> = {}): CallbackInput => ({ code: "code-1", state: "st", error: null, pending, ...over });

function deps(over: Partial<CallbackDeps> = {}) {
  const calls: string[] = [];
  const d: CallbackDeps = {
    clientId: "client-1",
    issuers: googleEndpoints.issuers,
    nowMs: NOW,
    exchangeCode: async (code, verifier) => {
      calls.push(`exchange:${code}:${verifier}`);
      return token(claims);
    },
    getJwks: async () => jwks,
    signIn: async (profile) => {
      calls.push(`signIn:${profile.email}`);
      return { ok: true, user: { id: "u1", email: profile.email }, created: true };
    },
    ...over,
  };
  return { d, calls };
}

test("sign-in: the happy path exchanges the code with the PKCE verifier and returns the user", async () => {
  const { d, calls } = deps();
  const outcome = await completeSignIn(input(), d);
  assert.deepEqual(outcome, { ok: true, user: { uid: "u1", email: "a@example.com" }, next: "/dashboard" });
  assert.deepEqual(calls, ["exchange:code-1:ver", "signIn:a@example.com"]);
});

test("sign-in: refuses before any network call when state, cookie, code or Google error is wrong", async () => {
  for (const [bad, reason] of [
    [input({ state: "other" }), "state_mismatch"],
    [input({ state: null }), "state_mismatch"],
    [input({ pending: null }), "no_pending_sign_in"],
    [input({ code: null }), "no_code"],
    [input({ error: "access_denied" }), "google_error:access_denied"],
  ] as const) {
    const { d, calls } = deps();
    assert.deepEqual(await completeSignIn(bad, d), { ok: false, reason });
    assert.deepEqual(calls, [], reason);
  }
});

test("sign-in: a bad ID token or an unreachable Google refuses without touching the user table", async () => {
  const wrongNonce = deps({ exchangeCode: async () => token({ ...claims, nonce: "stolen" }) });
  assert.deepEqual(await completeSignIn(input(), wrongNonce.d), { ok: false, reason: "id_token:nonce" });
  const down = deps({ exchangeCode: async () => { throw new Error("boom"); } });
  assert.deepEqual(await completeSignIn(input(), down.d), { ok: false, reason: "google_unreachable" });
  assert.ok(![...wrongNonce.calls, ...down.calls].some((c) => c.startsWith("signIn")));
});

test("sign-in: the user table's refusal is passed on, and a hostile next is neutralised", async () => {
  const refused = deps({ signIn: async () => ({ ok: false, reason: "not_allowed" }) });
  assert.deepEqual(await completeSignIn(input(), refused.d), { ok: false, reason: "not_allowed" });
  const outcome = await completeSignIn(input({ pending: { ...pending, next: "https://evil.example" } }), deps().d);
  assert.ok(outcome.ok && outcome.next === "/dashboard");
});

test("google client: sends the PKCE verifier and secret to the fixed token host; caches the keys", async () => {
  const seen: { url: string; body: string }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), body: String(init?.body ?? "") });
    return String(url).includes("certs") ? Response.json(jwks) : Response.json({ id_token: "tok" });
  }) as typeof fetch;
  const client = createGoogleClient({ clientId: "c", clientSecret: "shh", redirectUri: "https://app/api/auth/callback" }, { fetch: fetchFn, now: () => 0 });
  assert.equal(await client.exchangeCode("code-9", "ver-9"), "tok");
  await client.getJwks();
  await client.getJwks();
  const body = new URLSearchParams(seen[0]?.body);
  assert.equal(seen[0]?.url, "https://oauth2.googleapis.com/token");
  assert.equal(body.get("code_verifier"), "ver-9");
  assert.equal(body.get("redirect_uri"), "https://app/api/auth/callback");
  assert.equal(seen.filter((s) => s.url.includes("certs")).length, 1, "keys cached");
});
