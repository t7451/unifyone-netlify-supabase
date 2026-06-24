import { Link } from "wouter";
import { SITE_URL } from "@/lib/siteConfig";
import BlogPostHead from "@/components/BlogPostHead";

const CANONICAL = `${SITE_URL}/blog/digital-retail-guide`;
const TITLE =
  "The Gig Earnings Guide: How 1099 Workers Track Pay, Mileage, and Taxes | 1Commerce";
const DESCRIPTION =
  "A practical guide for gig and 1099 workers on DoorDash, Uber Eats, Instacart, and Amazon Flex — covering shift-level earnings tracking, automatic mileage deductions, quarterly tax estimates, keeping your data private, and the habits that separate workers who know their numbers from those who guess.";
const OG_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-hero-v2-3tFDpV7FHQo4P2qJjERF7q.png";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "The Gig Earnings Guide: How 1099 Workers Track Pay, Mileage, and Taxes",
    description: DESCRIPTION,
    image: OG_IMAGE,
    author: {
      "@type": "Organization",
      name: "1Commerce",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "1Commerce",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
    },
    datePublished: "2026-04-24",
    dateModified: "2026-04-24",
    mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    keywords: [
      "gig earnings guide",
      "gig worker taxes",
      "1099 mileage deduction",
      "DoorDash earnings tracker",
      "Uber Eats tax tracking",
      "Instacart mileage log",
      "gig worker quarterly taxes",
      "track gig income",
      "UnifyOne gig tracker",
      "1Commerce gig guide",
    ],
    articleSection: "Gig Earnings",
    wordCount: 1600,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Gig Earnings Guide",
        item: CANONICAL,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Why should gig workers track their earnings and mileage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Gig and 1099 workers are responsible for their own taxes and get no automatic mileage deduction. Tracking earnings at the shift level and logging every business mile shows your true pay per hour after fuel and protects thousands of dollars in deductions at tax time.",
        },
      },
      {
        "@type": "Question",
        name: "How does the mileage deduction work for gig workers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Self-employed gig workers can deduct business miles using the IRS standard mileage rate, which is 72.5 cents per mile for 2026. UnifyOne applies that rate to your logged shifts and keeps a running year-to-date deduction figure, so your quarterly tax estimate stays accurate.",
        },
      },
      {
        "@type": "Question",
        name: "How does UnifyOne help gig workers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "UnifyOne tracks shift-level earnings across DoorDash, Uber Eats, Instacart, and Amazon Flex, logs mileage automatically, estimates quarterly taxes, and keeps each worker's data privately isolated. The Gig Starter plan is free, and Gig Pro is $4.99/month with AI earnings tools rolling out as they ship.",
        },
      },
    ],
  },
];

