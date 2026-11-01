// The OAuth callback decision, as a pure function: every step that can refuse sign-in lives here so it is unit-tested.
// Network calls and the user lookup are injected; the route handler only wires them up and sets cookies.
import { safeNext } from "./auth-core.ts";
import type { OAuthState, SessionUser } from "./auth-core.ts";
import { verifyIdToken } from "./oidc.ts";
import type { IdClaims, Jwks } from "./oidc.ts";
import type { SignInResult } from "./store.ts";

export interface CallbackInput {
  code: string | null;
  state: string | null;
  /** Google's `error` query parameter (the person pressed Cancel, etc.). */
  error: string | null;
  /** The signed cookie set when sign-in started; null when missing, expired or tampered. */
  pending: OAuthState | null;
}

export interface CallbackDeps {
  clientId: string;
  issuers: string[];
  /** Returns the raw ID token for this code, or throws. */
  exchangeCode(code: string, verifier: string): Promise<string>;
  getJwks(): Promise<Jwks>;
  signIn(profile: { sub: string; email: string; name?: string; picture?: string }): Promise<SignInResult>;
  nowMs?: number;
}

/** `reason` is for the server log only. The person always sees one generic message (OWASP A07). */
export type CallbackOutcome = { ok: true; user: SessionUser; next: string } | { ok: false; reason: string };

export async function completeSignIn(input: CallbackInput, deps: CallbackDeps): Promise<CallbackOutcome> {
  const { pending } = input;
  if (input.error) return { ok: false, reason: `google_error:${input.error.slice(0, 40)}` };
  if (!pending) return { ok: false, reason: "no_pending_sign_in" };
  if (!input.state || input.state !== pending.state) return { ok: false, reason: "state_mismatch" };
  if (!input.code) return { ok: false, reason: "no_code" };

  let claims: IdClaims;
  try {
    const idToken = await deps.exchangeCode(input.code, pending.verifier);
    const verified = await verifyIdToken(idToken, await deps.getJwks(), {
      audience: deps.clientId,
      nonce: pending.nonce,
      issuers: deps.issuers,
      nowMs: deps.nowMs,
    });
    if (!verified.ok) return { ok: false, reason: `id_token:${verified.reason}` };
    claims = verified.claims;
  } catch {
    return { ok: false, reason: "google_unreachable" };
  }

  const result = await deps.signIn({
    sub: claims.sub,
    email: claims.email,
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.picture ? { picture: claims.picture } : {}),
  });
  if (!result.ok) return { ok: false, reason: result.reason };
  return { ok: true, user: { uid: result.user.id, email: result.user.email }, next: safeNext(pending.next) };
}
