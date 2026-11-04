// Turns fetched alert emails into stored jobs for one user. Pure apart from the injected store.
// Only parsed fields are stored, never email bodies (CLAUDE.md Gmail rule). Dedupe is by canonical job URL.
import { parseAlert } from "./alert-parse.ts";
import type { AlertEmail } from "./alert-parse.ts";
import type { TenantStore } from "./store.ts";

export interface SyncResult {
  scanned: number; // emails read
  found: number; // jobs found in them
  added: number; // new jobs stored
}

export async function syncJobs(emails: AlertEmail[], store: TenantStore): Promise<SyncResult> {
  const known = new Set((await store.list("jobs")).map((r) => String(r.url)));
  const fresh = new Map<string, ReturnType<typeof parseAlert>[number]>();
  let found = 0;
  // Oldest first so the earliest mention of a job wins when it appears in several emails.
  for (const email of [...emails].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))) {
    for (const job of parseAlert(email)) {
      found += 1;
      if (!known.has(job.url) && !fresh.has(job.url)) fresh.set(job.url, job);
    }
  }
  await store.insertMany(
    "jobs",
    [...fresh.values()].map((j) => ({
      messageId: j.messageId, source: j.source, title: j.title, company: j.company, location: j.location, url: j.url,
      skills: j.skills.join(", ") || null, salary: j.salary, seniority: j.seniority, receivedAt: j.receivedAt,
    })),
  );
  return { scanned: emails.length, found, added: fresh.size };
}
