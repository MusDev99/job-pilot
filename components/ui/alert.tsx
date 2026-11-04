import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

// Status messages. Never colour alone: every alert has an icon and text. Errors use role="alert", the rest role="status".
type Tone = "success" | "error" | "info";
const TONE: Record<Tone, { cls: string; icon: "check" | "alert" | "shield" }> = {
  success: { cls: "alert-success", icon: "check" },
  error: { cls: "alert-error", icon: "alert" },
  info: { cls: "alert-info", icon: "shield" },
};

export function Alert({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`alert alert-soft ${t.cls} flex items-start gap-3`}>
      <Icon name={t.icon} className="size-5 shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}
