import { Icon } from "@/components/icons";

// Decorative product preview for the landing page. The jobs are made-up examples (aria-hidden, labelled "Example").
// Motion: rows rise in one by one, the sync ring draws, badges float. Transform/opacity only; off for reduced motion.
const JOBS = [
  { title: "Senior Python Engineer", meta: "Acme · Kuala Lumpur", pay: "RM 12,000 - 15,000", skills: ["Python", "AWS", "Docker"] },
  { title: "Data Engineer", meta: "Globex · Singapore", pay: "Salary not stated", skills: ["SQL", "Airflow", "GCP"] },
  { title: "DevOps Engineer", meta: "Initech · Remote", pay: "SGD 7,000 - 9,000", skills: ["Kubernetes", "Terraform"] },
] as const;

export function LandingPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="lp-rise overflow-hidden rounded-box border border-border bg-surface shadow-2xl" style={{ "--d": "0.1s" } as React.CSSProperties}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-danger" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-success" />
          <span className="ml-2 text-xs text-muted">JobPilot · Your jobs · Example</span>
        </div>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-border" />
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round" pathLength="100" className="lp-ring stroke-accent" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium">Reading job alerts</p>
            <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
              <span className="lp-sweep absolute inset-y-0 w-1/2 rounded-full bg-accent" />
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-2 p-3">
          {JOBS.map((job, i) => (
            <li key={job.title} className="lp-rise rounded-card border border-border bg-bg/60 p-3" style={{ "--d": `${0.5 + i * 0.35}s` } as React.CSSProperties}>
              <p className="text-sm font-medium">{job.title}</p>
              <p className="text-xs text-muted">{job.meta} · {job.pay}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <span key={s} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text">{s}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <span className="lp-float absolute -right-1 -top-4 flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-bg shadow-lg sm:-right-4" style={{ "--d": "0.2s" } as React.CSSProperties}>
        <Icon name="check" className="size-3.5" /> +12 new jobs
      </span>
      <span className="lp-float absolute -bottom-4 right-3 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs shadow-lg sm:-right-2" style={{ "--d": "1.2s" } as React.CSSProperties}>
        <Icon name="cloud" className="size-4 text-success" /> Synced from Gmail
      </span>
    </div>
  );
}
