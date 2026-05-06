import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { TIERS } from "@/content/pricing";
import { SITE_URL } from "@/lib/siteConfig";
import { cn as classNames } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BuildProcessAnimation from "@/components/BuildProcessAnimation";

const CANONICAL = `${SITE_URL}/`;

const HOME_FAQ = [
  {
    q: "What is UnifyOne by 1Commerce?",
    a: "UnifyOne is a multi-tenant commerce and gig economy intelligence platform built by 1Commerce LLC (PNW Enterprises). It unifies Shopify store management, Stripe and PayPal payment processing, AI-powered earnings analytics, and automatic IRS tax deduction tracking in one dashboard.",
  },
  {
    q: "What platforms does 1Commerce integrate with?",
    a: "UnifyOne integrates with Shopify, Stripe, PayPal, and Square for commerce and payments. The UnifyAI multi-model router provides access to 300+ AI models including Claude, GPT-4, and Gemini through a single unified API key.",
  },
  {
    q: "Is UnifyOne free to start?",
    a: "Yes — the Starter tier is permanently free and includes tenant setup, core analytics, and Kai AI access. Paid tiers unlock workflow automation, advanced multi-tenant analytics, and higher UnifyAI credit allocations.",
  },
  {
    q: "What is GigIQ?",
    a: "GigIQ is UnifyOne's shift intelligence module. It reads your real earnings data and identifies which working hours, delivery zones, and gig platforms generate the highest net income after expenses — giving you specific, actionable schedule recommendations.",
  },
  {
    q: "Who is 1Commerce LLC / PNW Enterprises?",
    a: "1Commerce LLC (also known as PNW Enterprises, 1-commerce, or OneCommerce) is the company behind UnifyOne. Founded to serve gig workers and multi-tenant e-commerce operators who are underserved by existing single-purpose tools.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "UnifyOne | AI-Powered Multi-Tenant Commerce Platform",
    description:
      "UnifyOne is the multi-tenant commerce platform for gig operators and e-commerce teams. AI-powered earnings insights, order management, and Shopify integration.",
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
  { value: "76M+", label: "US gig workers underserved by existing tools" },
  {
    value: "$3,200",
    label: "avg additional deductions tracked per user annually",
  },
  {
    value: "300+",
    label: "AI models accessible through one Kai unified API key",
  },
  {
    value: "$556B",
    label: "gig economy market with no unified intelligence layer",
  },
];

const LAUNCH_METRICS = [
  {
    key: "tenants",
    label: "tenants launched",
    accent: "#D4A843",
  },
  {
    key: "ordersProcessed",
    label: "orders processed",
    accent: "#6EE7B7",
  },
  {
    key: "integrations",
    label: "integrations ready",
    accent: "#93C5FD",
  },
] as const;

const SOCIAL_PROOF = [
  {
    label: "Operators",
    numeric: 2400,
    accent: "#D4A843",
    format: "countPlus",
  },
  {
    label: "Processed",
    numeric: 1200000,
    accent: "#6EE7B7",
    format: "currencyCompact",
  },
  {
    label: "Integrations",
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
  "Stripe",
  "PayPal",
  "Square",
  "Shopify",
  "Anthropic Claude",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PILLARS = [
  {
    glyph: "◈",
    name: "GigIQ",
    title: "Shift Intelligence",
    body: "See which hours, zones, and platforms actually pay the most. Real earnings data. Specific recommendations. Not generic advice.",
    color: "#F0D080",
  },
  {
    glyph: "◎",
    name: "Tax Autopilot",
    title: "IRS Deduction Tracker",
    body: "Auto-captures mileage from every logged shift at the current IRS rate. Real-time YTD deduction figure. Quarterly estimate alerts.",
    color: "#6EE7B7",
  },
  {
    glyph: "⬡",
    name: "UnifyAI",
    title: "Multi-Model API Router",
    body: "One set of credentials routes to Claude, GPT, Gemini and more. Unified credit billing means one predictable cost across models. Full MCP config dashboard. Zero vendor lock-in.",
    color: "#93C5FD",
  },
  {
    glyph: "◇",
    name: "MoneyPulse",
    title: "Money Manager",
    body: "Budgeting, goal tracking, earnings forecasts, and spending analysis — all connected to your actual gig income streams.",
    color: "#C4B5FD",
  },
  {
    glyph: "▣",
    name: "1Commerce",
    title: "Commerce Engine",
    body: "Multi-tenant storefront management, Shopify sync, affiliate network tools, and order fulfillment under one dashboard.",
    color: "#FCA5A5",
  },
  {
    glyph: "◉",
    name: "Kai",
    title: "AI Sidekick",
    body: "Kai is our in-house AI, powered by UnifyAI. It reads your actual data and routes across models while keeping one unified cost.",
    color: "#FCD34D",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    heading: "Connect Your Platforms",
    body: "Link Shopify, Stripe, PayPal, Square, and your gig delivery apps in minutes. No developer required — UnifyOne handles every integration.",
    color: "#D4A843",
  },
  {
    step: "02",
    heading: "AI Reads Your Real Data",
    body: "Kai — UnifyOne's built-in AI — analyzes your actual shift earnings, mileage logs, and order history. Not industry benchmarks. Your numbers.",
    color: "#6EE7B7",
  },
  {
    step: "03",
    heading: "Get Actionable Intelligence",
    body: "Know which hours pay the most after expenses. Track every IRS-eligible deduction automatically. Manage all tenants from one unified dashboard.",
    color: "#93C5FD",
  },
];

const WHO_IT_FOR = [
  {
    icon: "⬡",
    audience: "Gig Economy Operators",
    body: "Working DoorDash, Uber Eats, Instacart, or any delivery platform? 1Commerce's GigIQ module shows which hours and zones generate the highest net pay after fuel and expenses — no spreadsheets required.",
    color: "#F0D080",
  },
  {
    icon: "▣",
    audience: "Multi-Tenant Commerce Teams",
    body: "Agencies and operators managing multiple Shopify stores get one UnifyOne dashboard with full tenant isolation, order management, affiliate tools, and real-time analytics across every storefront.",
    color: "#FCA5A5",
  },
  {
    icon: "◎",
    audience: "Independent Contractors",
    body: "Track mileage at the current IRS rate, forecast quarterly estimated taxes, and understand your true net income across every platform — all built into 1Commerce's core platform at no extra cost.",
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
      "Managing 7 Shopify stores from one dashboard was the dream. UnifyOne's tenant isolation means my clients' data is always separate, always clean.",
    name: "Priya S.",
    role: "E-Commerce Agency Owner",
    initials: "PS",
    accent: "#6EE7B7",
  },
  {
    quote:
      "The Kai unified API pricing alone is worth it. I used to juggle three AI vendor bills. Now I have one credit system and one invoice.",
    name: "Jordan T.",
    role: "Independent Developer",
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
      "We white-labeled the whole platform in a week. Our clients think it's our proprietary tool. The Scale tier pays for itself with the first resale.",
    name: "Derek L.",
    role: "SaaS Reseller, Scale Tier",
    initials: "DL",
    accent: "#FCA5A5",
  },
  {
    quote:
      "Onboarding was under 10 minutes. Stripe connected, first order in by end of day. No developer, no headaches — just a working commerce stack.",
    name: "Aisha M.",
    role: "New Tenant, Starter Plan",
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

  return (
    <div ref={ref} className="space-y-8 py-4">
      <div className="text-center">
        <p
          className="font-cinzel text-xs tracking-[0.24em] uppercase"
          style={{ color: "#D4A843" }}
        >
          Trusted by operators
        </p>
        <p
          className="font-crimson text-base sm:text-lg mt-3"
          style={{ color: "#9A9A9A", fontStyle: "italic" }}
        >
          Join 2,400+ operators already running their commerce stack on
          UnifyOne.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {SOCIAL_PROOF.map((sp, index) => (
          <div
            key={sp.label}
            className="rounded-2xl border px-4 py-5 text-center sm:px-6"
            style={{
              borderColor: "rgba(36,36,36,0.9)",
              background:
                "linear-gradient(180deg, rgba(10,10,10,0.95), rgba(3,3,3,0.92))",
            }}
          >
            <div
              className="font-cinzel text-3xl sm:text-4xl font-black"
              style={{ color: sp.accent }}
            >
              {formatSocialProofValue(counts[index] ?? 0, sp.format)}
            </div>
            <p
              className="mt-2 font-crimson text-xs uppercase tracking-[0.18em] sm:text-sm"
              style={{ color: "#6A6A6A" }}
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
      className="cathedral-bg"
      style={{
        padding: "5rem 0",
        borderTop: "1px solid #242424",
        borderBottom: "1px solid #242424",
      }}
    >
      <div className="max-w-xl mx-auto px-6 sm:px-8 text-center">
        <span className="inscription" style={{ color: "#D4A843" }}>
          FREE RESOURCE
        </span>
        <h2
          className="font-cinzel text-2xl sm:text-3xl font-black mt-4 mb-3"
          style={{ color: "#F0E8D0" }}
        >
          Get the Cathedral Blueprint — the exact system architecture we use to
          run 8 revenue streams from one platform.
        </h2>
        <p
          className="font-crimson text-lg mb-8 mobile-visibility-copy"
          style={{ color: "#6A6A6A", fontStyle: "italic" }}
        >
          The architecture guide behind UnifyOne: multi-tenant design, AI
          routing, and gig income intelligence — all in one downloadable PDF.
        </p>
        {submitted ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              border: "1px solid rgba(212,168,67,0.3)",
              backgroundColor: "rgba(212,168,67,0.05)",
            }}
          >
            <p
              className="font-crimson text-base mobile-visibility-copy"
              style={{ color: "#D4A843" }}
            >
              ✓ You&apos;re on the list! Check your inbox for the Cathedral
              Blueprint.
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
                    "w-full rounded-lg border px-4 py-3 text-sm transition-colors",
                    error ? "border-red-500" : "border-[#242424]"
                  )}
                  style={{
                    backgroundColor: "#0A0A0A",
                    color: "#F0E8D0",
                    outline: "none",
                  }}
                  required
                />
                {error && (
                  <p
                    className="mt-1 text-left text-xs"
                    style={{ color: "#EF4444" }}
                  >
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitLead.isPending}
                className={classNames(
                  "btn-illuminate shrink-0 whitespace-nowrap",
                  submitLead.isPending && "opacity-70"
                )}
              >
                {submitLead.isPending ? "Sending…" : "Send My Blueprint"}
              </button>
            </form>
            <p
              className="font-crimson text-xs mt-4 mobile-visibility-subtle"
              style={{ color: "#3A3A3A" }}
            >
              No spam. Unsubscribe anytime. We respect your privacy.{" "}
              <Link href="/privacy">
                <span
                  className="underline cursor-pointer mobile-visibility-subtle"
                  style={{ color: "#4A4A4A" }}
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
    <div
      className="stone-card p-6 text-center"
      style={{
        borderColor: "rgba(36,36,36,0.9)",
        background:
          "linear-gradient(180deg, rgba(10,10,10,0.98), rgba(3,3,3,0.96))",
      }}
    >
      <div
        className="font-cinzel text-3xl sm:text-4xl font-black mb-2"
        style={{ color: accent }}
      >
        {loading ? "…" : new Intl.NumberFormat("en-US").format(displayValue)}
      </div>
      <p
        className="font-crimson text-sm uppercase tracking-[0.18em]"
        style={{ color: "#6A6A6A" }}
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
  const pricingRef = useScrollReveal();
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

  const liveMetricValues = {
    tenants: launchStats.data?.tenants ?? 0,
    ordersProcessed: launchStats.data?.ordersProcessed ?? 0,
    integrations: launchStats.data?.integrations ?? 10,
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>UnifyOne | AI-Powered Multi-Tenant Commerce Platform</title>
        <meta
          name="description"
          content="UnifyOne is the multi-tenant commerce platform for gig operators and e-commerce teams. AI-powered earnings insights, order management, and Shopify integration."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="UnifyOne | AI-Powered Multi-Tenant Commerce Platform"
        />
        <meta
          property="og:description"
          content="Commerce infrastructure engineered like a cathedral — sequential, structural, and built to outlast every platform trend. AI-powered insights for gig operators. Start free."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="apex-light"
        style={{
          paddingTop: "8rem",
          paddingBottom: "6rem",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
          <div data-reveal data-reveal-delay="0">
            <span className="inscription" style={{ color: "#D4A843" }}>
              COMMERCE INFRASTRUCTURE
            </span>
          </div>

          <div
            data-reveal
            data-reveal-delay="50"
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
          >
            {[
              "Launch your first tenant in under 10 minutes",
              "Starter stays free until you need automation",
              "Checkout-ready on day one",
            ].map(item => (
              <span
                key={item}
                className="rounded-full px-4 py-2 text-xs sm:text-sm mobile-visibility-chip"
                style={{
                  color: "#9A9A9A",
                  border: "1px solid rgba(212,168,67,0.18)",
                  backgroundColor: "rgba(212,168,67,0.04)",
                  fontFamily: "Cinzel, serif",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {item}
              </span>
            ))}
          </div>

          <h1
            data-reveal
            data-reveal-delay="100"
            className="font-cinzel mt-6 mb-6"
            style={{
              fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1.06,
              color: "#F0E8D0",
            }}
          >
            UnifyOne: Your AI Knows
            <br />
            What You Actually Earn.
          </h1>

          <p
            data-reveal
            data-reveal-delay="200"
            className="font-crimson text-xl mx-auto mb-10 mobile-visibility-copy"
            style={{
              color: "#6A6A6A",
              fontStyle: "italic",
              maxWidth: 560,
              lineHeight: 1.7,
            }}
          >
            UnifyOne reads your real shift data, tracks every deduction, and
            tells you exactly where you're leaving money on the table.{" "}
            <em style={{ color: "#9A9A9A" }}>
              Not generic advice — intelligence built on your numbers.
            </em>
          </p>

          <div
            data-reveal
            data-reveal-delay="300"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href={getSignupUrl()} className="btn-illuminate">
              Start Free Trial
            </a>
            <a
              href="#pricing"
              onClick={scrollToSection("pricing")}
              className="btn-ghost-gold cursor-pointer"
            >
              See Live Plans ↓
            </a>
          </div>

          <p
            data-reveal
            data-reveal-delay="300"
            className="font-crimson text-sm mt-3 mobile-visibility-copy"
            style={{ color: "#9A9A9A", fontStyle: "italic" }}
          >
            No credit card required · 14-day free trial
          </p>

          <p
            data-reveal
            data-reveal-delay="325"
            className="font-crimson text-sm mt-4 mobile-visibility-copy"
            style={{ color: "#D7CBA5", fontStyle: "italic" }}
          >
            Join 2,400+ operators already running their commerce stack on
            UnifyOne.
          </p>

          <div
            data-reveal
            data-reveal-delay="340"
            className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <span
              className="font-cinzel text-[0.65rem] uppercase tracking-[0.24em]"
              style={{ color: "#5A5A5A" }}
            >
              Powered by
            </span>
            {TRUST_BADGES.map(badge => (
              <span
                key={badge}
                className={classNames(
                  "rounded-full border px-3 py-1 text-[0.7rem] font-cinzel tracking-[0.18em] uppercase sm:text-xs",
                  "mobile-visibility-brand"
                )}
                style={{
                  color: "#8A8A8A",
                  borderColor: "rgba(138,138,138,0.18)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                {badge}
              </span>
            ))}
          </div>

          <p
            data-reveal
            data-reveal-delay="350"
            className="font-crimson text-sm mt-5 mobile-visibility-subtle"
            style={{ color: "#5A5A5A", fontStyle: "italic" }}
          >
            Need proof first? Review{" "}
            <Link href="/the-system">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                how the full system works
              </span>
            </Link>{" "}
            or jump straight to the blueprint.
          </p>

          <div
            data-reveal
            data-reveal-delay="400"
            className="flex justify-center mt-4"
          >
            <a
              href="#blueprint"
              onClick={scrollToSection("blueprint")}
              className="font-crimson text-sm underline"
              style={{ color: "#D4A843" }}
            >
              Get the Cathedral Blueprint →
            </a>
          </div>

          <div
            data-reveal
            data-reveal-delay="450"
            className="flex justify-center mt-3"
          >
            <a
              href="https://marketing.1commerce.online"
              className="font-crimson text-sm underline"
              style={{ color: "#9A9A9A", fontStyle: "italic" }}
            >
              First time here? Learn how UnifyOne works →
            </a>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF COUNTERS ────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid #242424",
          backgroundColor: "#030303",
          padding: "2rem 0",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <SocialProofCounter />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
        }}
      >
        <div ref={statsRef} className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
          <div className="text-center mb-10">
            <span className="inscription" style={{ color: "#D4A843" }}>
              LIVE LAUNCH STATS
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Real traction, not vanity copy.
            </h2>
            <p
              className="font-crimson text-lg mobile-visibility-copy"
              style={{
                color: "#6A6A6A",
                fontStyle: "italic",
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              These counters update from the platform footprint so you can see
              what is already live before you start your own build.
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
                <div className="stat-value mb-2">{stat.value}</div>
                <p
                  className="font-crimson text-sm mobile-visibility-subtle"
                  style={{ color: "#5A5A5A", lineHeight: 1.5 }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILD PROCESS ANIMATION ──────────────────────────────────────── */}
      <section
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <BuildProcessAnimation />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              HOW IT WORKS
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Three steps to unified commerce intelligence.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{
                color: "#9A9A9A",
                fontStyle: "italic",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              UnifyOne connects your data, processes it with AI, and surfaces
              the insights that move the needle on your bottom line.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                data-reveal
                data-reveal-delay={String(i * 100)}
                className="relative p-8 sm:p-10"
                style={{
                  border: "1px solid #242424",
                  backgroundColor: "#020202",
                }}
              >
                <div
                  className="font-cinzel text-4xl font-black mb-4"
                  style={{ color: step.color, opacity: 0.25 }}
                >
                  {step.step}
                </div>
                <h3
                  className="font-cinzel text-lg font-bold mb-3"
                  style={{ color: "#F0E8D0", letterSpacing: "0.04em" }}
                >
                  {step.heading}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#9A9A9A", lineHeight: 1.75 }}
                >
                  {step.body}
                </p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{
                    background: `linear-gradient(to right, ${step.color}33, transparent)`,
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
        className="cathedral-bg"
        style={{ padding: "6rem 0" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              THE PLATFORM
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Six load-bearing pillars.
            </h2>
            <p
              className="font-crimson text-lg mobile-visibility-copy"
              style={{
                color: "#6A6A6A",
                fontStyle: "italic",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              Every module is structural. Nothing bolted on after the fact.
            </p>
          </div>

          <div
            ref={pillarsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
            style={{ border: "1px solid #242424" }}
          >
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.name}
                data-reveal
                data-reveal-delay={String(i * 80)}
                className="stone-card p-8"
                style={{ borderColor: "#242424" }}
              >
                <div
                  className="font-cinzel text-2xl mb-4"
                  style={{ color: pillar.color }}
                >
                  {pillar.glyph}
                </div>
                <div
                  className="inscription mb-2"
                  style={{ color: pillar.color, opacity: 0.7 }}
                >
                  {pillar.name}
                </div>
                <h3
                  className="font-cinzel text-lg font-700 mb-3"
                  style={{ color: "#F0E8D0" }}
                >
                  {pillar.title}
                </h3>
                <p
                  className="font-crimson text-base mobile-visibility-copy"
                  style={{ color: "#6A6A6A", lineHeight: 1.7 }}
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
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              WHO UNIFYONE IS BUILT FOR
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Built for operators, not analysts.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{
                color: "#9A9A9A",
                fontStyle: "italic",
                maxWidth: 500,
                margin: "0 auto",
              }}
            >
              1Commerce's UnifyOne serves three distinct operator types — each
              with their own module stack, data flows, and intelligence layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHO_IT_FOR.map((item, i) => (
              <div
                key={item.audience}
                data-reveal
                data-reveal-delay={String(i * 100)}
                className="stone-card p-8"
                style={{ borderColor: "#242424" }}
              >
                <div
                  className="font-cinzel text-2xl mb-4"
                  style={{ color: item.color }}
                >
                  {item.icon}
                </div>
                <h3
                  className="font-cinzel text-base font-bold mb-3"
                  style={{
                    color: "#F0E8D0",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.audience}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#9A9A9A", lineHeight: 1.75 }}
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
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              OPERATOR VOICES
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              From the operators using it.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{
                color: "#9A9A9A",
                fontStyle: "italic",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              Real results from gig workers, agency owners, and developers who
              replaced multiple tools with one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                data-reveal
                data-reveal-delay={String(i * 80)}
                className="p-8 relative"
                style={{
                  border: "1px solid #242424",
                  backgroundColor: "#020202",
                }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span
                      key={s}
                      style={{ color: t.accent, fontSize: "0.75rem" }}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <p
                  className="font-crimson text-base mb-6"
                  style={{
                    color: "#9A9A9A",
                    fontStyle: "italic",
                    lineHeight: 1.75,
                  }}
                >
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 flex items-center justify-center shrink-0 font-cinzel text-xs font-bold"
                    style={{
                      backgroundColor: `${t.accent}18`,
                      border: `1px solid ${t.accent}40`,
                      color: t.accent,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p
                      className="font-cinzel text-xs font-bold"
                      style={{ color: "#F0E8D0", letterSpacing: "0.06em" }}
                    >
                      {t.name}
                    </p>
                    <p
                      className="font-crimson text-xs"
                      style={{ color: "#5A5A5A" }}
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

      {/* ── KAI / AI SIDEKICK ────────────────────────────────────────────── */}
      <section
        id="kai"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inscription" style={{ color: "#D4A843" }}>
                KAI — AI SIDEKICK
              </span>
              <h2
                className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-6"
                style={{ color: "#F0E8D0" }}
              >
                In-house intelligence on your actual numbers.
              </h2>
              <div
                className="font-crimson text-lg space-y-4"
                style={{ color: "#9A9A9A", lineHeight: 1.7 }}
              >
                <p>
                  Kai isn't a generic chatbot. It reads your shift earnings,
                  mileage logs, and platform comparisons — then tells you
                  exactly which hours and zones pay the most after expenses.
                </p>
                <p>
                  Ask it anything:{" "}
                  <em style={{ color: "#9A9A9A" }}>
                    "Which of my shifts this week were most profitable?" "What
                    should I charge Client X?" "Route this prompt to the
                    lowest-latency model."
                  </em>
                </p>
                <p>
                  Kai runs on our unified API layer, so your team can call any
                  supported model and pay one consolidated Kai cost.
                </p>
              </div>
              <div className="mt-8">
                <a href={getSignupUrl()} className="btn-ghost-gold">
                  Activate Kai Free
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
                KAI LIVE DEMO
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
                  POWERED BY KAI + UNIFYAI · ANY MODEL · ONE UNIFIED COST
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNIFYAI CALLOUT ──────────────────────────────────────────────── */}
      <section
        id="unifyai"
        className="cathedral-bg"
        style={{
          padding: "5rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription" style={{ color: "#93C5FD" }}>
            UNIFYAI — MULTI-MODEL ROUTER
          </span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            300+ AI models. One key. One unified cost.
          </h2>
          <p
            className="font-crimson text-lg mb-8"
            style={{
              color: "#9A9A9A",
              fontStyle: "italic",
              maxWidth: 520,
              margin: "0 auto 2rem",
            }}
          >
            Route to Claude for analysis, GPT for code, Gemini for speed. Kai
            keeps billing model-agnostic with one predictable credit system and
            no per-model vendor accounts required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/documents/integrations">
              <span
                className="btn-ghost-gold cursor-pointer"
                style={{
                  color: "#93C5FD",
                  borderColor: "rgba(147,197,253,0.4)",
                }}
              >
                View Integration Guides
              </span>
            </Link>
            <Link href="/documents/integrations">
              <span className="btn-ghost-gold cursor-pointer">
                API & Integration Docs →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "6rem 0" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription" style={{ color: "#D4A843" }}>
              PRICING
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Built like the rest of the cathedral.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{ color: "#6A6A6A", fontStyle: "italic" }}
            >
              Clear, structural, no surprises. Kai unified API credits are
              included in every paid tier.
            </p>
          </div>

          <div
            ref={pricingRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-0"
          >
            {TIERS.map((tier, i) => (
              <div
                key={tier.id}
                data-reveal
                data-reveal-delay={String(i * 100)}
                className="relative p-8 sm:p-10"
                style={{
                  backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                  border: tier.highlight
                    ? "1px solid rgba(212,168,67,0.4)"
                    : "1px solid #242424",
                  boxShadow: tier.highlight
                    ? "0 0 60px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.2)"
                    : "none",
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="inscription px-3 py-1"
                      style={{ backgroundColor: "#D4A843", color: "#020202" }}
                    >
                      Most Chosen
                    </span>
                  </div>
                )}

                <div
                  className="inscription mb-6"
                  style={{ color: "rgba(212,168,67,0.5)" }}
                >
                  {tier.name.toUpperCase()}
                </div>

                <div className="mb-2">
                  <span
                    className="font-cinzel text-4xl font-black"
                    style={{ color: tier.highlight ? "#F0D080" : "#F0E8D0" }}
                  >
                    {tier.price}
                  </span>
                  <span
                    className="font-crimson text-sm ml-2 mobile-visibility-subtle"
                    style={{ color: "#5A5A5A" }}
                  >
                    / {tier.period}
                  </span>
                </div>

                <p
                  className="font-crimson text-base mb-8 mobile-visibility-subtle"
                  style={{ color: "#5A5A5A", fontStyle: "italic" }}
                >
                  {tier.description}
                </p>

                <div className="space-y-3 mb-10">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div
                        className="w-3 h-px shrink-0"
                        style={{ backgroundColor: "#D4A843" }}
                      />
                      <span
                        className="font-crimson text-sm mobile-visibility-copy"
                        style={{ color: "#6A6A6A" }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/login?plan=${tier.id}`}
                  className={classNames(
                    "block text-center",
                    tier.highlight ? "btn-illuminate" : "btn-ghost-gold"
                  )}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing">
              <span
                className="font-crimson text-base cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                Compare all features →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ────────────────────────────────────────────────── */}
      <EmailCapture />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        id="faq"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
          borderBottom: "1px solid #242424",
          backgroundColor: "#030303",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-14">
            <span className="inscription" style={{ color: "#D4A843" }}>
              FAQ
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
              style={{ color: "#F0E8D0" }}
            >
              Frequently asked questions.
            </h2>
            <p
              className="font-crimson text-lg"
              style={{ color: "#9A9A9A", fontStyle: "italic" }}
            >
              Everything you need to know about UnifyOne and 1Commerce LLC.
            </p>
          </div>

          <div className="space-y-0">
            {HOME_FAQ.map(item => (
              <div
                key={item.q}
                style={{
                  borderTop: "1px solid #242424",
                  padding: "1.75rem 0",
                }}
              >
                <h3
                  className="font-cinzel text-base font-semibold mb-3"
                  style={{
                    color: "#F0E8D0",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.q}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#9A9A9A", lineHeight: 1.8 }}
                >
                  {item.a}
                </p>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #242424" }} />
          </div>

          <div className="text-center mt-12">
            <Link href="/contact">
              <span
                className="font-crimson text-base cursor-pointer underline"
                style={{ color: "#D4A843" }}
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
        className="apex-light"
        style={{
          padding: "6rem 0",
          borderTop: "1px solid #242424",
        }}
      >
        <div
          data-reveal
          data-reveal-delay="0"
          className="max-w-3xl mx-auto px-6 sm:px-8 text-center"
        >
          <span className="inscription" style={{ color: "#D4A843" }}>
            BEGIN CONSTRUCTION
          </span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-6 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            The foundation is ready.
            <br />
            Your tenants are not.
          </h2>
          <p
            className="font-crimson text-lg mb-10 mobile-visibility-copy"
            style={{ color: "#6A6A6A", fontStyle: "italic" }}
          >
            Start free. No credit card. The Starter tier runs on the same
            infrastructure as every paid plan. When you're ready to scale,
            upgrade in one click — including Kai unified API capacity with one
            cost model.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={getSignupUrl()} className="btn-illuminate">
              Start Free Trial
            </a>
            <a
              href="#blueprint"
              onClick={scrollToSection("blueprint")}
              className="btn-ghost-gold cursor-pointer"
            >
              Claim the Blueprint →
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
