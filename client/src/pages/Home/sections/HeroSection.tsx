import { Link } from "wouter";
import { getSignupUrl } from "@/const";
import { TRUST_BADGES } from "../Home.constants";

export function HeroSection({
  heroRef,
}: {
  heroRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={heroRef}
      aria-labelledby="home-hero-heading"
      className="apex-light-soft"
      style={{
        paddingTop: "7rem",
        paddingBottom: "5rem",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
        <div data-reveal data-reveal-delay="0" className="flex justify-center">
          <span className="chip-light">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#3FAE7E",
                display: "inline-block",
              }}
            />
            Built for the 76M+ US gig &amp; 1099 workforce
          </span>
        </div>

        <h1
          id="home-hero-heading"
          data-reveal
          data-reveal-delay="100"
          className="font-cinzel mt-7 mb-6"
          style={{
            fontSize: "clamp(2.4rem, 5.6vw, 4.6rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "var(--ink)",
          }}
        >
          Know exactly what every
          <br />
          shift <span className="gradient-gold">actually earns</span> you.
        </h1>

        <p
          data-reveal
          data-reveal-delay="200"
          className="font-crimson text-xl mx-auto mb-4 mobile-visibility-copy"
          style={{
            color: "var(--ink-soft)",
            maxWidth: 600,
            lineHeight: 1.7,
          }}
        >
          Track earnings across every app — DoorDash, Uber, Lyft, Instacart,
          Amazon Flex and more — auto-log IRS mileage at the standard rate, and
          never get surprised by quarterly taxes.{" "}
          <em style={{ color: "var(--gold-ink)" }}>
            Intelligence built on your numbers — not generic advice.
          </em>
        </p>

        <p
          data-reveal
          data-reveal-delay="225"
          className="font-crimson text-base mx-auto mb-10"
          style={{
            color: "var(--ink-faint)",
            maxWidth: 560,
            lineHeight: 1.65,
          }}
        >
          Free to start — shift tracker, mileage log, and tax calculators, no
          credit card. Workers track about $3,200 in deductions a year.
        </p>

        <div
          data-reveal
          data-reveal-delay="300"
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href={getSignupUrl()} className="btn-solid-gold">
            Start Free — No Card
          </a>
          <Link href="/tools">
            <span className="btn-line-ink cursor-pointer">
              Try the free calculators
            </span>
          </Link>
        </div>

        <p
          data-reveal
          data-reveal-delay="320"
          className="font-crimson text-sm mt-4 mobile-visibility-copy"
          style={{ color: "var(--ink-faint)" }}
        >
          Free plan, no credit card · Join{" "}
          <span style={{ color: "var(--gold-ink)", fontWeight: 600 }}>
            2,400+ gig workers
          </span>{" "}
          already on UnifyOne.
        </p>

        <div
          data-reveal
          data-reveal-delay="340"
          className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
        >
          <span
            className="font-cinzel text-[0.62rem] uppercase tracking-[0.24em]"
            style={{ color: "var(--ink-faint)" }}
          >
            Works with
          </span>
          {TRUST_BADGES.map(badge => (
            <span
              key={badge}
              className="font-cinzel text-[0.72rem] tracking-[0.16em] uppercase sm:text-xs mobile-visibility-brand"
              style={{ color: "var(--ink-soft)", fontWeight: 600 }}
            >
              {badge}
            </span>
          ))}
        </div>

        <p
          data-reveal
          data-reveal-delay="360"
          className="font-crimson text-sm mt-7 mobile-visibility-subtle"
          style={{ color: "var(--ink-faint)" }}
        >
          Prefer the full picture first? See{" "}
          <Link href="/the-system">
            <span
              className="cursor-pointer underline"
              style={{ color: "var(--gold-ink)" }}
            >
              how the whole system works
            </span>
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
