import { Icon } from "@/components/icons";
import type { JobView } from "@/lib/job-view";
import { receivedAgo } from "@/lib/job-view";

const MAX_SKILLS = 6;

// Von Restorff: the salary and the "New" badge are the only coloured facts on a card. Fitts: the whole title row and the
// Open button are 44px targets. External links never leak the opener.
export function JobCard({ job, now, index }: { job: JobView; now: Date; index: number }) {
  const when = job.receivedAt ? receivedAgo(job.receivedAt, now) : "";
  const isNew = when === "today";
  return (
    <li
      className="lp-rise group flex flex-col gap-4 rounded-box border border-border bg-surface/80 p-5 transition-colors hover:border-primary/60"
      style={{ "--d": `${Math.min(index, 8) * 0.05}s` } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div className="avatar avatar-placeholder">
          <div className="w-11 rounded-box bg-primary/15 text-primary">
            <span className="text-lg font-semibold" aria-hidden="true">{(job.company ?? job.title).charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">{job.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Icon name="building" className="size-4" />{job.company ?? "Company not stated"}</span>
            {job.location && <span className="inline-flex items-center gap-1"><Icon name="pin" className="size-4" />{job.location}</span>}
          </p>
        </div>
        {isNew && <span className="badge badge-soft badge-success">New</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="badge badge-soft badge-primary text-text">{job.source}</span>
        {job.seniority && <span className="badge badge-outline">{job.seniority}</span>}
        {job.salary ? (
          <span className="badge badge-soft badge-success gap-1"><Icon name="coin" className="size-3.5" />{job.salary}</span>
        ) : (
          <span className="text-muted">Salary not stated</span>
        )}
      </div>

      {job.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {job.skills.slice(0, MAX_SKILLS).map((skill) => (
            <li key={skill} className="rounded-full bg-base-300/60 px-2.5 py-1 text-xs">{skill}</li>
          ))}
          {job.skills.length > MAX_SKILLS && <li className="px-1 py-1 text-xs text-muted">+{job.skills.length - MAX_SKILLS}</li>}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Icon name="clock" className="size-4" />
          {when ? `Received ${when}` : "Date unknown"}
        </span>
        {job.url ? (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-primary min-h-11 gap-2 text-text">
            Open posting
            <Icon name="external" className="size-4" />
            <span className="sr-only"> for {job.title} (opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-xs text-muted">No link in the email</span>
        )}
      </div>
    </li>
  );
}
