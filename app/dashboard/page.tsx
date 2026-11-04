import { Icon } from "@/components/icons";
import { Button, ButtonAnchor } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth";
import { filterJobs, hasFilters, jobStats, parseFilters, receivedAgo, syncBanner, toJobViews } from "@/lib/job-view";
import type { JobView } from "@/lib/job-view";
import { getStore } from "@/lib/server";

export const dynamic = "force-dynamic";
const SHOWN = 100; // Miller: newest 100 is plenty for an MVP list; filters and paging come later

type Query = { sync?: string; added?: string; q?: string; source?: string; salary?: string; deleted?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requirePageSession();
  const query = await searchParams;
  const banner = deleteBanner(query.deleted) ?? syncBanner(query.sync, query.added);
  const filters = parseFilters(query);
  const now = new Date();

  let jobs: JobView[] = [];
  let failed = false;
  try {
    jobs = toJobViews(await getStore().forUser(user.uid).list("jobs"));
  } catch (error) {
    console.error("dashboard: could not load jobs:", error instanceof Error ? error.message : "unknown error");
    failed = true;
  }

  const stats = jobStats(jobs, now);
  const shown = filterJobs(jobs, filters);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your jobs</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Von Restorff: Sync is the one filled button. Jakob: Sign out is a quiet, familiar corner action. */}
          <ButtonAnchor href="/api/gmail/start" variant="primary">
            Sync Gmail
          </ButtonAnchor>
          <form method="post" action="/api/auth/logout">
            <Button type="submit">Sign out</Button>
          </form>
        </div>
      </header>

      {banner && (
        <p
          role={banner.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-box border p-3 text-sm ${banner.tone === "error" ? "border-danger bg-danger/10" : "border-border bg-surface"}`}
        >
          <Icon name={banner.tone === "error" ? "alert" : "shield"} className={`size-5 shrink-0 ${banner.tone === "error" ? "text-danger" : "text-primary"}`} />
          {banner.message}
        </p>
      )}

      {failed ? (
        <p role="alert" className="rounded-box border border-danger bg-danger/10 p-4 text-sm">
          We couldn't load your jobs right now. Please refresh in a moment.
        </p>
      ) : jobs.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-box border border-border bg-surface p-8 text-center">
          <Icon name="mail" className="size-8 text-primary" />
          <h2 className="text-lg font-medium">No jobs yet</h2>
          <p className="max-w-sm text-sm text-muted">
            Press <strong>Sync Gmail</strong> to read the job alert emails from the last 30 days. We only read alerts from job sites and keep just the job details.
          </p>
        </section>
      ) : (
        <>
          {/* Miller: three numbers, each in its own card (Common Region). */}
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Jobs", stats.total],
              ["Last 7 days", stats.lastWeek],
              ["Salary stated", stats.withSalary],
            ].map(([label, value]) => (
              <div key={label} className="rounded-box border border-border bg-surface p-3 sm:p-4">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Hick: three filters only. A plain GET form, so it works without JavaScript and the URL is shareable. */}
          <form method="get" className="flex flex-col gap-3 rounded-box border border-border bg-surface p-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
              Search
              <input name="q" defaultValue={filters.q} maxLength={100} placeholder="Title, company, skill" className="input min-h-11 w-full text-sm text-text" />
            </label>
            {stats.sources.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-muted">
                Source
                <select name="source" defaultValue={filters.source} className="select min-h-11 text-sm text-text">
                  <option value="">All sources</option>
                  {stats.sources.map((src) => <option key={src} value={src}>{src}</option>)}
                </select>
              </label>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="salary" value="1" defaultChecked={filters.salaryOnly} className="checkbox checkbox-primary" />
              Salary stated
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="soft">Apply</Button>
              {hasFilters(filters) && <ButtonAnchor href="/dashboard">Clear</ButtonAnchor>}
            </div>
          </form>

          <p className="text-sm text-muted" aria-live="polite">
            {hasFilters(filters) ? `${shown.length} of ${jobs.length} jobs match` : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
            {shown.length > SHOWN ? `, showing the newest ${SHOWN}` : ""}
          </p>
          {shown.length === 0 ? (
            <section className="rounded-box border border-border bg-surface p-6 text-center">
              <h2 className="font-medium">No jobs match these filters</h2>
              <p className="mt-1 text-sm text-muted">Try a different word, or clear the filters.</p>
            </section>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.slice(0, SHOWN).map((job) => (
                <li key={job.id} className="rounded-box border border-border bg-surface p-4">
                  <div className="flex flex-col gap-1">
                    {job.url ? (
                      // Fitts: the whole title is a large link target. External links never leak the opener.
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-lg font-medium text-primary underline-offset-4 hover:underline">
                        {job.title}
                      </a>
                    ) : (
                      <span className="text-lg font-medium">{job.title}</span>
                    )}
                    <p className="text-sm text-muted">{[job.company, job.location].filter(Boolean).join(" · ") || "Company and location not stated"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {/* Never rely on colour alone: every badge carries text. */}
                    <span className="badge badge-soft badge-primary">{job.source}</span>
                    {job.seniority && <span className="rounded-full border border-border px-2.5 py-0.5 text-text">{job.seniority}</span>}
                    <span className="text-muted">{job.salary ?? "Salary not stated"}</span>
                    {job.receivedAt && <span className="ml-auto text-muted">{receivedAgo(job.receivedAt, now)}</span>}
                  </div>
                  {job.skills.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
                      {job.skills.slice(0, 8).map((skill) => (
                        <li key={skill} className="rounded-full border border-border px-2.5 py-1 text-xs text-text">{skill}</li>
                      ))}
                      {job.skills.length > 8 && <li className="text-xs text-muted">+{job.skills.length - 8} more</li>}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Privacy: users can delete everything we hold about their jobs. A native disclosure plus a typed word guards the one destructive action. */}
      <details className="rounded-box border border-border bg-surface p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Delete my data</summary>
        <form method="post" action="/api/account/delete" className="mt-2 flex flex-col gap-3">
          <p className="text-sm text-muted">
            This permanently deletes every job we saved for you and signs you out. Nothing in your Gmail changes. Type <strong>DELETE</strong> to confirm.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input name="confirm" required pattern="DELETE" autoComplete="off" aria-label="Type DELETE to confirm" className="input min-h-11 flex-1 text-sm text-text" />
            <Button type="submit" className="btn-error">Delete my data</Button>
          </div>
        </form>
      </details>
    </main>
  );
}

function deleteBanner(deleted: string | undefined) {
  if (deleted === "no") return { tone: "error", message: "Nothing was deleted. Type DELETE exactly to confirm." } as const;
  if (deleted === "error") return { tone: "error", message: "We couldn't delete your data right now. Please try again." } as const;
  return null;
}
