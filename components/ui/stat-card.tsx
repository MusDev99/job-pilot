import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";

// One number with a label and an icon. Miller + Common Region: each number sits in its own card.
export function StatCard({ icon, label, value, hint }: { icon: IconName; label: string; value: number; hint?: string }) {
  return (
    <div className="stat rounded-box border border-border bg-surface/80 p-4">
      <div className="stat-figure text-primary">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
          <Icon name={icon} />
        </span>
      </div>
      <div className="stat-title text-muted">{label}</div>
      <div className="stat-value text-3xl tabular-nums">{value}</div>
      {hint && <div className="stat-desc text-muted">{hint}</div>}
    </div>
  );
}
