// Tenant-scoped data access. Every read and write goes through `forUser(userId)`, which filters by the
// signed-in user's id, so a route, server action or job cannot reach another user's rows (OWASP A01).
// Pure: the spreadsheet client, clock and id generator are injected.
import { guardCell, unguardCell } from "./cells.ts";
import type { Cell, Row } from "./cells.ts";
import { TENANT_TABLES } from "./schema.ts";
import type { TenantTable } from "./schema.ts";
import type { SheetsApi } from "./sheets-api.ts";

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;
// Set by the store, never by callers.
const RESERVED = new Set(["id", "userId", "createdAt", "updatedAt"]);

export interface StoreDeps {
  api: SheetsApi;
  newId?: () => string;
  now?: () => Date;
}

export interface TenantStore {
  list(table: TenantTable): Promise<Row[]>;
  get(table: TenantTable, id: string): Promise<Row | null>;
  /** `id`, `userId`, `createdAt` and `updatedAt` are generated; passing them throws. */
  insert(table: TenantTable, fields: Row): Promise<Row>;
  /** Null when the row does not exist or belongs to someone else. */
  update(table: TenantTable, id: string, patch: Row): Promise<Row | null>;
  /** False when the row does not exist or belongs to someone else. */
  remove(table: TenantTable, id: string): Promise<boolean>;
  /** Deletes everything this user owns in every tenant table. Returns the number of rows removed. */
  removeAllMine(): Promise<number>;
}

export function createStore(deps: StoreDeps) {
  const { api } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const ensuring = new Map<TenantTable, Promise<void>>();

  // One creation attempt per tab at a time; a failure is retried on the next call.
  function prepare(table: TenantTable): Promise<void> {
    let pending = ensuring.get(table);
    if (!pending) {
      pending = api.ensureTab(table, TENANT_TABLES[table]);
      ensuring.set(table, pending);
      pending.catch(() => ensuring.delete(table));
    }
    return pending;
  }

  async function load(table: TenantTable): Promise<{ n: number; row: Row }[]> {
    const columns: readonly string[] = TENANT_TABLES[table];
    await prepare(table);
    const [header = [], ...body] = await api.getValues(table);
    if (!columns.every((name, i) => header[i] === name)) {
      throw new Error(`Tab "${table}" header does not match the schema (expected: ${columns.join(", ")})`);
    }
    const entries: { n: number; row: Row }[] = [];
    body.forEach((cells, i) => {
      if (cells.every((c) => c === "" || c == null)) return;
      const row: Row = {};
      columns.forEach((name, c) => {
        const value = cells[c];
        row[name] = value === undefined || value === "" ? null : unguardCell(value);
      });
      entries.push({ n: i + 2, row });
    });
    return entries;
  }

  const toCells = (table: TenantTable, row: Row): Cell[] =>
    TENANT_TABLES[table].map((name) => guardCell(row[name] ?? null));

  function checkFields(table: TenantTable, fields: Row) {
    const columns: readonly string[] = TENANT_TABLES[table];
    for (const key of Object.keys(fields)) {
      if (RESERVED.has(key)) throw new Error(`Column "${key}" is set by the store`);
      if (!columns.includes(key)) throw new Error(`Unknown column "${key}" for tab "${table}"`);
    }
  }

  function forUser(userId: string): TenantStore {
    if (!USER_ID.test(userId)) throw new Error("A valid user id is required");

    const mine = async (table: TenantTable) => (await load(table)).filter((e) => e.row.userId === userId);
    // Match on id AND owner: an id alone is never enough.
    const find = async (table: TenantTable, id: string) => (await mine(table)).find((e) => e.row.id === id);

    return {
      async list(table) {
        return (await mine(table)).map((e) => e.row);
      },
      async get(table, id) {
        return (await find(table, id))?.row ?? null;
      },
      async insert(table, fields) {
        checkFields(table, fields);
        await load(table); // also verifies the header before we append
        const stamp = now().toISOString();
        const row: Row = { ...Object.fromEntries(TENANT_TABLES[table].map((c) => [c, null])), ...fields };
        row.id = newId();
        row.userId = userId;
        if ("createdAt" in row) row.createdAt = stamp;
        if ("updatedAt" in row) row.updatedAt = stamp;
        await api.appendRow(table, toCells(table, row));
        return row;
      },
      async update(table, id, patch) {
        checkFields(table, patch);
        const entry = await find(table, id);
        if (!entry) return null;
        const row: Row = { ...entry.row, ...patch };
        if ("updatedAt" in row) row.updatedAt = now().toISOString();
        await api.updateRow(table, entry.n, toCells(table, row));
        return row;
      },
      async remove(table, id) {
        const entry = await find(table, id);
        if (!entry) return false;
        await api.deleteRows(table, [entry.n]);
        return true;
      },
      async removeAllMine() {
        let removed = 0;
        for (const table of Object.keys(TENANT_TABLES) as TenantTable[]) {
          const rows = await mine(table);
          if (rows.length === 0) continue;
          await api.deleteRows(table, rows.map((e) => e.n));
          removed += rows.length;
        }
        return removed;
      },
    };
  }

  return { forUser };
}

export type Store = ReturnType<typeof createStore>;
