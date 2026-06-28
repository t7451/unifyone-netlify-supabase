import { useEffect, useState } from "react";

export function CountUpMetric({
  value,
  label,
  accent,
  loading = false,
}: {
  value: number;
  label: string;
  accent: string;
  loading?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) {
      setDisplayValue(0);
      return;
    }

    const durationMs = 900;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [loading, value]);

  return (
    <div className="surface-card p-6 text-center">
      <div
        className="font-cinzel text-3xl sm:text-4xl font-black mb-2"
        style={{ color: accent }}
      >
        {loading ? "…" : new Intl.NumberFormat("en-US").format(displayValue)}
      </div>
      <p
        className="font-crimson text-sm uppercase tracking-[0.18em]"
        style={{ color: "var(--ink-faint)" }}
      >
        {label}
      </p>
    </div>
  );
}
