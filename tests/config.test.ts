import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTH_KEYS, MIN_SECRET_LENGTH, STORE_KEYS, checkConfig, missingKeys } from "../lib/config.ts";

const full = Object.fromEntries([...AUTH_KEYS, ...STORE_KEYS].map((key) => [key, "x".repeat(MIN_SECRET_LENGTH)]));

test("config: complete environment is ok", () => {
  assert.deepEqual(checkConfig(full), { ok: true });
});

test("config: missing and blank keys are reported by name", () => {
  assert.deepEqual(missingKeys({ A: "1", B: "  " }, ["A", "B", "C"]), ["B", "C"]);
  const status = checkConfig({ ...full, GOOGLE_CLIENT_SECRET: "" });
  assert.equal(status.ok, false);
  assert.ok(!status.ok && status.problems.includes("GOOGLE_CLIENT_SECRET is not set"));
});

test("config: a short AUTH_SECRET is rejected without echoing it", () => {
  const status = checkConfig({ ...full, AUTH_SECRET: "hunter2" });
  assert.equal(status.ok, false);
  const text = status.ok ? "" : status.problems.join(" ");
  assert.match(text, /AUTH_SECRET is 7 characters/);
  assert.ok(!text.includes("hunter2"), "secret value must never appear in messages");
});

test("config: empty environment fails closed", () => {
  const status = checkConfig({});
  assert.equal(status.ok, false);
  assert.equal(status.ok ? 0 : status.problems.length, AUTH_KEYS.length + STORE_KEYS.length);
});
