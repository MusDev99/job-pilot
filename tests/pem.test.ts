import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { normalizePrivateKey } from "../lib/pem.ts";

const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

test("pem: accepts newlines, literal \\n, quotes and the whole credentials JSON", () => {
  const expected = normalizePrivateKey(pem, "test");
  assert.match(expected, /^-----BEGIN PRIVATE KEY-----\n/);
  assert.equal(normalizePrivateKey(pem.replace(/\n/g, "\\n"), "test"), expected);
  assert.equal(normalizePrivateKey(`"${pem.replace(/\n/g, "\\n")}"`, "test"), expected);
  assert.equal(normalizePrivateKey(JSON.stringify({ private_key: pem }), "test"), expected);
});

test("pem: rejects garbage and never echoes it", () => {
  const secret = "super-secret-garbage-value";
  assert.throws(
    () => normalizePrivateKey(secret, "SHEETS_KEY"),
    (error: Error) => /not valid PEM/.test(error.message) && !error.message.includes(secret) && error.message.includes("SHEETS_KEY"),
  );
});
