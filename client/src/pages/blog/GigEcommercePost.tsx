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
            For millions of 1099 workers on DoorDash, Uber Eats, Instacart, and
            Amazon Flex, gig work is the primary paycheck — not a side hustle.
            The system you use to track earnings, mileage, and quarterly taxes
            decides whether you stay at the mercy of platform algorithms or
            finally see exactly where your money goes.
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
              Every gig worker faces the same structural vulnerability: your
              earnings are entirely subject to platform decisions you cannot
              influence. DoorDash adjusts base pay. Uber Eats changes surge
              zones. Instacart modifies batch prioritization. You have no data
              portability and no clear picture of what you actually take home
              after fuel and wear on your car.
            </p>
            <p className="mt-4">
              The workers who escape this trap are not the ones who simply log
              more hours. They are the ones who keep records around their gig
              activity — tracking earnings at the shift level, capturing mileage
              and tax deductions, and using that data to decide which platforms,
              zones, and hours are actually worth their time.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              One Place for Every Platform You Drive For
            </h2>
            <p>
              Most gig workers don&apos;t stick to one app. You might run
              DoorDash in the morning, Uber Eats in the afternoon, and Amazon
              Flex on weekends — each with different pay rates, different
              geographic performance, and different tax implications. Keeping
              that straight across four apps and a notes file is how money slips
              through the cracks.
            </p>
            <p className="mt-4">
              UnifyOne lets you track every platform you drive for in a single
              dashboard. You see earnings by platform, mileage by platform, and
              net take-home by platform — all in one place, without
              spreadsheets, so you know which app is genuinely paying and which
              one is just keeping you busy.
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
              philosophy: build a solid foundation before scaling activity. For
              gig workers, this means:
            </p>
            <ul
              className="mt-4 space-y-3 pl-6"
              style={{ listStyleType: "none" }}
            >
              {[
                "Phase 1 — Track it: Log every shift, every mile, and every platform payout in one structured place instead of guessing at month end.",
                "Phase 2 — Read it: Identify your highest-earning platform, zone, and time window from your real history, not your gut feeling.",
                "Phase 3 — Adjust: Lean into the hours and zones that actually pay, and skip the low-take-home batches that just burn fuel.",
                "Phase 4 — Stay ready for taxes: Let your mileage and deductions accumulate as you drive, so quarterly estimates aren't a panic.",
                "Phase 5 — Compound: Use a clean record of what you earn and what you keep to make bigger decisions about your work and your money.",
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
              Where AI Insights Fit In
            </h2>
            <p>
              Tracking your shifts is the foundation. The next layer is making
              sense of that data for you — and that is exactly where
              UnifyOne&apos;s AI tools are headed. When they ship, they&apos;re
              designed to read your own shift history rather than hand out
              generic advice: your earnings per hour by platform, your mileage
              by zone, your deduction total as it builds.
            </p>
            <p className="mt-4">
              The goal is plain-language insight built on your numbers — for
              example:{" "}
              <em style={{ color: "#D4A843" }}>
                &quot;Your Tuesday evening shifts in Zone 4 average $24.80/hr
                versus $18.20/hr in Zone 2. Shifting 2 hours a week to Zone 4
                would add roughly $340/month to your take-home.&quot;
              </em>{" "}
              That is not a generic tip; it is a read on your specific week.
              Even before those AI tools arrive, the shift, mileage, and tax
              tracking are working for you today.
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
              The average gig worker leaves $2,000–$4,000 in deductions on the
              table every year because they do not track mileage and expenses
              consistently. UnifyOne&apos;s Money Manager applies the IRS
              standard mileage deduction (72.5 cents per mile for 2026) to your
              logged shifts, giving you a running year-to-date deduction figure
              that updates with every shift you enter — and a clearer quarterly
              tax estimate along the way.
            </p>
            <p className="mt-4">
              At tax time, you export a structured report — no shoebox of
              receipts, no manual math. The tracking does the work.
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
              UnifyOne&apos;s Gig Starter plan is free forever — shift tracking,
              automatic mileage logging, and quarterly tax estimates for every
              platform you drive for. Gig Pro is $4.99/month (or $49/year) and
              adds deeper earnings analytics, higher limits, and access to the
              AI insight tools as they roll out, with 250 AI requests a month.
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
            Ready to Track Every Shift, Mile, and Dollar?
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

        <RelatedPostsSection currentPost="gigEcommerce" />
      </article>
    </div>
  );
}
