import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OAUTH_COOKIE, OAUTH_TTL_SECONDS, clientIp, createOAuthCookie, createRateLimiter } from "@/lib/auth-core";
import { currentUser } from "@/lib/auth";
import { buildGmailAuthUrl } from "@/lib/gmail";
import { pkceChallenge, randomToken } from "@/lib/oidc";
import { authSettings } from "@/lib/server";

export const dynamic = "force-dynamic";
const limiter = createRateLimiter(10, 60_000);

// Step 1 of "Sync Gmail": ask Google for read-only Gmail access for this one sync (state + PKCE, no stored token).
export async function GET(request: NextRequest) {
  const settings = authSettings();
  if (!settings.configured) return new NextResponse("Sign-in is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!limiter.take(clientIp(request))) return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });

  const verifier = randomToken(48);
  const state = randomToken();
  const url = buildGmailAuthUrl({
    clientId: settings.clientId,
    redirectUri: `${settings.appUrl}/api/gmail/callback`,
    state,
    challenge: await pkceChallenge(verifier),
    loginHint: user.email,
  });
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, await createOAuthCookie(settings.secret, { state, nonce: "-", verifier, next: "/dashboard" }), {
    httpOnly: true, sameSite: "lax", secure: settings.secure, path: "/api/gmail", maxAge: OAUTH_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
