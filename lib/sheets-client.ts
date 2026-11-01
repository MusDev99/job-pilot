// Real `SheetsApi` over the Google Sheets REST API with a service account (server-only).
// Fixed hosts only (OWASP A10): tab names come from `lib/schema.ts`, the spreadsheet id from env, nothing from a request.
// Signing uses node:crypto's RS256, the standard service-account flow; no other crypto is hand-rolled.
import { createSign } from "node:crypto";
import type { Cell } from "./cells.ts";
import type { SheetsApi } from "./sheets-api.ts";

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const MAX_RETRIES = 4;

export interface SheetsClientConfig {
  spreadsheetId: string;
  clientEmail: string;
  /** A clean PEM, see `normalizePrivateKey`. */
  privateKey: string;
}

export interface SheetsClientDeps {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

export function createSheetsClient(config: SheetsClientConfig, deps: SheetsClientDeps = {}): SheetsApi {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let token: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > now() + 60_000) return token.value;
    const iat = Math.floor(now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
      JSON.stringify({ iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }),
    )}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
    const res = await doFetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${b64url(signature)}`,
      }),
    });
    if (!res.ok) throw new Error(`Spreadsheet sign-in failed (${res.status})`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: json.access_token, expiresAt: now() + json.expires_in * 1000 };
    return token.value;
  }

  // Retries rate limits (429) and 5xx with backoff. The error carries status + Google's short message, never a token.
  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const method = init.method ?? "GET";
    for (let attempt = 0; ; attempt++) {
      const res = await doFetch(`${API}/${config.spreadsheetId}${path}`, {
        method,
        cache: "no-store",
        headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      let detail = "";
      try {
        detail = String(((await res.json()) as { error?: { message?: string } }).error?.message ?? "").slice(0, 200);
      } catch {
        /* no JSON body */
      }
      throw new Error(`Spreadsheet request failed (${res.status}) ${method} ${path.split("?")[0]}${detail ? `: ${detail}` : ""}`);
    }
  }

  type Meta = { sheets?: { properties: { sheetId: number; title: string } }[] };
  const meta = () => request<Meta>("?fields=sheets.properties(sheetId,title)");
  const range = (tab: string, cell?: string) => encodeURIComponent(cell ? `${tab}!${cell}` : tab);

  return {
    async getValues(tab) {
      const { values = [] } = await request<{ values?: Cell[][] }>(`/values/${range(tab)}?valueRenderOption=UNFORMATTED_VALUE`);
      return values;
    },
    async ensureTab(tab, headers) {
      if ((await meta()).sheets?.some((s) => s.properties.title === tab)) return;
      await request("/:batchUpdate", { method: "POST", body: { requests: [{ addSheet: { properties: { title: tab } } }] } });
      await request(`/values/${range(tab, "A1")}?valueInputOption=RAW`, { method: "PUT", body: { values: [[...headers]] } });
    },
    async appendRow(tab, row) {
      await request(`/values/${range(tab)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        body: { values: [row] },
      });
    },
    async updateRow(tab, rowNumber, row) {
      await request(`/values/${range(tab, `A${rowNumber}`)}?valueInputOption=RAW`, { method: "PUT", body: { values: [row] } });
    },
    async deleteRows(tab, rowNumbers) {
      if (rowNumbers.length === 0) return;
      const sheetId = (await meta()).sheets?.find((s) => s.properties.title === tab)?.properties.sheetId;
      if (sheetId === undefined) throw new Error(`Tab "${tab}" not found`);
      // Highest row first so earlier deletions don't shift later ones.
      const requests = [...rowNumbers]
        .sort((a, b) => b - a)
        .map((n) => ({ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: n - 1, endIndex: n } } }));
      await request("/:batchUpdate", { method: "POST", body: { requests } });
    },
  };
}
