// Read-only Gmail access for the "Sync Gmail" button. Fixed Google hosts only (OWASP A10); fetch is injected for tests.
// No token is stored: the access token lives in memory for one sync, then it is gone (OWASP A02).
import type { AlertEmail } from "./alert-parse.ts";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Job-board sender domains the search is limited to (CLAUDE.md: queries limited to job alert senders).
export const ALERT_SENDER_DOMAINS = [
  "linkedin.com", "indeed.com", "jobstreet.com", "jobsdb.com", "seek.com", "glassdoor.com", "wellfound.com",
  "hiredly.com", "maukerja.my", "jora.com", "kalibrr.com", "monster.com", "ziprecruiter.com",
  "weworkremotely.com", "remoteok.com", "michaelpage.com", "hays.com",
] as const;

export const alertQuery = (days: number) => `from:(${ALERT_SENDER_DOMAINS.join(" OR ")}) newer_than:${Math.max(1, Math.floor(days))}d`;

export function buildGmailAuthUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string; loginHint: string }): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    state: p.state,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    login_hint: p.loginHint,
    include_granted_scopes: "false",
  });
  return `${AUTH_URL}?${q}`;
}

interface Part {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
}
interface RawMessage {
  id: string;
  internalDate?: string;
  payload?: Part & { headers?: { name: string; value: string }[] };
}

const fromBase64Url = (data: string) => Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function collect(part: Part | undefined, mime: string, out: string[]) {
  if (!part) return;
  if (part.mimeType === mime && part.body?.data) out.push(fromBase64Url(part.body.data));
  part.parts?.forEach((p) => collect(p, mime, out));
}

/** One Gmail API message to the shape the parser takes. */
export function decodeMessage(raw: RawMessage): AlertEmail {
  const header = (name: string) => raw.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
  const html: string[] = [];
  const text: string[] = [];
  collect(raw.payload, "text/html", html);
  collect(raw.payload, "text/plain", text);
  const ms = Number(raw.internalDate);
  return {
    messageId: raw.id,
    from: header("from"),
    subject: header("subject"),
    html: html.join("\n"),
    text: text.join("\n"),
    receivedAt: new Date(Number.isFinite(ms) && ms > 0 ? ms : 0).toISOString(),
  };
}

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function createGmailClient(config: GmailConfig, deps: { fetch?: typeof fetch } = {}) {
  const doFetch = deps.fetch ?? fetch;

  async function api<T>(path: string, token: string): Promise<T> {
    const res = await doFetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Gmail request failed (${res.status})`);
    return (await res.json()) as T;
  }

  return {
    /** Exchanges the code for an access token and checks that read access was actually granted. */
    async exchangeCode(code: string, verifier: string): Promise<string> {
      const res = await doFetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          code_verifier: verifier,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
        }),
      });
      if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
      const body = (await res.json()) as { access_token?: string; scope?: string };
      if (!body.access_token) throw new Error("Token response has no access_token");
      if (!(body.scope ?? "").split(" ").includes(GMAIL_SCOPE)) throw new Error("Gmail read access was not granted");
      return body.access_token;
    },
    /** The mailbox's own address, to make sure it belongs to the signed-in person. */
    async mailboxEmail(token: string): Promise<string> {
      const { emailAddress } = await api<{ emailAddress?: string }>("/profile", token);
      if (!emailAddress) throw new Error("Gmail profile has no address");
      return emailAddress.toLowerCase();
    },
    /** Newest job-alert emails first, at most `max`. Fetches in small parallel batches. */
    async fetchAlertEmails(token: string, opts: { max: number; days: number }): Promise<AlertEmail[]> {
      const list = await api<{ messages?: { id: string }[] }>(
        `/messages?${new URLSearchParams({ q: alertQuery(opts.days), maxResults: String(opts.max) })}`,
        token,
      );
      const ids = (list.messages ?? []).map((m) => m.id).filter((id) => /^[A-Za-z0-9]+$/.test(id));
      const emails: AlertEmail[] = [];
      for (let i = 0; i < ids.length; i += 8) {
        const batch = await Promise.all(ids.slice(i, i + 8).map((id) => api<RawMessage>(`/messages/${id}?format=full`, token)));
        emails.push(...batch.map(decodeMessage));
      }
      return emails;
    },
  };
}
