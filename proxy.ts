import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth-core.ts";
import { checkConfig } from "./lib/config.ts";

// Next 16 "proxy" (formerly middleware). Everything except the public paths needs a session (OWASP A01).
const PUBLIC = (path: string) => path === "/" || path === "/login" || path === "/api/health" || path.startsWith("/api/auth/");

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC(pathname)) return NextResponse.next();

  // Fail closed (OWASP A04): an unconfigured production deploy never serves private pages.
  if (!checkConfig(process.env).ok) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Sign-in is not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  } else if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET ?? "")) {
    return NextResponse.next();
  }

  // A server-action call cannot follow a redirect: answer 401.
  if (req.headers.has("next-action")) return new NextResponse("Unauthorized", { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
