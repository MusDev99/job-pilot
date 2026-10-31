// Pure configuration checks. Pass the environment in (never read process.env here) so this stays unit-testable.

export type Env = Readonly<Record<string, string | undefined>>;

/** Variables without which sign-in must not run. Production fails closed (503) when any is missing. */
export const AUTH_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET"] as const;

/** Variables the data store needs. */
export const STORE_KEYS = [
  "SHEETS_SPREADSHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
] as const;

/** Minimum AUTH_SECRET length in characters (about 32 random bytes, base64). */
export const MIN_SECRET_LENGTH = 32;

/** Names of the keys that are missing or blank. Returns names only, never values. */
export function missingKeys(env: Env, keys: readonly string[]): string[] {
  return keys.filter((key) => (env[key] ?? "").trim() === "");
}

export type ConfigStatus = { ok: true } | { ok: false; problems: string[] };

/** Checks everything the app needs to serve signed-in users. Problems name the variable, never its value. */
export function checkConfig(env: Env): ConfigStatus {
  const problems = missingKeys(env, [...AUTH_KEYS, ...STORE_KEYS]).map((key) => `${key} is not set`);
  const secret = (env.AUTH_SECRET ?? "").trim();
  if (secret !== "" && secret.length < MIN_SECRET_LENGTH) {
    problems.push(`AUTH_SECRET is ${secret.length} characters; needs at least ${MIN_SECRET_LENGTH}`);
  }
  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}
