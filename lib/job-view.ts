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

export interface JobFilters {
  q: string;
  source: string;
  salaryOnly: boolean;
}

type Param = string | string[] | undefined;
const first = (v: Param): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim().slice(0, 100);

/** Filters from the URL query. Untrusted: trimmed and length-capped; unknown shapes become "no filter". */
export function parseFilters(params: { q?: Param; source?: Param; salary?: Param }): JobFilters {
  return { q: first(params.q), source: first(params.source), salaryOnly: first(params.salary) === "1" };
}

export const hasFilters = (f: JobFilters): boolean => f.q !== "" || f.source !== "" || f.salaryOnly;

/** Case-insensitive match on title, company, location and skills. Keeps the input order. */
export function filterJobs(jobs: JobView[], f: JobFilters): JobView[] {
  const q = f.q.toLowerCase();
  return jobs.filter((j) => {
    if (f.source && j.source !== f.source) return false;
    if (f.salaryOnly && !j.salary) return false;
    if (!q) return true;
    return [j.title, j.company, j.location, ...j.skills].some((part) => part?.toLowerCase().includes(q));
  });
}

export interface JobStats {
  total: number;
  lastWeek: number;
  withSalary: number;
  sources: string[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Summary numbers for the dashboard cards. `now` is passed in so this stays pure. */
export function jobStats(jobs: JobView[], now: Date): JobStats {
  const cutoff = now.getTime() - WEEK_MS;
  return {
    total: jobs.length,
    lastWeek: jobs.filter((j) => Date.parse(j.receivedAt) >= cutoff).length,
    withSalary: jobs.filter((j) => j.salary).length,
    sources: [...new Set(jobs.map((j) => j.source))].sort((a, b) => a.localeCompare(b)),
  };
}

/** "today", "yesterday", "3 days ago", then a plain date. Empty for a missing or invalid date. */
export function receivedAgo(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const days = Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(t).toISOString().slice(0, 10);
}
