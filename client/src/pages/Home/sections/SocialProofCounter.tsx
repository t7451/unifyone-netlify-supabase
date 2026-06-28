import { useEffect, useRef, useState } from "react";
import { SOCIAL_PROOF } from "../Home.constants";
import { formatSocialProofValue } from "../Home.utils";

export function SocialProofCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [counts, setCounts] = useState<number[]>(SOCIAL_PROOF.map(() => 0));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const durationMs = 1200;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts(SOCIAL_PROOF.map(sp => Math.round(sp.numeric * ease)));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [started]);

  // Deeper accent tones so the stat numbers stay legible on the light canvas.
  const lightAccents = ["#9A7B22", "#1F9D6B", "#3B6FB0", "#7C5CD0"];

  return (
    <div ref={ref} className="space-y-8 py-4">
      <div className="text-center">
        <p className="inscription-ink">Trusted by gig workers</p>
        <p
          className="font-crimson text-base sm:text-lg mt-3"
          style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
        >
          Join 2,400+ drivers and freelancers already tracking real earnings on
          UnifyOne.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {SOCIAL_PROOF.map((sp, index) => (
          <div
            key={sp.label}
            className="surface-card px-4 py-6 text-center sm:px-6"
          >
            <div
              className="font-cinzel text-3xl sm:text-4xl font-black"
              style={{ color: lightAccents[index] ?? "#9A7B22" }}
            >
              {formatSocialProofValue(counts[index] ?? 0, sp.format)}
            </div>
            <p
              className="mt-2 font-crimson text-xs uppercase tracking-[0.18em] sm:text-sm"
              style={{ color: "var(--ink-faint)" }}
            >
              {sp.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
