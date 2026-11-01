import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  OAUTH_COOKIE, SESSION_COOKIE, SESSION_TTL_SECONDS, clientIp, createRateLimiter, createSessionToken, readOAuthCookie,
} from "@/lib/auth-core";
import { googleEndpoints } from "@/lib/oidc";
import { authSettings, getGoogle, getStore } from "@/lib/server";
import { completeSignIn } from "@/lib/sign-in";

export const dynamic = "force-dynamic";
const limiter = createRateLimiter(20, 60_000);

// Step 2: Google sends the person back here. Every refusal looks the same to them (OWASP A07); the reason is logged.
export async function GET(request: NextRequest) {
  const settings = authSettings();
  if (!settings.configured) return new NextResponse("Sign-in is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!limiter.take(clientIp(request))) return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });

  const params = request.nextUrl.searchParams;
  const google = getGoogle();
  let outcome;
  try {
    outcome = await completeSignIn(
      {
        code: params.get("code"),
        state: params.get("state"),
        error: params.get("error"),
        pending: await readOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value, settings.secret),
      },
      {
        clientId: settings.clientId,
        issuers: googleEndpoints.issuers,
        exchangeCode: google.exchangeCode,
        getJwks: google.getJwks,
        signIn: (profile) => getStore().users.signIn(profile, { allowedEmails: settings.allowedEmails }),
      },
    );
  } catch (error) {
    // The data store was unreachable: say "unavailable", never "not registered" (OWASP A04).
    console.error("sign-in: data store unavailable:", error instanceof Error ? error.message : "unknown error");
    return redirectTo(settings.appUrl, "/login?error=unavailable");
  }

  if (!outcome.ok) {
    console.error("sign-in refused:", outcome.reason);
    return redirectTo(settings.appUrl, "/login?error=1");
  }
  const response = redirectTo(settings.appUrl, outcome.next);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(settings.secret, outcome.user), {
    httpOnly: true, sameSite: "lax", secure: settings.secure, path: "/", maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

function redirectTo(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
