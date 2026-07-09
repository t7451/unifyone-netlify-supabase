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

const toneClasses: Record<
  NonNullable<DashboardPageShellStat["tone"]>,
  string
> = {
  cyan: "border-[#D4A843]/25 bg-[#D4A843]/10 text-[#E8C25A]",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  slate: "border-slate-400/20 bg-slate-400/10 text-slate-200",
};

export function DashboardPageShell({
  eyebrow = "Operations",
  title,
  description,
  actions,
  meta,
  stats,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn("space-y-6 p-4 sm:p-6", className)}>
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#020202] p-5 shadow-2xl shadow-[#020202]/20 sm:p-6 lg:p-7">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,67,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(106,27,154,0.18),transparent_38%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#E8C25A]/50 to-transparent"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4A843]/20 bg-[#D4A843]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8C25A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4A843] shadow-[0_0_14px_rgba(212,168,67,0.9)]" />
              {eyebrow}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <div className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {description}
            </div>
            {meta ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {meta}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        {stats && stats.length > 0 ? (
          <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        {stat.label}
                      </p>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {stat.value}
                      </div>
                    </div>
                    {Icon ? (
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          toneClasses[stat.tone ?? "cyan"]
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                  {stat.helper ? (
                    <div className="mt-3 text-sm text-slate-400">
                      {stat.helper}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  );
}
