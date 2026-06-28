import { Link } from "wouter";
import { getSignupUrl } from "@/const";
import BuildProcessAnimation from "@/components/BuildProcessAnimation";
import {
  HOME_FAQ,
  HOW_IT_WORKS,
  PILLARS,
  TESTIMONIALS,
  WHO_IT_FOR,
} from "../Home.constants";

// ── WHY UNIFYONE (DIFFERENTIATORS) ───────────────────────────────────────────
export function WhyUnifyOneSection() {
  return (
    <section
      className="parchment-alt-bg"
      style={{
        padding: "5rem 0",
        borderTop: "1px solid var(--parchment-line)",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-12">
          <span className="inscription-ink">Why UnifyOne</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-3"
            style={{ color: "var(--ink)" }}
          >
            What no other platform does.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              tag: "Only",
              headline: "Auto-tracks IRS mileage at the standard rate",
              body: "Every logged shift captures mileage automatically. A real-time, year-to-date write-off figure — no spreadsheets, no shoebox of receipts.",
              accent: "#6EE7B7",
            },
            {
              tag: "Every app",
              headline: "All your gig earnings in one place",
              body: "DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork and more — see your true take-home across every platform side by side.",
              accent: "#93C5FD",
            },
            {
              tag: "Ahead",
              headline: "Never get blindsided by quarterly taxes",
              body: "Quarterly estimated-tax alerts and Form 1040-ES figures, built on your real after-expense income — so you set money aside all year and April is calm.",
              accent: "#F0D080",
            },
          ].map((d, i) => (
            <div
              key={d.headline}
              data-reveal
              data-reveal-delay={String(i * 90)}
              className="diff-card p-7"
            >
              <span
                className="font-cinzel text-[0.6rem] uppercase tracking-[0.22em] inline-block mb-4 px-2 py-1 rounded-full"
                style={{
                  color: "#2a1c04",
                  backgroundColor: `${d.accent}33`,
                  border: `1px solid ${d.accent}`,
                }}
              >
                {d.tag}
              </span>
              <h3
                className="font-cinzel text-base font-bold mb-3"
                style={{ color: "var(--ink)", lineHeight: 1.4 }}
              >
                {d.headline}
              </h3>
              <p
                className="font-crimson text-base"
                style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}
              >
                {d.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── WHAT YOU GET ─────────────────────────────────────────────────────────────
export function WhatYouGetSection() {
  return (
    <section
      className="parchment-bg"
      style={{
        borderBottom: "1px solid var(--parchment-line)",
        padding: "5rem 0",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-12">
          <span className="inscription-ink">What you get</span>
          <h2
            className="font-cinzel text-2xl sm:text-3xl font-black mt-3"
            style={{ color: "var(--ink)" }}
          >
            Three concrete outcomes from day one.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "⏱",
              headline: "Know your best-paying hours",
              body: "UnifyOne reads your actual shift earnings and shows exactly which hours and zones earn the most after fuel and expenses — so you can stop guessing and start scheduling smarter.",
              accent: "#F0D080",
              audience: "Earn more per hour",
            },
            {
              icon: "🛣",
              headline: "Capture every IRS mileage deduction",
              body: "Start a shift and your miles log automatically at the IRS standard rate. Watch your year-to-date write-off total grow in real time — workers track about $3,200 a year.",
              accent: "#6EE7B7",
              audience: "Keep more at tax time",
            },
            {
              icon: "📅",
              headline: "Stay ahead of quarterly taxes",
              body: "Get quarterly estimated-tax alerts and the Form 1040-ES figures you need, built on your real after-expense income. No more spring surprises.",
              accent: "#93C5FD",
              audience: "No tax-season panic",
            },
          ].map(item => (
            <div key={item.headline} className="surface-card p-7">
              <div className="text-3xl mb-4">{item.icon}</div>
              <p
                className="font-cinzel text-[0.6rem] uppercase tracking-[0.22em] mb-2"
                style={{ color: "var(--gold-ink)" }}
              >
                {item.audience}
              </p>
              <h3
                className="font-cinzel text-base font-bold mb-3"
                style={{ color: "var(--ink)", lineHeight: 1.4 }}
              >
                {item.headline}
              </h3>
              <p
                className="font-crimson text-base"
                style={{ color: "var(--ink-soft)", lineHeight: 1.75 }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── BUILD PROCESS ANIMATION (dark terminal inset) ────────────────────────────
export function BuildProcessSection() {
  return (
    <section
      className="parchment-bg"
      style={{
        padding: "5rem 0",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div
          style={{
            backgroundColor: "#050505",
            border: "1px solid #242424",
            borderRadius: "var(--radius-soft)",
            padding: "2.5rem 1.75rem",
            boxShadow: "0 24px 60px -30px rgba(28,26,22,0.45)",
          }}
        >
          <BuildProcessAnimation />
        </div>
      </div>
    </section>
  );
}

// ── HOW IT WORKS ─────────────────────────────────────────────────────────────
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="parchment-alt-bg"
      style={{
        padding: "6rem 0",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="inscription-ink">How it works</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            Three steps to know your real pay.
          </h2>
          <p
            className="font-crimson text-lg"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Log your shifts, see your true take-home, and stay ahead of taxes —
            all on your own numbers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.step}
              data-reveal
              data-reveal-delay={String(i * 100)}
              className="surface-card relative p-8 sm:p-10 overflow-hidden"
            >
              <div
                className="font-cinzel text-4xl font-black mb-4"
                style={{ color: step.color }}
              >
                {step.step}
              </div>
              <h3
                className="font-cinzel text-lg font-bold mb-3"
                style={{ color: "var(--ink)", letterSpacing: "0.04em" }}
              >
                {step.heading}
              </h3>
              <p
                className="font-crimson text-base"
                style={{ color: "var(--ink-soft)", lineHeight: 1.75 }}
              >
                {step.body}
              </p>
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: `linear-gradient(to right, ${step.color}, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── PLATFORM PILLARS ─────────────────────────────────────────────────────────
export function PlatformPillarsSection({
  pillarsRef,
}: {
  pillarsRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section
      id="platform"
      className="parchment-bg"
      style={{
        padding: "6rem 0",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="inscription-ink">The toolkit</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            Four tools that pay for themselves.
          </h2>
          <p
            className="font-crimson text-lg mobile-visibility-copy"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Earnings, taxes, money, and an AI sidekick — all on your real
            numbers.
          </p>
        </div>

        <div
          ref={pillarsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.name}
              data-reveal
              data-reveal-delay={String(i * 80)}
              className="surface-card p-8"
            >
              <div
                className="flex items-center justify-center mb-5 font-cinzel text-2xl"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "12px",
                  color: pillar.color,
                  backgroundColor: `${pillar.color}1f`,
                  border: `1px solid ${pillar.color}55`,
                }}
              >
                {pillar.glyph}
              </div>
              <div
                className="font-cinzel text-[0.62rem] uppercase tracking-[0.24em] mb-2"
                style={{ color: "var(--gold-ink)" }}
              >
                {pillar.name}
              </div>
              <h3
                className="font-cinzel text-lg font-700 mb-3"
                style={{ color: "var(--ink)" }}
              >
                {pillar.title}
              </h3>
              <p
                className="font-crimson text-base mobile-visibility-copy"
                style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}
              >
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── WHO IT'S FOR ─────────────────────────────────────────────────────────────
export function WhoItsForSection() {
  return (
    <section
      id="who-its-for"
      className="parchment-alt-bg"
      style={{
        padding: "6rem 0",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="inscription-ink">Who UnifyOne is built for</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            Built for workers, not spreadsheets.
          </h2>
          <p
            className="font-crimson text-lg"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            Whether you drive, deliver, or freelance, UnifyOne turns your real
            earnings and mileage into take-home pay and tax-ready numbers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHO_IT_FOR.map((item, i) => (
            <div
              key={item.audience}
              data-reveal
              data-reveal-delay={String(i * 100)}
              className="surface-card p-8"
            >
              <div
                className="flex items-center justify-center mb-5 font-cinzel text-2xl"
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "12px",
                  color: item.color,
                  backgroundColor: `${item.color}1f`,
                  border: `1px solid ${item.color}55`,
                }}
              >
                {item.icon}
              </div>
              <h3
                className="font-cinzel text-base font-bold mb-3"
                style={{
                  color: "var(--ink)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {item.audience}
              </h3>
              <p
                className="font-crimson text-base"
                style={{ color: "var(--ink-soft)", lineHeight: 1.75 }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TESTIMONIALS ─────────────────────────────────────────────────────────────
export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="parchment-bg"
      style={{
        padding: "6rem 0",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="inscription-ink">Worker voices</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            From the workers using it.
          </h2>
          <p
            className="font-crimson text-lg"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Real results from drivers and freelancers who finally know what
            every shift earns — and what they owe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              data-reveal
              data-reveal-delay={String(i * 80)}
              className="surface-card p-8 relative"
            >
              <div
                className="flex gap-1 mb-4"
                role="img"
                aria-label="Rated 5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, s) => (
                  <span
                    key={s}
                    aria-hidden="true"
                    style={{ color: "#E0A92E", fontSize: "0.8rem" }}
                  >
                    ★
                  </span>
                ))}
              </div>

              <p
                className="font-crimson text-base mb-6"
                style={{
                  color: "var(--ink-soft)",
                  fontStyle: "italic",
                  lineHeight: 1.75,
                }}
              >
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center shrink-0 font-cinzel text-xs font-bold rounded-full"
                  style={{
                    backgroundColor: `${t.accent}26`,
                    border: `1px solid ${t.accent}`,
                    color: "#2a1c04",
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <p
                    className="font-cinzel text-xs font-bold"
                    style={{ color: "var(--ink)", letterSpacing: "0.06em" }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="font-crimson text-xs"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── KAI / AI SIDEKICK (dark AI showcase band) ────────────────────────────────
export function KaiSection() {
  return (
    <section
      id="kai"
      className="cathedral-bg"
      style={{
        padding: "6rem 0",
        borderTop: "1px solid rgba(212,168,67,0.25)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inscription" style={{ color: "#D4A843" }}>
              KAI — YOUR AI SIDEKICK
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-6"
              style={{ color: "#F0E8D0" }}
            >
              Answers built on your actual numbers.
            </h2>
            <div
              className="font-crimson text-lg space-y-4"
              style={{ color: "#9A9A9A", lineHeight: 1.7 }}
            >
              <p>
                Kai is your sidekick for tax, route, and scheduling questions.
                It reads your shift earnings and mileage logs — not generic
                benchmarks — to answer in plain language.
              </p>
              <p>
                Ask it anything:{" "}
                <em style={{ color: "#9A9A9A" }}>
                  &ldquo;Which of my shifts this week were most
                  profitable?&rdquo; &ldquo;How much should I set aside for
                  quarterly taxes?&rdquo; &ldquo;Is it worth driving to the
                  airport zone tonight?&rdquo;
                </em>
              </p>
              <p style={{ color: "#C8A24A" }}>
                AI features are included when they ship — and the Free plan
                starts you with 25 AI requests a month.
              </p>
            </div>
            <div className="mt-8">
              <a href={getSignupUrl()} className="btn-ghost-gold">
                Start Free
              </a>
            </div>
          </div>

          {/* Demo panel */}
          <div
            className="stone-card p-6"
            style={{ fontFamily: "'Crimson Pro', serif" }}
          >
            <div
              className="inscription mb-4"
              style={{
                color: "#D4A843",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6EE7B7",
                }}
              />
              KAI · SAMPLE ANSWER
            </div>
            <p
              style={{
                color: "#F0E8D0",
                marginBottom: "1rem",
                fontStyle: "italic",
                fontSize: "0.95rem",
              }}
            >
              "Which of my shifts this week were most profitable after
              expenses?"
            </p>
            <p
              className="mobile-visibility-copy"
              style={{
                color: "#6A6A6A",
                lineHeight: 1.7,
                fontSize: "0.9rem",
              }}
            >
              Your Thursday 5–9pm shifts averaged $31.20/hr after fuel — 42%
              higher than Monday mornings at $21.90/hr. Shifting those 3 Monday
              hours to Thursday evenings adds approximately{" "}
              <span style={{ color: "#F0D080" }}>$120/month</span> to your net.
            </p>
            <div
              className="rule-gold mt-4 pt-4"
              style={{ borderTop: "1px solid #242424" }}
            >
              <p
                className="mobile-visibility-subtle"
                style={{
                  fontSize: "0.75rem",
                  color: "#3A3A3A",
                  fontFamily: "Cinzel, serif",
                  letterSpacing: "0.1em",
                }}
              >
                KAI · BUILT ON YOUR REAL EARNINGS · INCLUDED WHEN IT SHIPS
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
export function FaqSection() {
  return (
    <section
      id="faq"
      className="parchment-bg"
      style={{
        padding: "6rem 0",
        borderTop: "1px solid var(--parchment-line)",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-14">
          <span className="inscription-ink">FAQ</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            Frequently asked questions.
          </h2>
          <p
            className="font-crimson text-lg"
            style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
          >
            Everything gig and 1099 workers ask before they start.
          </p>
        </div>

        <div className="space-y-0">
          {HOME_FAQ.map(item => (
            <div
              key={item.q}
              style={{
                borderTop: "1px solid var(--parchment-line)",
                padding: "1.75rem 0",
              }}
            >
              <h3
                className="font-cinzel text-base font-semibold mb-3"
                style={{
                  color: "var(--ink)",
                  letterSpacing: "0.04em",
                }}
              >
                {item.q}
              </h3>
              <p
                className="font-crimson text-base"
                style={{ color: "var(--ink-soft)", lineHeight: 1.8 }}
              >
                {item.a}
              </p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--parchment-line)" }} />
        </div>

        <div className="text-center mt-12">
          <Link href="/contact">
            <span
              className="font-crimson text-base cursor-pointer underline"
              style={{ color: "var(--gold-ink)" }}
            >
              Have a different question? Contact 1Commerce →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Static reference links — visible to AI crawlers in initial HTML ──────────
export function SeoAside() {
  return (
    <aside aria-label="Gig platforms and tax resources" className="sr-only">
      <p>UnifyOne tracks earnings and taxes for gig and 1099 workers on:</p>
      <ul>
        <li>
          <a
            href="https://www.doordash.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            DoorDash — food delivery
          </a>
        </li>
        <li>
          <a
            href="https://www.uber.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uber & Uber Eats — rideshare and delivery
          </a>
        </li>
        <li>
          <a
            href="https://www.instacart.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instacart — grocery delivery
          </a>
        </li>
        <li>
          <a
            href="https://flex.amazon.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Amazon Flex — package delivery
          </a>
        </li>
        <li>
          <a
            href="https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes"
            target="_blank"
            rel="noopener noreferrer"
          >
            IRS Self-Employment Tax guidance
          </a>
        </li>
      </ul>
    </aside>
  );
}
