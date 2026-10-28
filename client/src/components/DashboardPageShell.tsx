import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardPageShellStat = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate";
};
type DashboardPageShellProps = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  stats?: DashboardPageShellStat[];
  children: ReactNode;
  className?: string;
};
const toneClasses = {
  cyan: "text-primary",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  violet: "text-primary",
  rose: "text-rose-300",
  slate: "text-muted-foreground",
};
export function DashboardPageShell({
  eyebrow = "Your work",
  title,
  description,
  actions,
  meta,
  stats,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div
      className={cn("workspace-page space-y-6 p-4 sm:p-6 lg:p-7", className)}
    >
      <header className="workspace-page-header">
        <div className="workspace-page-header-grid">
          <div className="min-w-0">
            <p className="workspace-page-kicker">{eyebrow}</p>
            <h1 className="workspace-page-title">{title}</h1>
            <div className="workspace-page-description">{description}</div>
            {meta && <div className="workspace-page-meta">{meta}</div>}
          </div>
          {actions && <div className="workspace-page-actions">{actions}</div>}
        </div>
      </header>
      {stats && stats.length > 0 && (
        <section className="workspace-page-stats" aria-label="Summary">
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="workspace-page-stat">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="workspace-page-stat-label">{stat.label}</p>
                    <div className="workspace-page-stat-value">
                      {stat.value}
                    </div>
                  </div>
                  {Icon && (
                    <Icon
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0",
                        toneClasses[stat.tone ?? "cyan"]
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                {stat.helper && (
                  <div className="workspace-page-stat-helper">
                    {stat.helper}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
      {children}
    </div>
  );
}
