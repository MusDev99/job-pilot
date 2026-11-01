// Server-side wiring: reads the environment once and builds the store, Google client and auth settings.
// Everything else stays pure; this file is the only one that touches process.env for them.
import "server-only";
import { checkConfig, normalizeAppUrl, parseAllowlist } from "./config.ts";
import { createGoogleClient } from "./google.ts";
import { normalizePrivateKey } from "./pem.ts";
import { createSheetsClient } from "./sheets-client.ts";
import { createStore } from "./store.ts";
import type { Store } from "./store.ts";

export function authSettings() {
  const env = process.env;
  const appUrl = normalizeAppUrl(env.APP_URL);
  return {
    configured: checkConfig(env).ok,
    secret: env.AUTH_SECRET ?? "",
    clientId: env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    appUrl,
    redirectUri: `${appUrl}/api/auth/callback`,
    allowedEmails: parseAllowlist(env.SIGNUP_ALLOWLIST),
    secure: appUrl.startsWith("https://"),
  };
}

let store: Store | undefined;
let google: ReturnType<typeof createGoogleClient> | undefined;

export function getStore(): Store {
  if (!store) {
    const env = process.env;
    store = createStore({
      api: createSheetsClient({
        spreadsheetId: env.SHEETS_SPREADSHEET_ID ?? "",
        clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
        privateKey: normalizePrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"),
      }),
    });
  }
  return store;
}

export function getGoogle() {
  const s = authSettings();
  google ??= createGoogleClient({ clientId: s.clientId, clientSecret: s.clientSecret, redirectUri: s.redirectUri });
  return google;
}
