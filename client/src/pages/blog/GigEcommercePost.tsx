import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import {
  BLOG_POSTS,
  BlogBackLink,
  RelatedPostsSection,
  buildArticleJsonLd,
  buildArticleMeta,
  formatBlogDate,
  getReadingTimeText,
} from "./blogPostShared";

export default function GigEcommercePost() {
  const post = BLOG_POSTS.gigEcommerce;
  const publishedDate = formatBlogDate(post.publishedAt);
  const readingTime = getReadingTimeText(post.wordCount);

  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <PageHead
        title={post.title}
        description={post.description}
        canonical={post.canonical}
        ogImage={post.ogImage}
        ogType="article"
        meta={buildArticleMeta(post)}
        jsonLd={buildArticleJsonLd(post)}
      />

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

      <article className="max-w-4xl mx-auto px-6 sm:px-8 pt-28 pb-24">
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
            <li style={{ color: "#D4A843" }}>{post.breadcrumbName}</li>
          </ol>
        </nav>

        <BlogBackLink className="mb-8" />

        <header className="mb-12">
          <span className="inscription block mb-4">
            {post.category} · {publishedDate}
          </span>
          <h1
            className="font-cinzel text-3xl sm:text-5xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
            }}
          >
            {post.headline}
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
              By <span style={{ color: "#D4A843" }}>{post.author}</span>
            </span>
            <span style={{ color: "#242424" }}>·</span>
            <time dateTime={post.publishedAt}>{publishedDate}</time>
            <span style={{ color: "#242424" }}>·</span>
            <span>{readingTime}</span>
          </div>
          <p
            className="font-crimson text-xl sm:text-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            The gig economy is not a side hustle. For millions of operators on
            DoorDash, Uber Eats, Instacart, and Amazon Flex, it is the primary
            revenue engine. The infrastructure you run it on determines whether
            you stay at the mercy of platform algorithms — or build something
            that compounds.
          </p>
          <div
            className="h-px mt-8"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </header>

        <div
          className="font-crimson text-lg space-y-8"
          style={{ color: "#C0B090", lineHeight: 1.8 }}
        >
          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Platform Dependency Problem
            </h2>
            <p>
              Every gig operator faces the same structural vulnerability: your
              earnings are entirely subject to platform decisions you cannot
              influence. DoorDash adjusts base pay. Uber Eats changes surge
              zones. Instacart modifies batch prioritization. You have no data
              portability, no customer relationship, and no compounding asset.
            </p>
            <p className="mt-4">
              The operators who escape this trap are not the ones who work more
              hours. They are the ones who build infrastructure around their gig
              activity — tracking earnings at the shift level, automating tax
              deduction capture, and using that data to make strategic decisions
              about which platforms and zones to prioritize.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              What Multi-Tenant Commerce Infrastructure Means for Gig Operators
            </h2>
            <p>
              Multi-tenant commerce is not just for agencies and franchises. For
              a gig operator running multiple platforms simultaneously —
              DoorDash in the morning, Uber Eats in the afternoon, Amazon Flex
              on weekends — each platform is effectively a tenant. Each has
              different earnings rates, different geographic performance, and
              different tax implications.
            </p>
            <p className="mt-4">
              A multi-tenant commerce platform like UnifyOne lets you treat each
              platform as an isolated business unit within a single dashboard.
              You see earnings per tenant (platform), orders per tenant, mileage
              per tenant, and net margin per tenant — all in one place, without
              spreadsheets.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Cathedral Framework Applied to Gig Commerce
            </h2>
            <p>
              The Cathedral Framework is 1Commerce&apos;s operational
              philosophy: build foundational infrastructure before scaling
              activity. For gig operators, this means:
            </p>
            <ul
              className="mt-4 space-y-3 pl-6"
              style={{ listStyleType: "none" }}
            >
              {[
                "Phase 1 — Instrumentation: Track every shift, every mile, every platform payout in a structured system.",
                "Phase 2 — Analysis: Identify your highest-earning platform, zone, and time window using real data.",
                "Phase 3 — Optimization: Use AI insights (Kai) to route toward high-value zones and avoid low-margin batches.",
                "Phase 4 — Expansion: Once your primary platform is optimized, add a second tenant and apply the same framework.",
                "Phase 5 — Compounding: Use your earnings data to build a product or service business alongside your gig activity.",
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
              How Kai Changes the Equation
            </h2>
            <p>
              Kai is embedded directly into UnifyOne&apos;s Gig Command and
              Money Manager modules. It does not give generic advice. It reads
              your actual shift data — your earnings per hour by platform, your
              mileage by zone, your tax deduction accumulation — and generates
              specific, actionable recommendations.
            </p>
            <p className="mt-4">
              A typical Kai insight for a DoorDash operator might read:{" "}
              <em style={{ color: "#D4A843" }}>
                &quot;Your Tuesday evening shifts in Zone 4 average $24.80/hr
                versus $18.20/hr in Zone 2. Shifting 2 hours per week to Zone 4
                would add approximately $340/month to your net earnings.&quot;
              </em>{" "}
              That is not a generic tip. That is infrastructure-grade
              intelligence applied to your specific operation.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Tax Automation: The Hidden Multiplier
            </h2>
            <p>
              The average gig operator leaves $2,000–$4,000 in deductions on the
              table annually because they do not track mileage and expenses
              systematically. UnifyOne&apos;s Money Manager automatically
              calculates your IRS standard mileage deduction ($0.67/mile in
              2024) against your logged shifts, giving you a real-time YTD
              deduction figure that updates with every shift entry.
            </p>
            <p className="mt-4">
              At tax time, you export a structured report — no shoebox of
              receipts, no manual calculation. The infrastructure does the work.
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
              UnifyOne&apos;s Starter tier is free — one tenant, core commerce
              tools, and access to the Gig Command shift tracker. The Pro tier
              ($19/month) unlocks Kai AI insights, advanced analytics, the
              automation layer, and up to five tenants. The Scale tier
              ($99/month) is for operators running a full commerce operation
              with white-label requirements.
            </p>
            <p className="mt-4">
              The first stone is free. The cathedral is built one phase at a
              time.
            </p>
          </section>
        </div>

        <div
          className="mt-16 pt-12"
          style={{ borderTop: "1px solid rgba(212,168,67,0.15)" }}
        >
          <span className="inscription block mb-4">Begin Construction</span>
          <h3
            className="font-cinzel text-2xl font-bold mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Ready to Build Your Commerce Infrastructure?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <span className="btn-illuminate inline-block cursor-pointer">
                Start Free Trial
              </span>
            </Link>
            <Link href="/ai-assistant">
              <span className="btn-ghost-gold inline-block cursor-pointer">
                Explore Kai AI
              </span>
            </Link>
          </div>
        </div>

        <RelatedPostsSection currentPost="gigEcommerce" />
      </article>
    </div>
  );
}
