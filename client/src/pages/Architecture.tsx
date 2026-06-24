import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/architecture`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const LOGO_URL = `${SITE_URL}/favicon.ico`;

const FAQS = [
  {
    q: "What is the Cathedral Framework?",
    a: "The Cathedral Framework is UnifyOne's architectural philosophy: build the platform sequentially, with each layer load-bearing before the next is raised. Earnings capture comes before mileage and tax math, tax math before budgeting, and all of it before AI. Every pillar is structural, not a decorative add-on — so the numbers a gig worker relies on for quarterly taxes are accurate end to end.",
  },
  {
    q: "What are the four structural pillars of UnifyOne?",
    a: "The four pillars are GigIQ (shift and earnings intelligence across DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and more), Tax Autopilot (IRS mileage logging at the standard rate plus quarterly estimated taxes and Form 1040-ES figures), Money Manager (budgeting and goals built on real after-expense income), and Kai (a context-aware AI sidekick for tax, route, and scheduling questions). They rest on an earnings data foundation that every pillar reads from.",
  },
  {
    q: "How does UnifyOne keep each worker's earnings and tax data private?",
    a: "Every worker's account is an isolated vault. Earnings, mileage, deductions, and tax figures are separated at the schema level and enforced with JWT sessions and role-based access control through Drizzle ORM on PostgreSQL — not by convention or middleware alone.",
  },
  {
    q: "What technology stack is UnifyOne built on?",
    a: "The frontend uses React 19, Vite, Tailwind CSS 4, and shadcn/ui. The API layer is tRPC 11 with Zod validation on Express. Earnings, mileage, and tax data live in PostgreSQL (Neon) via Drizzle ORM, with Supabase for credit metering and live updates. The platform ships on Node.js 22 with GitHub Actions CI.",
  },
  {
    q: "Why build the earnings foundation before the tax and AI layers?",
    a: "Because mileage logging, quarterly estimated taxes, and Kai's insights all read from your earnings data. If shift and earnings capture is not accurate and reliable first, every downstream number — your IRS deduction total, your Form 1040-ES figures, your budget — inherits that fragility. UnifyOne seals each load-bearing layer before adding the one above it, so tax time is never built on a shaky foundation.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Architecture — UnifyOne Cathedral Framework",
    description:
      "Explore the engine behind UnifyOne: an earnings data foundation under GigIQ, Tax Autopilot, Money Manager, and Kai. Built on the Cathedral Framework — sequential and built to endure.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: "1Commerce / PNW Enterprises",
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Architecture",
        item: CANONICAL,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "The Cathedral Framework: Structural Pillars of UnifyOne",
    description:
      "A deep-dive into the architecture behind UnifyOne — an earnings data foundation, GigIQ shift intelligence, Tax Autopilot for IRS mileage and quarterly taxes, Money Manager, and Kai.",
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
      "gig worker earnings tracker, gig tax software, IRS mileage tracking, quarterly estimated taxes, Form 1040-ES, Cathedral Framework, tRPC, Drizzle ORM",
    datePublished: "2026-03-06",
    dateModified: "2026-03-06",
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

const PILLARS = [
  {
    glyph: "I",
    title: "Earnings Data Foundation",
    subtitle: "Every shift, every app",
    body: "Your earnings across DoorDash, Uber, Lyft, Instacart, Amazon Flex, Grubhub, Shipt, Upwork, Fiverr and more, captured in one isolated vault. Each worker's data is structurally separated at the schema level — not by convention, not by middleware. Every shift, payout, and mile is a load-bearing record the layers above depend on.",
    tech: [
      "Drizzle ORM",
      "PostgreSQL (Neon)",
      "JWT sessions",
      "Per-worker isolation",
    ],
  },
  {
    glyph: "II",
    title: "GigIQ",
    subtitle: "Shift & earnings intelligence",
    body: "Reads your real earnings data to show which hours and zones actually pay the most after fuel and expenses. Specific scheduling recommendations drawn from what every shift nets you — not industry benchmarks, not generic advice. The intelligence layer reads the same schema as the foundation, so the numbers are never stale.",
    tech: [
      "Net-pay analysis",
      "Zone & hour modeling",
      "tRPC queries",
      "Real earnings data",
    ],
  },
  {
    glyph: "III",
    title: "Tax Autopilot",
    subtitle: "IRS mileage & quarterly taxes",
    body: "Auto-captures mileage from every logged shift at the IRS standard rate and keeps a real-time year-to-date deduction total. Quarterly estimated-tax alerts surface the Form 1040-ES figures you need before each deadline — built on your real after-expense income, so April is never a surprise.",
    tech: [
      "IRS standard mileage rate",
      "YTD deduction ledger",
      "Quarterly estimate alerts",
      "Form 1040-ES figures",
    ],
  },
  {
    glyph: "IV",
    title: "Money Manager",
    subtitle: "Budgeting on real income",
    body: "Budgeting, goals, and spending analysis built on your real after-expense gig income — so your plan matches what you actually take home, not a salaried estimate. Reads the same earnings and deduction records as Tax Autopilot, with no separate data entry.",
    tech: [
      "After-expense budgets",
      "Savings goals",
      "Spending analysis",
      "Set-aside for taxes",
    ],
  },
  {
    glyph: "V",
    title: "Kai",
    subtitle: "Your AI sidekick",
    body: "A context-aware sidekick for tax, route, and scheduling questions answered on your own numbers — your shift earnings and mileage logs, not generic tips. The AI reads your data server-side and returns specific answers. AI tools are included when they ship.",
    tech: [
      "Context injection",
      "Reads your numbers",
      "Conversation history",
      "Included when it ships",
    ],
  },
];

const TECH_STACK = [
  {
    layer: "Frontend",
    items: ["React 19", "Vite 6", "Tailwind CSS 4", "shadcn/ui", "Recharts"],
  },
  {
    layer: "API Layer",
    items: ["tRPC 11", "Superjson", "Zod validation", "Express 4"],
  },
  {
    layer: "Database",
    items: [
      "Drizzle ORM",
      "PostgreSQL (Neon)",
      "Supabase (metering)",
      "Schema migrations",
    ],
  },
  {
    layer: "Auth",
    items: [
      "OAuth",
      "JWT sessions",
      "Per-worker isolation",
      "Protected procedures",
    ],
  },
  {
    layer: "Tax Engine",
    items: [
      "IRS standard mileage rate",
      "YTD deduction ledger",
      "Quarterly estimates",
      "Form 1040-ES figures",
    ],
  },
  {
    layer: "Billing",
    items: [
      "Free + Pro $4.99/mo",
      "Stripe subscriptions",
      "Credit metering",
      "Webhook verification",
    ],
  },
  {
    layer: "AI",
    items: [
      "Kai (sidekick)",
      "Context injection",
      "Reads your numbers",
      "Included when it ships",
    ],
  },
  {
    layer: "Infrastructure",
    items: [
      "Node.js 22",
      "pnpm workspaces",
      "GitHub Actions CI",
      "Vitest suite",
    ],
  },
];

export default function Architecture() {
  const pillarsRef = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <PublicLayout>
      <Helmet>
        <title>Architecture — Cathedral Framework | UnifyOne</title>
        <meta
          name="description"
          content="The engine behind UnifyOne: an earnings data foundation under GigIQ, Tax Autopilot (IRS mileage + quarterly estimated taxes), Money Manager, and Kai. Built on the Cathedral Framework — sequential and built to endure."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta
          property="og:title"
          content="Architecture — Cathedral Framework | UnifyOne"
        />
        <meta
          property="og:description"
          content="The engine that tracks gig earnings across every app, auto-logs IRS mileage, and computes quarterly taxes. Accurate end to end, built to endure."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta
          name="twitter:title"
          content="Architecture — Cathedral Framework | UnifyOne"
        />
        <meta
          name="twitter:description"
          content="The engine that tracks gig earnings across every app, auto-logs IRS mileage, and computes quarterly taxes. Accurate end to end, built to endure."
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
            backgroundPosition: "center top",
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
            The Cathedral Framework
          </span>
          <h1
            className="font-cinzel text-4xl sm:text-6xl lg:text-7xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
            }}
          >
            Architecture
          </h1>
          <p
            className="font-crimson text-xl sm:text-2xl max-w-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            The engine that tracks your gig earnings across every app, auto-logs
            IRS mileage, and keeps you ahead of quarterly taxes.
          </p>
          <p
            className="font-crimson text-lg max-w-3xl mt-6"
            style={{ color: "#7A7A7A", lineHeight: 1.7 }}
          >
            UnifyOne's architecture is the Cathedral Framework: an earnings data
            foundation built in sequence under GigIQ, Tax Autopilot, Money
            Manager, and Kai — where each pillar is load-bearing and completed
            before the next is raised, so the numbers you file quarterly taxes
            on are accurate end to end.
          </p>
          <div
            className="h-px mt-10 max-w-xs"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </div>
      </section>

      {/* ── CATHEDRAL PRINCIPLE ─────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="inscription block mb-4">The Principle</span>
              <h2
                className="font-cinzel text-3xl sm:text-4xl font-bold mb-6"
                style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
              >
                Sequential Construction.
                <br />
                Permanent Foundation.
              </h2>
              <div
                className="font-crimson text-lg space-y-5"
                style={{ color: "#9A9A9A", lineHeight: 1.8 }}
              >
                <p>
                  Medieval cathedral builders did not decorate before the
                  foundation was sealed. They did not install stained glass
                  before the vault was load-tested. They built in sequence —
                  crypt, nave, transept, clerestory, spire — because each layer
                  depended on the structural integrity of the one below it.
                </p>
                <p>
                  UnifyOne is built on the same principle. Earnings capture
                  before mileage and tax math. Tax math before budgeting.
                  Budgeting before AI. Each pillar is a load-bearing wall, not a
                  decorative facade — because your IRS deduction total and your
                  Form 1040-ES figures are only as trustworthy as the layer
                  beneath them.
                </p>
                <p>
                  The result is a platform where the numbers a gig worker files
                  quarterly taxes on are accurate end to end — no stale figures,
                  no manual reconciliation at tax time, no compounding errors
                  that surface in April.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                "Earnings First",
                "Accurate Before Automated",
                "Deductions Before April",
                "Numbers You Can File On",
              ].map((principle, i) => (
                <div key={i} className="stone-card p-6">
                  <div
                    className="font-cinzel text-2xl font-black mb-3"
                    style={{ color: "rgba(212,168,67,0.2)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    className="font-cinzel text-xs font-600 tracking-widest"
                    style={{ color: "#D4A843", letterSpacing: "0.1em" }}
                  >
                    {principle}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLARS ─────────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ borderTop: "1px solid rgba(212,168,67,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">Structural Elements</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              The Pillars
            </h2>
          </div>
          <div className="space-y-0" ref={pillarsRef}>
            {PILLARS.map((pillar, i) => (
              <div
                key={i}
                data-reveal
                data-reveal-delay={String(i * 120)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-0"
                style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
              >
                {/* Glyph */}
                <div className="lg:col-span-1 flex items-start pt-8 pb-4 lg:pb-8">
                  <span
                    className="font-cinzel text-4xl font-black"
                    style={{ color: "rgba(212,168,67,0.15)", lineHeight: 1 }}
                  >
                    {pillar.glyph}
                  </span>
                </div>
                {/* Content */}
                <div className="lg:col-span-5 pt-0 lg:pt-8 pb-8 lg:pr-12">
                  <span className="inscription block mb-2">
                    {pillar.subtitle}
                  </span>
                  <h3
                    className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
                    style={{ color: "#F0E8D0", letterSpacing: "0.03em" }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className="font-crimson text-lg"
                    style={{ color: "#9A9A9A", lineHeight: 1.8 }}
                  >
                    {pillar.body}
                  </p>
                </div>
                {/* Tech tags */}
                <div className="lg:col-span-6 pt-0 lg:pt-8 pb-8 flex flex-wrap gap-2 content-start">
                  {pillar.tech.map((t, j) => (
                    <span
                      key={j}
                      className="font-cinzel text-xs px-3 py-1.5"
                      style={{
                        color: "#5A5A5A",
                        border: "1px solid rgba(212,168,67,0.1)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{
          borderTop: "1px solid rgba(212,168,67,0.06)",
          backgroundColor: "rgba(212,168,67,0.015)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <span className="inscription block mb-4">The Materials</span>
            <h2
              className="font-cinzel text-3xl sm:text-4xl font-bold"
              style={{ color: "#F0E8D0", letterSpacing: "0.02em" }}
            >
              Full Stack
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {TECH_STACK.map((layer, i) => (
              <div
                key={i}
                className="p-8"
                style={{
                  borderTop: "1px solid rgba(212,168,67,0.08)",
                  borderLeft:
                    i % 4 !== 0 ? "1px solid rgba(212,168,67,0.08)" : "none",
                }}
              >
                <span className="inscription block mb-4">{layer.layer}</span>
                <div className="space-y-2">
                  {layer.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div
                        className="w-1 h-1 shrink-0"
                        style={{ backgroundColor: "#D4A843" }}
                      />
                      <span
                        className="font-crimson text-sm"
                        style={{ color: "#9A9A9A" }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
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
              Architecture Questions
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
            The Foundation Is Ready.
            <br />
            Your Earnings Await.
          </h2>
          <p
            className="font-crimson text-xl mb-10"
            style={{ color: "#9A9A9A", fontStyle: "italic" }}
          >
            Start free — shift tracker, mileage log, and tax tools, no card
            required. Upgrade to Pro at $4.99/mo when you want more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getSignupUrl()} className="btn-illuminate">
              Start Free — No Card
            </a>
            <Link href="/the-system">
              <span className="btn-ghost-gold cursor-pointer">
                View The System →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
