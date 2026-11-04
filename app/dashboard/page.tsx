import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requirePageSession } from "@/lib/auth";
import { filterJobs, jobStats, parseFilters, syncBanner, toJobViews } from "@/lib/job-view";
import type { JobView, SyncOutcome } from "@/lib/job-view";
import { getStore } from "@/lib/server";

export const dynamic = "force-dynamic";

type Query = { sync?: string; added?: string; q?: string; source?: string; salary?: string; deleted?: string };

function deleteBanner(deleted: string | undefined): SyncOutcome {
  if (deleted === "no") return { tone: "error", message: "Nothing was deleted. Type DELETE exactly to confirm." };
  if (deleted === "error") return { tone: "error", message: "We couldn't delete your data right now. Please try again." };
  return null;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requirePageSession();
  const query = await searchParams;
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

  return (
    <DashboardView
      email={user.email}
      jobs={jobs}
      shown={filterJobs(jobs, filters)}
      stats={jobStats(jobs, now)}
      filters={filters}
      banner={deleteBanner(query.deleted) ?? syncBanner(query.sync, query.added)}
      failed={failed}
      now={now}
    />
  );
}
