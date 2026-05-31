import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  bleed?: boolean;
  tone?: "white" | "muted" | "dark" | "brand";
}

export function Section({
  className,
  bleed,
  tone = "white",
  children,
  ...props
}: SectionProps) {
  const tones: Record<NonNullable<SectionProps["tone"]>, string> = {
    white: "bg-white",
    muted: "bg-gradient-to-b from-brand-50/40 to-white",
    dark: "bg-ink-900 text-white",
    brand: "bg-brand-700 text-white",
  };
  return (
    <section className={cn("section", tones[tone], className)} {...props}>
      <div className={cn(bleed ? "" : "container")}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  center = true,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2
        className={cn(
          "mt-4 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl",
          "[section.bg-ink-900_&]:text-white"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-ink-500">
          {description}
        </p>
      )}
    </div>
  );
}
