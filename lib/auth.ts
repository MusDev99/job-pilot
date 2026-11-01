// Session helpers for server components and server actions. Every server action starts with `await requireSession()`.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth-core.ts";
import type { SessionUser } from "./auth-core.ts";
import { authSettings } from "./server.ts";

/** The signed-in person, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const { secret, configured } = authSettings();
  if (!configured) return null;
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, secret);
}

/** For server actions and route handlers: throws instead of redirecting (the client sees a failed call). */
export async function requireSession(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** For pages: sends signed-out visitors to /login. */
export async function requirePageSession(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
