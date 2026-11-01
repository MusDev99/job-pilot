import type { Cell } from "../../lib/cells.ts";
import type { SheetsApi } from "../../lib/sheets-api.ts";

/** In-memory spreadsheet for tests. `state.down = true` simulates an outage; `state.tabs` is the raw grid. */
export function createMemorySheets() {
  const state = { tabs: new Map<string, Cell[][]>(), down: false };
  const guard = () => {
    if (state.down) throw new Error("Spreadsheet request failed (503)");
  };
  const tab = (name: string): Cell[][] => {
    const grid = state.tabs.get(name);
    if (!grid) throw new Error(`Tab "${name}" not found`);
    return grid;
  };
  const api: SheetsApi = {
    async getValues(name) {
      guard();
      return structuredClone(tab(name));
    },
    async ensureTab(name, headers) {
      guard();
      if (!state.tabs.has(name)) state.tabs.set(name, [[...headers]]);
    },
    async appendRow(name, row) {
      guard();
      tab(name).push([...row]);
    },
    async updateRow(name, rowNumber, row) {
      guard();
      tab(name)[rowNumber - 1] = [...row];
    },
    async deleteRows(name, rowNumbers) {
      guard();
      const grid = tab(name);
      for (const n of [...rowNumbers].sort((a, b) => b - a)) grid.splice(n - 1, 1);
    },
  };
  return { api, state };
}
