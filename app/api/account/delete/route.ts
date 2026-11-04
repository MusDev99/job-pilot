import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isSameOrigin } from "@/lib/auth-core";
import { currentUser } from "@/lib/auth";
import { authSettings, getStore } from "@/lib/server";

export const dynamic = "force-dynamic";
const CONFIRM = "DELETE";

// "Delete my data": removes every row this user owns in every tenant tab, then signs them out.
// POST only, same site only (CSRF), signed-in only, and the person must type DELETE.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { appUrl } = authSettings();
  const base = appUrl || request.url;
  const form = await request.formData().catch(() => null);
  if (form?.get("confirm") !== CONFIRM) return NextResponse.redirect(new URL("/dashboard?deleted=no", base), 303);

  try {
    await getStore().forUser(user.uid).removeAllMine();
  } catch (error) {
    console.error("delete data failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.redirect(new URL("/dashboard?deleted=error", base), 303);
  }
  const response = NextResponse.redirect(new URL("/?deleted=1", base), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
