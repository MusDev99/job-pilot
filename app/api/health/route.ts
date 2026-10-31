import { checkConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// Used by uptime and post-deploy checks. Fails closed: 503 until configuration is complete.
// Details go to the server log only, never to the response (OWASP A05).
export function GET(): Response {
  const status = checkConfig(process.env);
  if (!status.ok) {
    console.error("health: configuration incomplete:", status.problems.join("; "));
    return Response.json({ status: "unconfigured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
