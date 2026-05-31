import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  tone = "brand",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "brand" | "growth" | "alert" | "neutral";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    growth: "bg-growth-500/10 text-growth-600 border-growth-500/30",
    alert: "bg-alert-500/10 text-alert-600 border-alert-500/30",
    neutral: "bg-ink-900/[.04] text-ink-700 border-ink-900/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
