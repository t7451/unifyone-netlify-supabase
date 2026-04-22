import type { ElementType } from "react";
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
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative isolate overflow-hidden border border-white/10 bg-[#060D1F] text-white",
        fullScreen ? "min-h-screen" : "min-h-[22rem] rounded-[2rem]",
        className
      )}
    >
      <div className="loading-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(0,217,255,0.22),transparent_60%)]" />
      <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#F0D080]/10 blur-3xl" />

      <div
        className={cn(
          "relative mx-auto flex max-w-4xl flex-col items-center justify-center px-6 text-center",
          fullScreen ? "min-h-screen py-16" : "py-10"
        )}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00D9FF]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[#9EEBFF]">
          <span className="h-2 w-2 rounded-full bg-[#00D9FF] animate-pulse" />
          {label}
        </div>

        <div className="relative mt-8 flex h-28 w-28 items-center justify-center">
          <div className="loading-orbit absolute inset-0 rounded-full border border-[#00D9FF]/25" />
          <div
            className="loading-orbit absolute inset-3 rounded-full border border-[#F0D080]/25"
            style={{ animationDirection: "reverse", animationDuration: "8s" }}
          />

          <span
            className="loading-float absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#00D9FF] shadow-[0_0_18px_rgba(0,217,255,0.9)]"
            style={{ animationDelay: "-0.8s" }}
          />
          <span
            className="loading-float absolute bottom-2 left-4 h-2.5 w-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_18px_rgba(139,92,246,0.7)]"
            style={{ animationDelay: "-1.6s" }}
          />
          <span
            className="loading-float absolute bottom-6 right-2 h-2.5 w-2.5 rounded-full bg-[#F0D080] shadow-[0_0_18px_rgba(240,208,128,0.75)]"
            style={{ animationDelay: "-2.4s" }}
          />

          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.08] shadow-[0_0_30px_rgba(0,217,255,0.18)] backdrop-blur-md">
            <Sparkles className="h-7 w-7 text-[#00D9FF]" />
            <Spinner className="absolute -right-1 -top-1 size-5 text-[#F0D080]" />
          </div>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="text-sm leading-7 text-slate-300 sm:text-base">
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
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[#00D9FF]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {step.label}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
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
