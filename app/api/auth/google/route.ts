import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OAUTH_COOKIE, OAUTH_TTL_SECONDS, clientIp, createOAuthCookie, createRateLimiter, safeNext } from "@/lib/auth-core";
import { buildAuthUrl, googleEndpoints, pkceChallenge, randomToken } from "@/lib/oidc";
import { authSettings } from "@/lib/server";

export const dynamic = "force-dynamic";
const limiter = createRateLimiter(20, 60_000);

// Step 1: send the person to Google with state + nonce + PKCE; remember them in a short-lived signed cookie.
export async function GET(request: NextRequest) {
  const settings = authSettings();
  if (!settings.configured) return new NextResponse("Sign-in is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!limiter.take(clientIp(request))) return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });

  const verifier = randomToken(48);
  const pending = { state: randomToken(), nonce: randomToken(), verifier, next: safeNext(request.nextUrl.searchParams.get("next")) };
  const url = buildAuthUrl(googleEndpoints, {
    clientId: settings.clientId,
    redirectUri: settings.redirectUri,
    state: pending.state,
    nonce: pending.nonce,
    challenge: await pkceChallenge(verifier),
  });
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, await createOAuthCookie(settings.secret, pending), {
    httpOnly: true, sameSite: "lax", secure: settings.secure, path: "/api/auth", maxAge: OAUTH_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
