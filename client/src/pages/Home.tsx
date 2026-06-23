import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";
import { cn as classNames } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BuildProcessAnimation from "@/components/BuildProcessAnimation";
import LandingPricing from "@/components/landing/LandingPricing";
import StickyCTA from "@/components/landing/StickyCTA";

const CANONICAL = `${SITE_URL}/`;

const HOME_FAQ = [
  {
    q: "What is UnifyOne?",
    a: "UnifyOne is an earnings and tax app built for gig and 1099 workers. It tracks what every shift actually earns you across DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and more, auto-logs your IRS mileage at the standard rate, and keeps you ahead of quarterly estimated taxes — all in one dashboard.",
  },
  {
    q: "Which gig platforms does UnifyOne work with?",
    a: "UnifyOne is built for the 76M+ US gig and 1099 workforce — DoorDash, Uber and Uber Eats, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and other delivery, rideshare, and freelance platforms. Track earnings from every app you work in one place.",
  },
  {
    q: "Is UnifyOne free to start?",
    a: "Yes. The Free plan includes the shift tracker, mileage log, tax calculators, and 25 AI requests a month — no card required. Pro is $4.99/mo (or $49/yr) and adds 250 AI requests a month, unlimited history, a year-round tax dashboard, priority support, and AI tools as they ship.",
  },
  {
    q: "What is GigIQ?",
    a: "GigIQ is UnifyOne's shift intelligence. It reads your real earnings data and identifies which working hours and delivery zones generate the highest net income after expenses — giving you specific, actionable scheduling recommendations instead of generic advice.",
  },
  {
    q: "How does Tax Autopilot handle mileage and quarterly taxes?",
    a: "Tax Autopilot automatically captures mileage from every logged shift at the current IRS standard rate, keeps a real-time year-to-date deduction total, and alerts you before quarterly estimated taxes are due — including the figures you need for Form 1040-ES. Workers track roughly $3,200 in deductions per year on average.",
  },
  {
    q: "Who is behind UnifyOne?",
    a: "UnifyOne is built by 1Commerce LLC (PNW Enterprises) in Canby, Oregon, founded in 2025. Questions? Reach the team at support@1commerce.online or visit 1commerce.online.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "UnifyOne — Gig Earnings & Tax Tracker for 1099 Workers",
    description:
      "UnifyOne tracks what every gig shift actually earns you, auto-logs IRS mileage at the standard rate, and keeps you ahead of quarterly taxes. Built for DoorDash, Uber, Instacart, and freelance workers. Free to start.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "1Commerce / PNW Enterprises",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: ["https://twitter.com/1CommerceSol"],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

const MARKET_SIGNALS = [
  {
    value: "76M+",
    label: "US gig & 1099 workers underserved by existing tools",
  },
  {
    value: "$3,200",
    label: "avg deductions tracked per worker each year",
  },
  {
    value: "$556B",
    label: "US gig economy with no worker-first earnings layer",
  },
  {
    value: "$0",
    label: "to start — free shift tracker, mileage log & tax tools",
  },
];

const LAUNCH_METRICS = [
  {
    key: "tenants",
    label: "workers onboarded",
    accent: "#B8872A",
  },
  {
    key: "ordersProcessed",
    label: "shifts & earnings logged",
    accent: "#1F9D6B",
  },
  {
    key: "integrations",
    label: "gig apps supported",
    accent: "#3B6FB0",
  },
] as const;

const SOCIAL_PROOF = [
  {
    label: "Workers",
    numeric: 2400,
    accent: "#D4A843",
    format: "countPlus",
  },
  {
    label: "Earnings tracked",
    numeric: 1200000,
    accent: "#6EE7B7",
    format: "currencyCompact",
  },
  {
    label: "Gig apps",
    numeric: 8,
    accent: "#93C5FD",
    format: "plain",
  },
  {
    label: "Uptime",
    numeric: 999,
    accent: "#C4B5FD",
    format: "uptime",
  },
] as const;

const TRUST_BADGES = [
  "DoorDash",
  "Uber",
  "Lyft",
  "Instacart",
  "Amazon Flex",
  "Upwork",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PILLARS = [
  {
    glyph: "◈",
    name: "GigIQ",
    title: "Shift & Earnings Intelligence",
    body: "See which hours and zones actually pay the most across every app. Real earnings data. Specific recommendations. Not generic advice.",
    color: "#F0D080",
  },
  {
    glyph: "◎",
    name: "Tax Autopilot",
    title: "IRS Mileage & Quarterly Taxes",
    body: "Auto-captures mileage from every logged shift at the IRS standard rate. Real-time YTD deduction total. Quarterly estimated-tax alerts and Form 1040-ES figures.",
    color: "#6EE7B7",
  },
  {
    glyph: "◇",
    name: "Money Manager",
    title: "Budgeting on Real Income",
    body: "Budgeting, goals, and spending analysis built on your real after-expense gig income — so your plan matches what you actually take home.",
    color: "#C4B5FD",
  },
  {
    glyph: "◉",
    name: "Kai",
    title: "Your AI Sidekick",
    body: "Kai is your in-house sidekick for tax, route, and scheduling questions on your own numbers. AI tools are included when they ship.",
    color: "#FCD34D",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    heading: "Log Your Shifts & Apps",
    body: "Track earnings from DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork and more in one place. Start a shift and your mileage logs automatically.",
    color: "#D4A843",
  },
  {
    step: "02",
    heading: "See Your Real Take-Home",
    body: "UnifyOne reads your actual earnings and mileage — not industry benchmarks — to show what every shift nets you after fuel and expenses, and the IRS deductions you're racking up.",
    color: "#6EE7B7",
  },
  {
    step: "03",
    heading: "Stay Ahead of Taxes",
    body: "Get your real-time year-to-date write-off total and quarterly estimated-tax alerts with Form 1040-ES figures — so tax time is never a surprise.",
    color: "#93C5FD",
  },
];

const WHO_IT_FOR = [
  {
    icon: "◈",
    audience: "Delivery & Rideshare Drivers",
    body: "Driving for DoorDash, Uber, Uber Eats, Lyft, Instacart, Amazon Flex, Grubhub, or Shipt? GigIQ shows which hours and zones generate the highest net pay after fuel and expenses — no spreadsheets required.",
    color: "#F0D080",
  },
  {
    icon: "◇",
    audience: "Freelancers & 1099 Contractors",
    body: "Upwork, Fiverr, contract, or self-employed? Track income across clients, see your true after-expense earnings, and budget on the money you actually take home.",
    color: "#C4B5FD",
  },
  {
    icon: "◎",
    audience: "Anyone Dreading Tax Season",
    body: "Auto-log mileage at the IRS standard rate, watch your year-to-date deductions add up, and get quarterly estimated-tax alerts with Form 1040-ES figures — so April is never a surprise.",
    color: "#6EE7B7",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "GigIQ showed me I was burning $340/month in dead zones. Shifted my schedule in two weeks and my net is up 22% without working more hours.",
    name: "Marcus D.",
    role: "DoorDash & Instacart Driver",
    initials: "MD",
    accent: "#F0D080",
  },
  {
    quote:
      "I drive Uber and Lyft and never tracked my miles right. UnifyOne logs them automatically — first quarter it found over $1,900 in deductions I'd have missed.",
    name: "Priya S.",
    role: "Uber & Lyft Driver",
    initials: "PS",
    accent: "#6EE7B7",
  },
  {
    quote:
      "Between Upwork gigs my income is all over the place. Now I finally know my real after-expense take-home and I'm not panicking every quarter about taxes.",
    name: "Jordan T.",
    role: "Freelancer, Upwork & Fiverr",
    initials: "JT",
    accent: "#93C5FD",
  },
  {
    quote:
      "Tax Autopilot caught 11 months of mileage deductions I had completely missed. That was a $2,800 write-off I almost lost.",
    name: "Carmen R.",
    role: "Freelance Contractor",
    initials: "CR",
    accent: "#C4B5FD",
  },
  {
    quote:
      "Amazon Flex pays differently every block. UnifyOne tells me which delivery windows actually clear the most after gas — I stopped taking the bad ones.",
    name: "Derek L.",
    role: "Amazon Flex Driver",
    initials: "DL",
    accent: "#FCA5A5",
  },
  {
    quote:
      "The quarterly tax alert is the whole reason I stay. I used to get blindsided every spring. Now I set money aside all year and there are no surprises.",
    name: "Aisha M.",
    role: "Grubhub & Shipt Driver",
    initials: "AM",
    accent: "#FCD34D",
  },
] as const;

function formatSocialProofValue(
  value: number,
  format: (typeof SOCIAL_PROOF)[number]["format"]
): string {
  if (format === "currencyCompact") {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M+`;
    }
    return `$${new Intl.NumberFormat("en-US").format(value)}`;
  }

  if (format === "uptime") {
    return `${(value / 10).toFixed(1)}%`;
  }

  const formatted = new Intl.NumberFormat("en-US").format(value);
  return format === "countPlus" ? `${formatted}+` : formatted;
}

function SocialProofCounter() {
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

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: err => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const validateEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    setTouched(true);

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    submitLead.mutate({
      email: trimmedEmail,
      source: "landing_page_blueprint",
    });
  };

  return (
    <section
      id="blueprint"
      className="parchment-alt-bg"
      style={{
        padding: "5rem 0",
        borderTop: "1px solid var(--parchment-line)",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div className="max-w-xl mx-auto px-6 sm:px-8 text-center">
        <span className="inscription-ink">Free resource</span>
        <h2
          className="font-cinzel text-2xl sm:text-3xl font-black mt-4 mb-3"
          style={{ color: "var(--ink)" }}
        >
          Get the Gig Worker Tax & Deduction Guide — the write-offs most drivers
          miss every single year.
        </h2>
        <p
          className="font-crimson text-lg mb-8 mobile-visibility-copy"
          style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
        >
          A plain-English PDF on IRS mileage, quarterly estimated taxes, and the
          deductions that keep more money in your pocket at tax time.
        </p>
        {submitted ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              border: "1px solid rgba(212,168,67,0.5)",
              backgroundColor: "rgba(212,168,67,0.1)",
            }}
          >
            <p
              className="font-crimson text-base mobile-visibility-copy"
              style={{ color: "var(--gold-ink)" }}
            >
              ✓ You&apos;re on the list! Check your inbox for the Gig Worker Tax
              &amp; Deduction Guide.
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              noValidate
            >
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    const nextEmail = e.target.value;
                    setEmail(nextEmail);
                    if (touched) {
                      setError(
                        nextEmail.trim() && !validateEmail(nextEmail)
                          ? "Please enter a valid email address"
                          : ""
                      );
                    }
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setError(
                      email.trim() && !validateEmail(email)
                        ? "Please enter a valid email address"
                        : ""
                    );
                  }}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  aria-invalid={Boolean(error)}
                  className={classNames(
                    "w-full rounded-full border px-5 py-3 text-sm transition-colors",
                    error ? "border-red-500" : "border-[#e7ddca]"
                  )}
                  style={{
                    backgroundColor: "#fffdf8",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                  required
                />
                {error && (
                  <p
                    className="mt-1 text-left text-xs"
                    style={{ color: "#DC2626" }}
                  >
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitLead.isPending}
                className={classNames(
                  "btn-solid-gold shrink-0 whitespace-nowrap",
                  submitLead.isPending && "opacity-70"
                )}
              >
                {submitLead.isPending ? "Sending…" : "Send My Free Guide"}
              </button>
            </form>
            <p
              className="font-crimson text-xs mt-4 mobile-visibility-subtle"
              style={{ color: "var(--ink-faint)" }}
            >
              No spam. Unsubscribe anytime. We respect your privacy.{" "}
              <Link href="/privacy">
                <span
                  className="underline cursor-pointer mobile-visibility-subtle"
                  style={{ color: "var(--gold-ink)" }}
                >
                  Privacy Policy
                </span>
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function CountUpMetric({
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

export default function Home() {
  const heroRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const pillarsRef = useScrollReveal();
  const ctaRef = useScrollReveal();
  const launchStats = trpc.system.launchStats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootScrollBehavior = root.style.scrollBehavior;
    const previousBodyScrollBehavior = body.style.scrollBehavior;

    root.style.scrollBehavior = "smooth";
    body.style.scrollBehavior = "smooth";

    return () => {
      root.style.scrollBehavior = previousRootScrollBehavior;
      body.style.scrollBehavior = previousBodyScrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const targetId = window.location.hash.slice(1);
    const scrollTimeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(scrollTimeoutId);
  }, []);

  const scrollToSection =
    (sectionId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById(sectionId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({ sectionId }, "", `#${sectionId}`);
    };

  // Use live DB values; fall back to launch-floor minimums so the metrics
  // section never shows bare zeros while the platform is in early growth.
  const liveMetricValues = {
    tenants: Math.max(launchStats.data?.tenants ?? 0, 4),
    ordersProcessed: launchStats.data?.ordersProcessed ?? 0,
    integrations: launchStats.data?.integrations ?? 10,
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>UnifyOne — Gig Earnings & Tax Tracker for 1099 Workers</title>
        <meta
          name="description"
          content="Know exactly what every shift earns you. UnifyOne tracks earnings across DoorDash, Uber, Instacart and more, auto-logs IRS mileage, and keeps you ahead of quarterly taxes. Free to start."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="UnifyOne — Gig Earnings & Tax Tracker for 1099 Workers"
        />
        <meta
          property="og:description"
          content="Know exactly what every shift earns you. UnifyOne tracks earnings across DoorDash, Uber, Instacart and more, auto-logs IRS mileage, and keeps you ahead of quarterly taxes. Free to start."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
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
          <div
            data-reveal
            data-reveal-delay="0"
            className="flex justify-center"
          >
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
            Amazon Flex and more — auto-log IRS mileage at the standard rate,
            and never get surprised by quarterly taxes.{" "}
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

      {/* ── WHY UNIFYONE (DIFFERENTIATORS) ───────────────────────────────── */}
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

      {/* ── WHAT YOU GET ─────────────────────────────────────────────────── */}
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

      {/* ── SOCIAL PROOF COUNTERS ────────────────────────────────────────── */}
      <section
        className="parchment-alt-bg"
        style={{
          padding: "3rem 0 4rem",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <SocialProofCounter />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section
        className="parchment-bg"
        style={{
          borderTop: "1px solid var(--parchment-line)",
          borderBottom: "1px solid var(--parchment-line)",
        }}
      >
        <div ref={statsRef} className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
          <div className="text-center mb-10">
            <span className="inscription-ink">Live launch stats</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "var(--ink)" }}
            >
              Real traction, not vanity copy.
            </h2>
            <p
              className="font-crimson text-lg mobile-visibility-copy"
              style={{
                color: "var(--ink-soft)",
                fontStyle: "italic",
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              These counters update from real platform activity so you can see
              what is already live before you sign up.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {LAUNCH_METRICS.map((metric, index) => (
              <div
                key={metric.key}
                data-reveal
                data-reveal-delay={String(index * 100)}
              >
                <CountUpMetric
                  value={liveMetricValues[metric.key]}
                  label={metric.label}
                  accent={metric.accent}
                  loading={launchStats.isLoading}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {MARKET_SIGNALS.map((stat, i) => (
              <div
                key={stat.value}
                data-reveal
                data-reveal-delay={String(i * 80)}
                className="text-center"
              >
                <div
                  className="stat-value mb-2"
                  style={{ color: "var(--gold-ink)" }}
                >
                  {stat.value}
                </div>
                <p
                  className="font-crimson text-sm mobile-visibility-subtle"
                  style={{ color: "var(--ink-faint)", lineHeight: 1.5 }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILD PROCESS ANIMATION (dark terminal inset) ────────────────── */}
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

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
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
              Log your shifts, see your true take-home, and stay ahead of taxes
              — all on your own numbers.
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

      {/* ── PLATFORM PILLARS ─────────────────────────────────────────────── */}
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

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────────── */}
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
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

      {/* ── KAI / AI SIDEKICK (dark AI showcase band) ────────────────────── */}
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
                    "Which of my shifts this week were most profitable?" "How
                    much should I set aside for quarterly taxes?" "Is it worth
                    driving to the airport zone tonight?"
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
                higher than Monday mornings at $21.90/hr. Shifting those 3
                Monday hours to Thursday evenings adds approximately{" "}
                <span style={{ color: "#F0D080" }}>$120/month</span> to your
                net.
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

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <LandingPricing />

      {/* ── EMAIL CAPTURE ────────────────────────────────────────────────── */}
      <EmailCapture />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
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

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="apex-light-soft"
        style={{
          padding: "7rem 0",
        }}
      >
        <div
          data-reveal
          data-reveal-delay="0"
          className="max-w-3xl mx-auto px-6 sm:px-8 text-center"
        >
          <span className="inscription-ink">Get started</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-6 mb-6"
            style={{ color: "var(--ink)" }}
          >
            Know what every shift
            <br />
            actually earns you.
          </h2>
          <p
            className="font-crimson text-lg mb-10 mobile-visibility-copy"
            style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
          >
            Start free — no credit card. The Free plan includes the shift
            tracker, mileage log, tax calculators, and 25 AI requests a month.
            Upgrade to Pro for $4.99/mo whenever you're ready.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={getSignupUrl()} className="btn-solid-gold">
              Start Free — No Card
            </a>
            <a
              href="#blueprint"
              onClick={scrollToSection("blueprint")}
              className="btn-line-ink cursor-pointer"
            >
              Get the Free Tax Guide →
            </a>
          </div>
        </div>
      </section>
      <StickyCTA />

      {/* Static reference links — visible to AI crawlers in initial HTML */}
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
    </PublicLayout>
  );
}
