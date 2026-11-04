import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OAUTH_COOKIE, clientIp, createRateLimiter, readOAuthCookie } from "@/lib/auth-core";
import { currentUser } from "@/lib/auth";
import { authSettings, getGmail, getStore } from "@/lib/server";
import { syncJobs } from "@/lib/sync";

export const dynamic = "force-dynamic";
// A sync reads up to MAX_EMAILS messages; allow time for Gmail round trips on serverless.
export const maxDuration = 60;
const limiter = createRateLimiter(10, 60_000);
const MAX_EMAILS = 50;
const DAYS = 30;

// Step 2: Google sends the person back with a one-time code. Read the alert emails, store the parsed jobs,
// forget the token. Every failure is one generic outcome on the dashboard; the reason goes to the server log.
export async function GET(request: NextRequest) {
  const settings = authSettings();
  if (!settings.configured) return new NextResponse("Sign-in is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!limiter.take(clientIp(request))) return new NextResponse("Too many attempts. Try again in a minute.", { status: 429 });

  const params = request.nextUrl.searchParams;
  const pending = await readOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value, settings.secret);
  const code = params.get("code");

  if (params.get("error")) return done(settings.appUrl, "denied");
  if (!pending || !code || params.get("state") !== pending.state) {
    console.error("gmail sync refused: bad state or missing code");
    return done(settings.appUrl, "error");
  }

  try {
    const gmail = getGmail();
    const token = await gmail.exchangeCode(code, pending.verifier);
    // The mailbox must be the signed-in person's own (a different Google account is refused).
    if ((await gmail.mailboxEmail(token)) !== user.email.toLowerCase()) {
      console.error("gmail sync refused: mailbox does not match the signed-in user");
      return done(settings.appUrl, "mismatch");
    }
    const emails = await gmail.fetchAlertEmails(token, { max: MAX_EMAILS, days: DAYS });
    const result = await syncJobs(emails, getStore().forUser(user.uid));
    return done(settings.appUrl, "ok", result.added);
  } catch (error) {
    console.error("gmail sync failed:", error instanceof Error ? error.message : "unknown error");
    return done(settings.appUrl, "error");
  }
}

function done(origin: string, outcome: "ok" | "denied" | "mismatch" | "error", added = 0) {
  const query = new URLSearchParams({ sync: outcome, ...(outcome === "ok" ? { added: String(added) } : {}) });
  const response = NextResponse.redirect(new URL(`/dashboard?${query}`, origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/gmail" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
