import assert from "node:assert/strict";
import { test } from "node:test";
import { toBase64Url } from "../lib/auth-core.ts";
import { buildAuthUrl, googleEndpoints, pkceChallenge, verifyIdToken } from "../lib/oidc.ts";
import type { Jwks } from "../lib/oidc.ts";

const enc = new TextEncoder();
const keys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwks: Jwks = { keys: [{ ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" }] };
const NOW = 1_800_000_000_000;
const good = {
  iss: "https://accounts.google.com", aud: "client-1", exp: NOW / 1000 + 600, nonce: "n1",
  sub: "sub-1", email: "a@example.com", email_verified: true, name: "Ada",
};
const expect = { audience: "client-1", nonce: "n1", issuers: googleEndpoints.issuers, nowMs: NOW };

async function idToken(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: "RS256", kid: "k1" }) {
  const unsigned = `${toBase64Url(enc.encode(JSON.stringify(header)))}.${toBase64Url(enc.encode(JSON.stringify(claims)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, enc.encode(unsigned)));
  return `${unsigned}.${toBase64Url(sig)}`;
}

test("id token: a valid token passes and returns the claims", async () => {
  const result = await verifyIdToken(await idToken(good), jwks, expect);
  assert.ok(result.ok && result.claims.email === "a@example.com");
});

test("id token: each check refuses on its own", async () => {
  const cases: [string, Record<string, unknown>][] = [
    ["iss", { ...good, iss: "https://evil.example" }],
    ["aud", { ...good, aud: "someone-else" }],
    ["exp", { ...good, exp: NOW / 1000 - 1 }],
    ["nonce", { ...good, nonce: "other" }],
    ["email_unverified", { ...good, email_verified: false }],
    ["claims", { ...good, sub: undefined }],
  ];
  for (const [reason, claims] of cases) {
    const result = await verifyIdToken(await idToken(claims), jwks, expect);
    assert.deepEqual(result, { ok: false, reason }, reason);
  }
});

test("id token: bad signature, unknown key, wrong algorithm and junk are refused", async () => {
  const token = await idToken(good);
  const tampered = `${token.slice(0, -4)}AAAA`;
  assert.deepEqual(await verifyIdToken(tampered, jwks, expect), { ok: false, reason: "signature" });
  assert.deepEqual(await verifyIdToken(await idToken(good, { alg: "RS256", kid: "nope" }), jwks, expect), { ok: false, reason: "kid" });
  assert.deepEqual(await verifyIdToken(await idToken(good, { alg: "none" }), jwks, expect), { ok: false, reason: "alg" });
  assert.deepEqual(await verifyIdToken("not.a.jwt.at.all", jwks, expect), { ok: false, reason: "malformed" });
});

test("pkce + auth url: S256 challenge, openid scope only, fixed Google host", async () => {
  // RFC 7636 appendix B test vector.
  assert.equal(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  const url = new URL(buildAuthUrl(googleEndpoints, { clientId: "c", redirectUri: "https://app/cb", state: "s", nonce: "n", challenge: "ch" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});
