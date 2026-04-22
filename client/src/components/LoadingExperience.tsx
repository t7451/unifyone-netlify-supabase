import type { CSSProperties, ElementType } from "react";
import { Layers3, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface LoadingStep {
  icon: ElementType;
  label: string;
  detail: string;
}

interface LoadingExperienceProps {
  title?: string;
  description?: string;
  label?: string;
  steps?: LoadingStep[];
  fullScreen?: boolean;
  className?: string;
}

const DEFAULT_STEPS: LoadingStep[] = [
  {
    icon: ShieldCheck,
    label: "Secure session",
    detail: "Verifying access and restoring your workspace context.",
  },
  {
    icon: Layers3,
    label: "Stream modules",
    detail: "Loading only the experience needed for the next screen.",
  },
  {
    icon: Zap,
    label: "Polish the UI",
    detail: "Preparing richer transitions, motion, and responsive feedback.",
  },
];

export default function LoadingExperience({
  title = "Loading your workspace",
  description = "Preparing a faster, lighter UnifyOne experience for your next view.",
  label = "UnifyOne experience upgrade",
  steps = DEFAULT_STEPS,
  fullScreen = false,
  className,
}: LoadingExperienceProps) {
  const loadingTheme = {
    "--loading-bg": "var(--background)",
    "--loading-copy": "var(--foreground)",
    "--loading-muted": "var(--muted-foreground)",
    "--loading-accent": "var(--chart-2)",
    "--loading-accent-soft":
      "color-mix(in oklab, var(--chart-2) 22%, transparent)",
    "--loading-gold": "var(--gold-apex)",
    "--loading-gold-soft":
      "color-mix(in oklab, var(--gold-apex) 16%, transparent)",
    "--loading-violet": "var(--chart-3)",
    "--loading-violet-soft":
      "color-mix(in oklab, var(--chart-3) 18%, transparent)",
    "--loading-surface":
      "color-mix(in oklab, var(--foreground) 6%, transparent)",
    "--loading-surface-strong":
      "color-mix(in oklab, var(--foreground) 8%, transparent)",
  } as CSSProperties;

  return (
    <div
      role="status"
      aria-live="polite"
      style={loadingTheme}
      className={cn(
        "relative isolate overflow-hidden border border-white/10 bg-[var(--loading-bg)] text-[var(--loading-copy)]",
        fullScreen ? "min-h-screen" : "min-h-[22rem] rounded-[2rem]",
        className
      )}
    >
      <div className="loading-grid absolute inset-0 opacity-70" />
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{
          background:
            "radial-gradient(circle at top, color-mix(in oklab, var(--loading-accent) 28%, transparent), transparent 60%)",
        }}
      />
      <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--loading-gold-soft)] blur-3xl" />

      <div
        className={cn(
          "relative mx-auto flex max-w-4xl flex-col items-center justify-center px-6 text-center",
          fullScreen ? "min-h-screen py-16" : "py-10"
        )}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--loading-accent-soft)] bg-[var(--loading-surface)] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--loading-accent)]">
          <span className="h-2 w-2 rounded-full bg-[var(--loading-accent)] animate-pulse" />
          {label}
        </div>

        <div className="relative mt-8 flex h-28 w-28 items-center justify-center">
          <div className="loading-orbit absolute inset-0 rounded-full border border-[color:var(--loading-accent-soft)]" />
          <div
            className="loading-orbit absolute inset-3 rounded-full border border-[color:var(--loading-gold-soft)]"
            style={{ animationDirection: "reverse", animationDuration: "8s" }}
          />

          <span
            className="loading-float absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--loading-accent)]"
            style={{
              animationDelay: "-0.8s",
              boxShadow: "0 0 18px var(--loading-accent-soft)",
            }}
          />
          <span
            className="loading-float absolute bottom-2 left-4 h-2.5 w-2.5 rounded-full bg-[var(--loading-violet)]"
            style={{
              animationDelay: "-1.6s",
              boxShadow: "0 0 18px var(--loading-violet-soft)",
            }}
          />
          <span
            className="loading-float absolute bottom-6 right-2 h-2.5 w-2.5 rounded-full bg-[var(--loading-gold)]"
            style={{
              animationDelay: "-2.4s",
              boxShadow: "0 0 18px var(--loading-gold-soft)",
            }}
          />

          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-[var(--loading-surface-strong)] backdrop-blur-md">
            <Sparkles
              className="h-7 w-7 text-[var(--loading-accent)]"
              style={{
                filter: "drop-shadow(0 0 12px var(--loading-accent-soft))",
              }}
            />
            <Spinner className="absolute -right-1 -top-1 size-5 text-[var(--loading-gold)]" />
          </div>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--loading-copy)] sm:text-4xl">
            {title}
          </h2>
          <p className="text-sm leading-7 text-[var(--loading-muted)] sm:text-base">
            {description}
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.label}
                className="loading-shimmer relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md"
                style={{ animationDelay: `${index * 160}ms` }}
              >
                <div className="relative z-10">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[var(--loading-accent)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--loading-copy)]">
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--loading-muted)]">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
