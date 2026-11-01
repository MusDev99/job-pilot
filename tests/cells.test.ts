import assert from "node:assert/strict";
import { test } from "node:test";
import { guardCell, unguardCell } from "../lib/cells.ts";

test("cells: formula-looking text is prefixed, other values pass through", () => {
  for (const risky of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", "\rx"]) {
    assert.equal(guardCell(risky), `'${risky}`);
  }
  for (const safe of ["hello", "a=b", "", 42, true, null]) assert.equal(guardCell(safe), safe);
});

test("cells: guard then unguard returns the original, including a user's own leading apostrophe", () => {
  for (const value of ["=HYPERLINK(\"x\")", "'=x", "''-1", "'hello", "plain", "-5"]) {
    assert.equal(unguardCell(guardCell(value)), value, value);
  }
});
