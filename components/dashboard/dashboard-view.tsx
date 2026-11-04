import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonAnchor } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { JobCard } from "@/components/dashboard/job-card";
import { hasFilters } from "@/lib/job-view";
import type { JobFilters, JobStats, JobView, SyncOutcome } from "@/lib/job-view";

const SHOWN = 100; // Miller: newest 100 is plenty for an MVP list; paging comes later

export interface DashboardProps {
  email: string;
  jobs: JobView[]; // everything the user has
  shown: JobView[]; // after filters
  stats: JobStats;
  filters: JobFilters;
  banner: SyncOutcome;
  failed: boolean;
  now: Date;
}

/** Query string for a filter link, keeping the other filters (the URL is the filter state, so it is shareable). */
function filterHref(f: JobFilters, patch: Partial<JobFilters>): string {
  const next = { ...f, ...patch };
  const q = new URLSearchParams();
  if (next.q) q.set("q", next.q);
  if (next.source) q.set("source", next.source);
  if (next.salaryOnly) q.set("salary", "1");
  const s = q.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}

export function DashboardView({ email, jobs, shown, stats, filters, banner, failed, now }: DashboardProps) {
  return (
    <div className="glow min-h-dvh">
      {/* Jakob: a top bar with the brand left and account actions right, like every app. */}
      <header className="navbar sticky top-0 z-10 border-b border-border bg-base-100/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5">
          <span className="text-lg font-semibold tracking-tight">
            Job<span className="text-primary">Pilot</span>
          </span>
          <div className="flex items-center gap-2">
            <div className="avatar avatar-placeholder" title={email}>
              <div className="w-9 rounded-full bg-primary/15 text-primary">
                <span className="text-sm font-semibold" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <span className="hidden max-w-48 truncate text-sm text-muted sm:inline">{email}</span>
            <form method="post" action="/api/auth/logout">
              <Button type="submit" variant="ghost" className="btn-square" aria-label="Sign out">
                <Icon name="logout" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:py-12">
        {/* Von Restorff: Sync Gmail is the one filled button on the page. */}
        <section className="lp-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your <span className="lp-headline">job feed</span>
            </h1>
            <p className="max-w-lg text-pretty text-muted">
              {jobs.length > 0
                ? `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} pulled from your Gmail job alerts, newest first.`
                : "Job alerts from your Gmail, in one clean list."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <ButtonAnchor href="/api/gmail/start" variant="primary" size="lg" className="w-full gap-2 sm:w-auto">
              <Icon name="refresh" />
              Sync Gmail
            </ButtonAnchor>
            <span className="text-xs text-muted">Reads the last 30 days of alerts. Read-only.</span>
          </div>
        </section>

        {banner && <Alert tone={banner.tone}>{banner.message}</Alert>}

        {failed ? (
          <Alert tone="error">We couldn&apos;t load your jobs right now. Please refresh in a moment.</Alert>
        ) : jobs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard icon="briefcase" label="Jobs" value={stats.total} />
              <StatCard icon="clock" label="Last 7 days" value={stats.lastWeek} />
              <StatCard icon="coin" label="Salary stated" value={stats.withSalary} />
              <StatCard icon="mail" label="Sources" value={stats.sources.length} />
            </section>

            {/* Hick: one search box, one switch, and source chips. A plain GET form works without JavaScript. */}
            <section aria-label="Filters" className="flex flex-col gap-4 rounded-box border border-border bg-surface/80 p-4">
              <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {filters.source && <input type="hidden" name="source" value={filters.source} />}
                <label className="relative flex-1">
                  <span className="sr-only">Search jobs</span>
                  <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
                  <input name="q" defaultValue={filters.q} maxLength={100} placeholder="Search title, company, skill" className="input min-h-11 w-full ps-10" />
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="salary" value="1" defaultChecked={filters.salaryOnly} className="switch switch-primary" />
                  Salary stated
                </label>
                <Button type="submit" variant="soft">Apply</Button>
              </form>
              {stats.sources.length > 1 && (
                <nav aria-label="Filter by source" className="flex flex-wrap gap-2">
                  <ButtonAnchor href={filterHref(filters, { source: "" })} variant={filters.source ? "outline" : "primary"} className="rounded-full">
                    All
                  </ButtonAnchor>
                  {stats.sources.map((src) => (
                    <ButtonAnchor key={src} href={filterHref(filters, { source: src })} variant={filters.source === src ? "primary" : "outline"} className="rounded-full">
                      {src}
                    </ButtonAnchor>
                  ))}
                </nav>
              )}
            </section>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {hasFilters(filters) ? `${shown.length} of ${jobs.length} jobs match` : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
                {shown.length > SHOWN ? `, showing the newest ${SHOWN}` : ""}
              </p>
              {hasFilters(filters) && <ButtonAnchor href="/dashboard" variant="ghost">Clear filters</ButtonAnchor>}
            </div>

            {shown.length === 0 ? (
              <section className="flex flex-col items-center gap-2 rounded-box border border-border bg-surface/80 p-10 text-center">
                <Icon name="search" className="size-8 text-muted" />
                <h2 className="font-medium">No jobs match these filters</h2>
                <p className="text-sm text-muted">Try a different word, or clear the filters.</p>
              </section>
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {shown.slice(0, SHOWN).map((job, i) => <JobCard key={job.id} job={job} now={now} index={i} />)}
              </ul>
            )}
          </>
        )}

        {/* Privacy: one destructive action, behind a native disclosure and a typed word. */}
        <details className="rounded-box border border-border bg-surface/60 p-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-muted">
            <Icon name="trash" className="size-4" />
            Delete my data
          </summary>
          <form method="post" action="/api/account/delete" className="mt-2 flex flex-col gap-3">
            <p className="text-sm text-muted">
              This permanently deletes every job we saved for you and signs you out. Nothing in your Gmail changes. Type <strong className="text-text">DELETE</strong> to confirm.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input name="confirm" required pattern="DELETE" autoComplete="off" aria-label="Type DELETE to confirm" className="input min-h-11 flex-1" />
              <Button type="submit" variant="danger">Delete my data</Button>
            </div>
          </form>
        </details>
      </main>
    </div>
  );
}

// Goal-gradient: show the three steps and which one is next, so the first sync feels close.
function EmptyState() {
  const steps = [
    { title: "Sign in", body: "Done. You're in.", done: true },
    { title: "Sync Gmail", body: "Press the button above. Google asks for read-only access once.", done: false },
    { title: "See your jobs", body: "Role, company, skills and salary, in one list.", done: false },
  ];
  return (
    <section className="lp-rise flex flex-col items-center gap-6 rounded-box border border-border bg-surface/80 p-8 text-center sm:p-12">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon name="mail" className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">Let&apos;s find your first jobs</h2>
        <p className="mx-auto max-w-md text-muted">We only read job alert emails from job sites, and keep just the job details. No email text is stored.</p>
      </div>
      <ol className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 rounded-box border border-border bg-base-100/50 p-4">
            <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-success text-base-100" : i === 1 ? "bg-primary text-primary-content" : "bg-base-300 text-muted"}`}>
              {s.done ? <Icon name="check" className="size-4" /> : i + 1}
            </span>
            <h3 className="font-medium">{s.title}</h3>
            <p className="text-xs text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
