import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isSameOrigin } from "@/lib/auth-core";
import { authSettings } from "@/lib/server";

export const dynamic = "force-dynamic";

// POST only, and only from this site (CSRF): a link or image on another page can't sign anyone out.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const { appUrl } = authSettings();
  const response = NextResponse.redirect(new URL("/login", appUrl || request.url), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
