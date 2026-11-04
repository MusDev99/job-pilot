// Shapes stored job rows for the dashboard. Pure. Stored cells are untrusted text: links must be http(s) only.
import type { Row } from "./cells.ts";

export interface JobView {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null; // null when the stored link is not http(s): it is shown as text, not a link
  source: string;
  skills: string[];
  salary: string | null;
  seniority: string | null;
  receivedAt: string;
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export const safeHttpUrl = (v: unknown): string | null => {
  const raw = text(v);
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};

/** Newest first; rows without a title are dropped. */
export function toJobViews(rows: Row[]): JobView[] {
  return rows
    .flatMap((r): JobView[] => {
      const title = text(r.title);
      if (!title) return [];
      return [{
        id: String(r.id), title, company: text(r.company), location: text(r.location), url: safeHttpUrl(r.url),
        source: text(r.source) ?? "Email", skills: (text(r.skills) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        salary: text(r.salary), seniority: text(r.seniority), receivedAt: text(r.receivedAt) ?? "",
      }];
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export type SyncOutcome = { tone: "success" | "error"; message: string } | null;

/** The banner after a sync, from the redirect's query. Unknown values show nothing. */
export function syncBanner(sync: string | undefined, added: string | undefined): SyncOutcome {
  switch (sync) {
    case "ok": {
      const n = Number(added);
      return { tone: "success", message: n > 0 ? `Synced: ${n} new ${n === 1 ? "job" : "jobs"} added.` : "Synced: no new jobs since last time." };
    }
    case "denied": return { tone: "error", message: "Gmail access was not granted, so nothing was synced." };
    case "mismatch": return { tone: "error", message: "That Gmail account is not the one you signed in with. Choose the same account." };
    case "error": return { tone: "error", message: "We couldn't sync your Gmail right now. Please try again." };
    default: return null;
  }
}
