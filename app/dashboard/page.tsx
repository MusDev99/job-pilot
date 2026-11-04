import { Icon } from "@/components/icons";
import { Button, ButtonAnchor } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth";
import { syncBanner, toJobViews } from "@/lib/job-view";
import type { JobView } from "@/lib/job-view";
import { getStore } from "@/lib/server";

export const dynamic = "force-dynamic";
const SHOWN = 100; // Miller: newest 100 is plenty for an MVP list; filters and paging come later

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ sync?: string; added?: string }> }) {
  const user = await requirePageSession();
  const { sync, added } = await searchParams;
  const banner = syncBanner(sync, added);

  let jobs: JobView[] = [];
  let failed = false;
  try {
    jobs = toJobViews(await getStore().forUser(user.uid).list("jobs"));
  } catch (error) {
    console.error("dashboard: could not load jobs:", error instanceof Error ? error.message : "unknown error");
    failed = true;
  }

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
          <p className="text-sm text-muted" aria-live="polite">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            {jobs.length > SHOWN ? `, showing the newest ${SHOWN}` : ""}
          </p>
          <ul className="flex flex-col gap-3">
            {jobs.slice(0, SHOWN).map((job) => (
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
        </>
      )}
    </main>
  );
}
