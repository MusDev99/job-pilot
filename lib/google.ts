// Network calls to Google's OAuth endpoints. Fixed hosts only (OWASP A10); fetch is injected for tests.
import { googleEndpoints } from "./oidc.ts";
import type { Jwks } from "./oidc.ts";

export interface GoogleDeps {
  fetch?: typeof fetch;
  now?: () => number;
}

export function createGoogleClient(
  config: { clientId: string; clientSecret: string; redirectUri: string },
  deps: GoogleDeps = {},
) {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  let jwks: { value: Jwks; expiresAt: number } | null = null;

  return {
    /** Exchanges the authorization code (with the PKCE verifier) and returns the raw ID token. */
    async exchangeCode(code: string, verifier: string): Promise<string> {
      const res = await doFetch(googleEndpoints.token, {
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
      const { id_token } = (await res.json()) as { id_token?: string };
      if (!id_token) throw new Error("Token response has no id_token");
      return id_token;
    },
    /** Google's signing keys, cached for an hour. */
    async getJwks(): Promise<Jwks> {
      if (jwks && jwks.expiresAt > now()) return jwks.value;
      const res = await doFetch(googleEndpoints.jwks);
      if (!res.ok) throw new Error(`Key fetch failed (${res.status})`);
      jwks = { value: (await res.json()) as Jwks, expiresAt: now() + 3_600_000 };
      return jwks.value;
    },
  };
}
