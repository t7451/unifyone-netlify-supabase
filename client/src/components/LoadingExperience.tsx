import type { CSSProperties, ElementType } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/Brand";
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
const theme = {
  background: "var(--brand-background, #141718)",
  color: "var(--brand-ink, #f4f2ed)",
  fontFamily: '"Inter", Arial, sans-serif',
  "--loading-muted": "var(--brand-muted, #b5bab7)",
  "--loading-accent": "var(--brand-accent, #f39450)",
} as CSSProperties;

export default function LoadingExperience({
  title = "Loading your workspace",
  description = "Please wait while this view loads.",
  label = "Please wait",
  steps = [],
  fullScreen = false,
  className,
}: LoadingExperienceProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={theme}
      className={cn(
        "brand-loading flex items-center justify-center border border-white/10",
        fullScreen ? "min-h-screen" : "min-h-[22rem] rounded-xl",
        className
      )}
    >
      <div className="mx-auto w-full max-w-2xl px-6 py-12 text-center">
        <BrandMark size={48} className="mx-auto" />
        <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[var(--loading-muted)]">
          {label}
        </p>
        <h2
          className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: "inherit", color: "inherit" }}
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--loading-muted)]">
          {description}
        </p>
        <Spinner
          aria-hidden="true"
          role="presentation"
          className="mx-auto mt-6 size-5 text-[var(--loading-accent)] motion-reduce:animate-none"
        />
        {steps.length > 0 && (
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {steps.map(step => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className="rounded-lg border border-white/10 p-4"
                >
                  <Icon
                    aria-hidden="true"
                    className="mb-3 h-4 w-4 text-[var(--loading-accent)]"
                  />
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--loading-muted)]">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
