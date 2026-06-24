import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/the-system`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const LOGO_URL = `${SITE_URL}/favicon.ico`;

const FAQS = [
  {
    q: "How does UnifyOne work?",
    a: "UnifyOne is set up in four sequential phases. You lay the foundation (create your account and connect the gig apps you work), raise the walls (log shifts so earnings and mileage capture automatically), install the vaults (let Tax Autopilot track IRS mileage and compute quarterly estimated taxes), and light the spire (activate Kai, the AI sidekick that answers questions on your own numbers). Each phase builds on the one before it.",
  },
  {
    q: "How long does it take to get started on UnifyOne?",
    a: "Setup takes under 10 minutes — the onboarding wizard walks through your account, plan (Free or Pro), and the gig apps you drive or freelance for. Start a shift and your earnings and mileage begin logging right away. The Free plan needs no card.",
  },
  {
    q: "Which gig apps and tools does UnifyOne support?",
    a: "UnifyOne tracks earnings across DoorDash, Uber, Uber Eats, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and more. Under the hood it runs the GigIQ shift intelligence, Tax Autopilot tax engine (IRS standard mileage rate, Form 1040-ES figures), Money Manager, and Kai, on PostgreSQL via Drizzle with Supabase metering and GitHub Actions CI.",
  },
  {
    q: "How does Tax Autopilot handle mileage and quarterly taxes?",
    a: "Tax Autopilot auto-captures mileage from every logged shift at the IRS standard rate, keeps a real-time year-to-date deduction total, and alerts you before quarterly estimated taxes are due — including the figures you need for Form 1040-ES, built on your real after-expense income.",
  },
  {
    q: "What do GigIQ and Kai do?",
    a: "GigIQ reads your real earnings to show which hours and zones pay the most after fuel and expenses. Kai is your AI sidekick for tax, route, and scheduling questions answered on your own numbers — not generic tips. AI tools are included when they ship.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "The System — How UnifyOne Works | UnifyOne",
    description:
      "How UnifyOne works: four sequential phases that track your gig earnings across every app, auto-log IRS mileage, compute quarterly taxes, and surface GigIQ, Money Manager, and Kai insights.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "The System", item: CANONICAL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "The System: How UnifyOne Works for Gig Workers",
    description:
      "How UnifyOne works end to end — four sequential phases that track gig earnings across every app, auto-log IRS mileage, compute quarterly taxes, and surface GigIQ, Money Manager, and Kai insights.",
    url: CANONICAL,
    mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    image: OG_IMAGE,
    author: { "@type": "Organization", name: "1Commerce Solutions" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce Solutions",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    keywords:
      "how UnifyOne works, gig worker earnings tracker, IRS mileage tracking, quarterly estimated taxes, Form 1040-ES, GigIQ, Tax Autopilot, Money Manager, Kai",
    datePublished: "2026-03-06",
    dateModified: "2026-03-06",
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Track Gig Earnings and Taxes with UnifyOne",
    description:
      "Four sequential phases to track your gig earnings, auto-log IRS mileage, and stay ahead of quarterly taxes: foundation, walls, vaults, and spire.",
    url: CANONICAL,
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Lay the Foundation",
        text: "Create your account, pick a plan (Free or Pro), and connect the gig apps you drive or freelance for.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Raise the Walls",
        text: "Log your shifts so earnings and IRS mileage capture automatically across DoorDash, Uber, Instacart, Upwork and more.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Install the Vaults",
        text: "Let Tax Autopilot track your year-to-date deductions at the IRS standard mileage rate and compute quarterly estimated taxes with Form 1040-ES figures.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Light the Spire",
        text: "Activate Kai. Your AI sidekick reads your actual earnings and mileage and answers tax, route, and scheduling questions on your own numbers.",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const CATHEDRAL_FEATURES_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-features-v2-TQVRMkNdoVVuwphEqVNwpV.webp";

const CONSTRUCTION_PHASES = [
  {
    phase: "Phase I",
    title: "Lay the Foundation",
    body: "Create your account, pick a plan, and connect the gig apps you work. The crypt is sealed before the nave rises. This takes under 10 minutes — the onboarding wizard walks through your account, Free or Pro selection, and the apps you drive or freelance for. The Free plan needs no card.",
    details: [
      "Account creation in three steps",
      "Plan selection (Free or Pro $4.99/mo)",
      "Connect DoorDash, Uber, Lyft, Instacart, Upwork and more",
      "No credit card required to start",
    ],
  },
  {
    phase: "Phase II",
    title: "Raise the Walls",
    body: "Log your shifts and let earnings and mileage capture automatically. Structure before decoration. Every shift is a load-bearing record — payout, hours, and IRS mileage at the standard rate are captured as you work, not reconstructed from memory at tax time.",
    details: [
      "Shift tracker across every gig app",
      "Automatic IRS mileage logging at the standard rate",
      "Real net pay after fuel and expenses",
      "One earnings history, no spreadsheets",
    ],
  },
  {
    phase: "Phase III",
    title: "Install the Vaults",
    body: "Let Tax Autopilot turn your logged shifts into tax-ready numbers. Mileage rolls into a real-time year-to-date deduction total, and quarterly estimated-tax alerts surface the Form 1040-ES figures you need before each deadline — built on your real after-expense income, so April is never a surprise.",
    details: [
      "Real-time YTD deduction total",
      "Quarterly estimated-tax alerts",
      "Form 1040-ES figures on your real income",
      "Money Manager budgets on take-home pay",
    ],
  },
  {
    phase: "Phase IV",
    title: "Light the Spire",
    body: "Activate Kai. Your AI sidekick reads your actual earnings and mileage and answers tax, route, and scheduling questions on your own numbers. It is context-aware — it knows which page you are on and what your recent shifts look like. AI tools are included when they ship.",
    details: [
      "Context-aware AI on every dashboard page",
      "Answers on your own earnings and mileage",
      "Tax, route, and scheduling questions",
      "Included when it ships",
    ],
  },
];

const INTEGRATIONS = [
  {
    name: "DoorDash",
    category: "Delivery",
    desc: "Track payouts and per-shift net pay after fuel and expenses.",
  },
  {
    name: "Uber & Uber Eats",
    category: "Rideshare",
    desc: "Earnings and mileage capture across rides and deliveries.",
  },
  {
    name: "Lyft",
    category: "Rideshare",
    desc: "Per-shift earnings tracking with automatic IRS mileage.",
  },
  {
    name: "Instacart",
    category: "Delivery",
    desc: "Batch earnings logged alongside the miles you drove.",
  },
  {
    name: "Amazon Flex",
    category: "Delivery",
    desc: "Block earnings and mileage rolled into your deduction total.",
  },
  {
    name: "Grubhub & Shipt",
    category: "Delivery",
    desc: "Delivery payouts captured shift by shift in one history.",
  },
  {
    name: "Upwork & Fiverr",
    category: "Freelance",
    desc: "1099 freelance income tracked beside your gig driving.",
  },
  {
    name: "Tax Autopilot",
    category: "Tax Engine",
    desc: "IRS standard mileage rate, YTD deductions, Form 1040-ES figures.",
  },
  {
    name: "Kai",
    category: "Intelligence",
    desc: "AI sidekick that answers questions on your own numbers.",
  },
  {
    name: "Stripe",
    category: "Billing",
    desc: "Pro plan billing at $4.99/mo with verified webhooks.",
  },
];

const PLATFORM_FEATURES = [
  {
    title: "Real-Time Earnings Dashboard",
    body: "Your earnings across every gig app in one live view. Each logged shift updates your take-home pay after fuel and expenses without a page refresh — no spreadsheet, no shoebox of receipts.",
  },
  {
    title: "Automatic IRS Mileage Log",
    body: "Start a shift and your miles log automatically at the IRS standard rate. Watch your year-to-date write-off total grow in real time — workers track about $3,200 in deductions a year on average.",
  },
  {
    title: "Quarterly Tax Autopilot",
    body: "Quarterly estimated-tax alerts and the Form 1040-ES figures you need, built on your real after-expense income. Set money aside all year so April is never a surprise.",
  },
  {
    title: "GigIQ Shift Intelligence",
    body: "GigIQ reads your real earnings and shows which hours and zones generate the highest net pay after fuel and expenses. Specific scheduling recommendations, not generic advice.",
  },
  {
    title: "Money Manager",
    body: "Budgeting, goals, and spending analysis built on your real after-expense gig income — so your plan matches what you actually take home, not a salaried estimate.",
  },
  {
    title: "Kai, Your AI Sidekick",
    body: "Ask Kai tax, route, and scheduling questions answered on your own earnings and mileage — not generic tips. AI tools are included when they ship.",
  },
];

export default function TheSystem() {
  const phasesRef = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <PublicLayout>
      <Helmet>
        <title>The System — How UnifyOne Works | UnifyOne</title>
        <meta
          name="description"
          content="How UnifyOne works: four sequential phases that track your gig earnings across every app, auto-log IRS mileage, compute quarterly taxes, and surface GigIQ, Money Manager, and Kai insights. Free to start."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="The System — How UnifyOne Works | UnifyOne"
        />
        <meta
          property="og:description"
          content="Four phases. Every gig app, one dashboard. Auto-logged IRS mileage and quarterly taxes done for you. Free to start."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta
          name="twitter:title"
          content="The System — How UnifyOne Works | UnifyOne"
        />
        <meta
          name="twitter:description"
          content="Four phases. Every gig app, one dashboard. Auto-logged IRS mileage and quarterly taxes done for you. Free to start."
        />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${CATHEDRAL_FEATURES_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,2,2,0.3) 0%, rgba(2,2,2,0.7) 60%, #020202 100%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inscription block mb-6">
            Sequential Construction
          </span>
          <h1
            className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
            }}
          >
            The System
          </h1>
          <p
            className="font-crimson text-xl sm:text-2xl max-w-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            Four phases. Every gig app in one dashboard. Auto-logged IRS mileage
            and quarterly taxes done for you.
          </p>
          <p
            className="font-crimson text-lg max-w-3xl mt-6"
            style={{ color: "#7A7A7A", lineHeight: 1.7 }}
          >
            UnifyOne works in four sequential phases — lay the foundation
            (connect your gig apps), raise the walls (log shifts so earnings and
            mileage capture automatically), install the vaults (Tax Autopilot
            tracks IRS mileage and quarterly estimated taxes), and light the
            spire (Kai, your AI sidekick). GigIQ, Money Manager, and Kai then
            surface insights on your real numbers — from one dashboard.
          </p>
          <div
            className="h-px mt-10 max-w-xs"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </div>
      </section>

      {/* ── CONSTRUCTION PHASES ─────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">The Build Sequence</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Four Phases of Construction
            </h2>
          </div>
          <div className="space-y-0" ref={phasesRef}>
            {CONSTRUCTION_PHASES.map((phase, i) => (
              <div
                key={i}
                data-reveal
                data-reveal-delay={String(i * 150)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-0 py-12"
                style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
              >
                <div className="lg:col-span-2 mb-4 lg:mb-0">
                  <span
                    className="font-cinzel text-xs font-600 tracking-widest"
                    style={{ color: "#D4A843", letterSpacing: "0.2em" }}
                  >
                    {phase.phase}
                  </span>
                </div>
                <div className="lg:col-span-5 lg:pr-16">
                  <h3
                    className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
                    style={{ color: "#F0E8D0", letterSpacing: "0.03em" }}
                  >
                    {phase.title}
                  </h3>
                  <p
                    className="font-crimson text-lg"
                    style={{ color: "#9A9A9A", lineHeight: 1.8 }}
                  >
                    {phase.body}
                  </p>
                </div>
                <div className="lg:col-span-5 mt-6 lg:mt-0">
                  <div className="space-y-3">
                    {phase.details.map((detail, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div
                          className="w-1 h-1 mt-2.5 shrink-0"
                          style={{ backgroundColor: "#D4A843" }}
                        />
                        <span
                          className="font-crimson text-base"
                          style={{ color: "#7A7A7A", lineHeight: 1.6 }}
                        >
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{
          borderTop: "1px solid rgba(212,168,67,0.06)",
          backgroundColor: "rgba(212,168,67,0.015)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">
              Connected Apps & Engine
            </span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Every App, One Dashboard
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
            {INTEGRATIONS.map((integration, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft:
                    i % 5 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <div className="mb-3">
                  <span className="inscription" style={{ color: "#3A3A3A" }}>
                    {integration.category}
                  </span>
                </div>
                <div
                  className="font-cinzel text-sm font-700 mb-3"
                  style={{ color: "#D4A843", letterSpacing: "0.1em" }}
                >
                  {integration.name}
                </div>
                <p
                  className="font-crimson text-sm"
                  style={{ color: "#5A5A5A", lineHeight: 1.7 }}
                >
                  {integration.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES ───────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">What You Get</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Platform Features
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {PLATFORM_FEATURES.map((feature, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft:
                    i % 3 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <h3
                  className="font-cinzel text-sm font-700 mb-4"
                  style={{ color: "#D4A843", letterSpacing: "0.1em" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#7A7A7A", lineHeight: 1.8 }}
                >
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Frequently Asked</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              How The System Works
            </h2>
          </div>
          <div className="space-y-6">
            {FAQS.map(item => (
              <div
                key={item.q}
                className="p-6"
                style={{ border: "1px solid rgba(212,168,67,0.1)" }}
              >
                <h3
                  className="font-cinzel text-base font-700 mb-3"
                  style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
                >
                  {item.q}
                </h3>
                <p
                  className="font-crimson text-base"
                  style={{ color: "#9A9A9A", lineHeight: 1.7 }}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <span className="inscription block mb-4">Begin Construction</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-bold mb-6"
            style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
          >
            The System Is Ready.
            <br />
            Your Earnings Await.
          </h2>
          <p
            className="font-crimson text-xl mb-10"
            style={{ color: "#9A9A9A", fontStyle: "italic" }}
          >
            Connect your gig apps, log your first shift, and watch your earnings
            and IRS mileage capture automatically — free, no card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getSignupUrl()} className="btn-illuminate">
              Start Free — No Card
            </a>
            <Link href="/ai-assistant">
              <span className="btn-ghost-gold cursor-pointer">
                Explore Kai →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