export default function DigitalRetailGuidePost() {
  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <BlogPostHead
        canonical={CANONICAL}
        title={TITLE}
        description={DESCRIPTION}
        ogImage={OG_IMAGE}
        breadcrumbName="Gig Earnings Guide"
        jsonLd={JSON_LD}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "rgba(2,2,2,0.97)",
          borderBottom: "1px solid rgba(212,168,67,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <span
              className="font-cinzel text-xs font-700 tracking-widest cursor-pointer"
              style={{ color: "#D4A843", letterSpacing: "0.2em" }}
            >
              ← UNIFYONE
            </span>
          </Link>
          <span className="inscription" style={{ color: "#3A3A3A" }}>
            Cathedral Codex
          </span>
        </div>
      </nav>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-6 sm:px-8 pt-28 pb-24">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol
            className="flex items-center gap-2 text-xs"
            style={{
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.15em",
              color: "#3A3A3A",
            }}
          >
            <li>
              <Link href="/">
                <span className="cursor-pointer hover:text-amber-500 transition-colors">
                  Home
                </span>
              </Link>
            </li>
            <li style={{ color: "#242424" }}>›</li>
            <li>
              <Link href="/blog">
                <span
                  className="cursor-pointer hover:text-amber-500 transition-colors"
                  style={{ color: "#5A5A5A" }}
                >
                  Blog
                </span>
              </Link>
            </li>
            <li style={{ color: "#242424" }}>›</li>
            <li style={{ color: "#D4A843" }}>Gig Earnings Guide</li>
          </ol>
        </nav>
        <div className="mb-8">
          <Link href="/blog">
            <span
              className="text-xs cursor-pointer hover:text-amber-400 transition-colors"
              style={{
                fontFamily: "Cinzel, serif",
                letterSpacing: "0.15em",
                color: "#5A5A5A",
              }}
            >
              ← Back to Blog
            </span>
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12">
          <span className="inscription block mb-4">
            Gig Earnings · April 2026
          </span>
          <h1
            className="font-cinzel text-3xl sm:text-5xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
            }}
          >
            The Gig Earnings Guide: How 1099 Workers Track Pay, Mileage, and
            Taxes
          </h1>
          <div
            className="flex flex-wrap items-center gap-4 mb-6 text-xs"
            style={{
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.12em",
              color: "#5A5A5A",
            }}
          >
            <span>
              By <span style={{ color: "#D4A843" }}>UnifyOne Team</span>
            </span>
            <span style={{ color: "#242424" }}>·</span>
            <time dateTime="2026-04-24">April 24, 2026</time>
            <span style={{ color: "#242424" }}>·</span>
            <span>5 min read</span>
          </div>
          <p
            className="font-crimson text-xl sm:text-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            Most gig workers have no real idea what they make per hour after
            fuel, or how much they owe in taxes until it is too late. The
            workers who stay ahead have one thing in common: they treat their
            own numbers as something worth tracking, not something to guess at.
          </p>
          <div
            className="h-px mt-8"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </header>

        {/* Body */}
        <div
          className="font-crimson text-lg space-y-8"
          style={{ color: "#C0B090", lineHeight: 1.8 }}
        >
          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              What Gig Earnings Really Look Like in 2026
            </h2>
            <p>
              Gig work is not one paycheck. In 2026, a typical 1099 worker runs
              DoorDash, Uber Eats, Instacart, and Amazon Flex — sometimes in the
              same day — each with its own pay structure, its own zones, and its
              own payout schedule. Every one of those apps generates earnings,
              miles driven, and tips that all roll up into a single tax picture
              you alone are responsible for.
            </p>
            <p className="mt-4">
              Workers who treat each app as a separate world end up with four
              earnings screens, a banking app, and a notes file that never quite
              agree. The answer is one place that pulls all of it together — a
              single source of truth for what you earned, what you drove, and
              what you owe.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Five Things Every Gig Worker Should Track
            </h2>
            <p>
              Workers who actually know their numbers all track the same five
              things. Skip one and you usually find out at the worst possible
              time — when a tax bill lands, when fuel eats a shift you thought
              was good, or when you realize one app has been paying far less
              than you assumed.
            </p>
            <ul
              className="mt-4 space-y-3 pl-6"
              style={{ listStyleType: "none" }}
            >
              {[
                "Track 1 — Earnings per shift: What each shift actually paid, by platform, so you can compare DoorDash against Uber Eats on equal footing instead of by feel.",
                "Track 2 — Mileage: Every business mile you drive, logged as you go. This is the single biggest deduction most gig workers leave on the table.",
                "Track 3 — Fuel and expenses: Gas, tolls, phone, and supplies — the costs that quietly turn a $22/hr shift into a $15/hr one.",
                "Track 4 — Net pay per hour: Earnings minus fuel and wear, divided by hours. This is the only number that tells you whether a shift was worth it.",
                "Track 5 — Quarterly taxes: A running estimate of what you owe, updated as you earn, so April is never a surprise and you can set money aside in time.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    style={{
                      color: "#D4A843",
                      fontFamily: "Cinzel, serif",
                      fontSize: "0.7rem",
                      marginTop: "0.35rem",
                    }}
                  >
                    ✦
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Single-Platform Risk Most Workers Ignore
            </h2>
            <p>
              The most underappreciated risk in gig work is leaning on a single
              app. Workers who run 100% of their hours on one platform are one
              deactivation, one pay cut, or one slow week away from a complete
              income outage. Platforms change base pay, shift surge zones, and
              tighten batch access with little notice — and you have no say in
              any of it.
            </p>
            <p className="mt-4">
              The practical answer is spreading your hours across several apps —
              DoorDash, Uber Eats, Instacart, Amazon Flex — and tracking all of
              them in one place. UnifyOne pulls every platform you drive for
              into a single view, so when one app dries up you can see at a
              glance where the better hours are instead of scrambling.
            </p>
            <p className="mt-4">
              This is not just for full-timers. Anyone relying on gig income for
              real bills should treat a second platform as basic insurance, not
              an afterthought.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Your Data, Kept Private and All in One Place
            </h2>
            <p>
              When you let an app hold your earnings and tax data, the fair
              question is whether it stays yours. UnifyOne is built so that
              every worker&apos;s information lives in its own secure space.
              Your earnings, mileage, and tax figures are scoped to your account
              at the database level — no other worker on the platform can see or
              touch them.
            </p>
            <p className="mt-4">
              That same design is what lets you keep every platform you drive
              for under one login without the data getting tangled. DoorDash,
              Uber Eats, Instacart, Amazon Flex — each shows up as its own clean
              stream inside your account, with nothing bleeding between them.
            </p>
            <p className="mt-4">
              The result is one place that holds the whole picture while keeping
              your numbers private. You see everything you earn across every
              app; nobody else sees any of it.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Where AI Will Fit Into Your Gig Work
            </h2>
            <p>
              Tracking is the foundation; making sense of the data is the next
              layer. UnifyOne&apos;s AI tools are on the way, and when they ship
              they are designed to work on your own numbers, not generic advice.
              The areas with the clearest payoff for gig workers are narrow and
              specific:
            </p>
            <ul
              className="mt-4 space-y-3 pl-6"
              style={{ listStyleType: "none" }}
            >
              {[
                "Best-hours analysis: reading your real shift history to surface which platforms, zones, and times pay the most per hour after fuel — not just the highest gross.",
                "Net-pay comparisons: showing how DoorDash, Uber Eats, Instacart, and Amazon Flex actually stack up for you, side by side, on your own data.",
                "Smarter scheduling hints: pointing you toward the windows that have paid well historically and away from the ones that quietly lose money.",
                "Tax and deduction help: tying your logged mileage and expenses into a clearer quarterly estimate so nothing slips through the cracks.",
                "Plain-language insights: turning your numbers into a sentence you can act on, instead of a spreadsheet you have to decode.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    style={{
                      color: "#D4A843",
                      fontFamily: "Cinzel, serif",
                      fontSize: "0.7rem",
                      marginTop: "0.35rem",
                    }}
                  >
                    ✦
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              When these AI tools arrive, they are built to run on your own
              shift data — no export, no generic benchmarks. Until then, the
              earnings, mileage, and tax tracking underneath them is already
              doing real work for you today.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Cathedral Principle Applied to Your Earnings
            </h2>
            <p>
              1Commerce's operational philosophy — the Cathedral Principle —
              holds that the foundation comes before the flourish. Medieval
              cathedral builders did not start with the spire. They started with
              the foundation, the load-bearing walls, the vault geometry. The
              visible magnificence was the last thing added, not the first.
            </p>
            <p className="mt-4">
              For a gig worker, this means: before you chase a hot promo, before
              you drive across town for a surge that may vanish, before you take
              on a second job to cover a tax bill — make sure the basics are
              solid. Know your earnings, your mileage, and your real take-home
              per hour. Hours driven on guesswork generate income you cannot
              plan around and a tax bill you cannot see coming.
            </p>
            <p className="mt-4">
              The workers who build that foundation first — even when it means a
              minute of logging after each shift — are the ones who still have a
              clear picture a year later. The ones who drive on vibes are the
              ones scrambling every April.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              How to Evaluate a Gig Earnings Tracker
            </h2>
            <p>
              When picking a tool to run your gig finances on, five questions
              cut through the noise:
            </p>
            <ul
              className="mt-4 space-y-3 pl-6"
              style={{ listStyleType: "none" }}
            >
              {[
                "Can I export my full data — earnings, mileage, deductions — at any time, so my records are always mine?",
                "Does it cover every platform I drive for, or just one app at a time?",
                "Does it log mileage and keep a running tax estimate, or do I still have to do that math myself?",
                "Are smarter insights coming, and will they run on my own numbers rather than generic tips?",
                "Where does my data live, and is it kept private from other workers on the same platform?",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    style={{
                      color: "#D4A843",
                      fontFamily: "Cinzel, serif",
                      fontSize: "0.7rem",
                      marginTop: "0.35rem",
                    }}
                  >
                    ✦
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              UnifyOne answers all five: full data export whenever you want, one
              dashboard for every platform you drive for, automatic mileage
              logging with a running quarterly tax estimate, AI earnings tools
              that run on your own data as they ship, and per-worker data
              isolation at the database layer so your numbers stay yours.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Getting Started
            </h2>
            <p>
              UnifyOne's Gig Starter plan is free forever: shift-level earnings
              tracking, automatic mileage logging, and quarterly tax estimates
              across every platform you drive for. Gig Pro is $4.99/month (or
              $49 a year) and adds deeper earnings analytics, higher limits, and
              access to the AI insight tools as they roll out, with 250 AI
              requests a month.
            </p>
            <p className="mt-4">
              Knowing your numbers is not an expense. It is the foundation your
              income sits on. Build it right before the next tax season catches
              you out.
            </p>
          </section>

          {/* FAQ */}
          <section className="pt-4">
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-6"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: "Why should gig workers track their earnings and mileage?",
                  a: "Gig and 1099 workers are responsible for their own taxes and get no automatic mileage deduction. Tracking earnings at the shift level and logging every business mile shows your true pay per hour after fuel and protects thousands of dollars in deductions at tax time.",
                },
                {
                  q: "How does the mileage deduction work for gig workers?",
                  a: "Self-employed gig workers can deduct business miles using the IRS standard mileage rate, which is 72.5 cents per mile for 2026. UnifyOne applies that rate to your logged shifts and keeps a running year-to-date deduction figure, so your quarterly tax estimate stays accurate.",
                },
                {
                  q: "How does UnifyOne help gig workers?",
                  a: "UnifyOne tracks shift-level earnings across DoorDash, Uber Eats, Instacart, and Amazon Flex, logs mileage automatically, estimates quarterly taxes, and keeps each worker's data privately isolated. The Gig Starter plan is free, and Gig Pro is $4.99/month with AI earnings tools rolling out as they ship.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="stone-card p-6"
                  style={{ borderLeft: "2px solid rgba(212,168,67,0.3)" }}
                >
                  <h3
                    className="font-cinzel text-sm font-bold mb-3"
                    style={{ color: "#F0E8D0", letterSpacing: "0.08em" }}
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
          </section>
        </div>

        {/* CTA */}
        <div
          className="mt-16 pt-12"
          style={{ borderTop: "1px solid rgba(212,168,67,0.15)" }}
        >
          <span className="inscription block mb-4">Begin Construction</span>
          <h3
            className="font-cinzel text-2xl font-bold mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Ready to Know Exactly What You Make?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <span className="btn-illuminate inline-block cursor-pointer">
                Get Started Free
              </span>
            </Link>
            <Link href="/pricing">
              <span className="btn-ghost-gold inline-block cursor-pointer">
                View Pricing
              </span>
            </Link>
          </div>
        </div>

        {/* Related */}
        <div
          className="mt-16 pt-12"
          style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
        >
          <span className="inscription block mb-6">Further Reading</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/blog/multi-tenant-ecommerce-saas">
              <div className="stone-card p-6 cursor-pointer group">
                <span
                  className="inscription block mb-2"
                  style={{ color: "#3A3A3A" }}
                >
                  Architecture
                </span>
                <h4
                  className="font-cinzel text-sm font-600 group-hover:text-amber-400 transition-colors"
                  style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
                >
                  Why Multi-Tenant SaaS Is the Right Architecture for Commerce
                  Teams
                </h4>
              </div>
            </Link>
            <Link href="/blog/gig-economy-commerce-platform">
              <div className="stone-card p-6 cursor-pointer group">
                <span
                  className="inscription block mb-2"
                  style={{ color: "#3A3A3A" }}
                >
                  Gig Commerce
                </span>
                <h4
                  className="font-cinzel text-sm font-600 group-hover:text-amber-400 transition-colors"
                  style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
                >
                  How Gig Economy Workers Can Build a Commerce Platform That
                  Scales
                </h4>
              </div>
            </Link>
          </div>
        </div>
        {/* Back to Blog */}
        <div
          className="mt-12 pt-8"
          style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
        >
          <Link href="/blog">
            <span
              className="text-xs cursor-pointer hover:text-amber-400 transition-colors"
              style={{
                fontFamily: "Cinzel, serif",
                letterSpacing: "0.15em",
                color: "#5A5A5A",
              }}
            >
              ← Back to Blog
            </span>
          </Link>
        </div>
      </article>
    </div>
  );
}
