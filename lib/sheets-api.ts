import type { Cell } from "./cells.ts";

/**
 * The only door to the spreadsheet. `lib/store.ts` is the only caller; the real client is `lib/sheets-client.ts`,
 * tests use an in-memory copy. Row numbers are 1-based sheet rows (row 1 = header).
 */
export interface SheetsApi {
  /** Every row of a tab including the header. Throws on any failure: an outage is never "no rows". */
  getValues(tab: string): Promise<Cell[][]>;
  /** Creates the tab with a header row when it does not exist yet; never touches an existing tab. */
  ensureTab(tab: string, headers: readonly string[]): Promise<void>;
  appendRow(tab: string, row: Cell[]): Promise<void>;
  updateRow(tab: string, rowNumber: number, row: Cell[]): Promise<void>;
  deleteRows(tab: string, rowNumbers: number[]): Promise<void>;
}
