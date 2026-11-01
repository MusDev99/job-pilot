// Hosting dashboards mangle multi-line secrets. Accept the shapes a service-account private key ends up in
// (real newlines, literal "\n", quotes, the whole credentials JSON) and rebuild a clean PEM.
// Errors describe the problem by length and markers only, never the value (OWASP A09).
import { createPrivateKey } from "node:crypto";

export function normalizePrivateKey(raw: string, source: string): string {
  let text = raw.trim().replace(/^["']|["']$/g, "");
  if (text.startsWith("{")) {
    try {
      text = String((JSON.parse(text) as { private_key?: unknown }).private_key ?? "");
    } catch {
      /* fall through to the PEM check */
    }
  }
  text = text.replace(/\\+n/g, "\n"); // base64 never contains a backslash

  const match = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/.exec(text);
  const body = (match?.[2] ?? "").replace(/\s+/g, "");
  const pem = match ? `-----BEGIN ${match[1]}-----\n${(body.match(/.{1,64}/g) ?? []).join("\n")}\n-----END ${match[1]}-----\n` : text;
  try {
    createPrivateKey(pem);
  } catch {
    throw new Error(
      `Private key from ${source} is not valid PEM (${raw.trim().length} characters; BEGIN line ${text.includes("-----BEGIN") ? "found" : "MISSING"}, END line ${text.includes("-----END") ? "found" : "MISSING"}, key body ${body.length} characters). Paste the full "private_key" value.`,
    );
  }
  return pem;
}
