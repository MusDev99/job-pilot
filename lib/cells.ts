// Cell values and the spreadsheet formula-injection guard (OWASP A03).
// Pure and dependency-free so `node --test` can run it directly.

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

// A cell that starts with = + - @ (or tab / CR) can run as a formula when someone opens or exports the sheet.
// Leading apostrophes are included so a user's own "'=x" still round-trips unchanged.
const NEEDS_GUARD = /^'*[=+\-@\t\r]/;

/** Prefix risky text with an apostrophe before it is written. Non-text values pass through. */
export function guardCell(value: Cell): Cell {
  return typeof value === "string" && NEEDS_GUARD.test(value) ? `'${value}` : value;
}

/** Inverse of `guardCell`, applied to every cell read back. */
export function unguardCell(value: Cell): Cell {
  return typeof value === "string" && value.startsWith("'") && NEEDS_GUARD.test(value.slice(1)) ? value.slice(1) : value;
}
