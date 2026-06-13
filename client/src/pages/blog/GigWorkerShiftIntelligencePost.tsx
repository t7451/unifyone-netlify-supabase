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

export default function GigWorkerShiftIntelligencePost() {
  const post = BLOG_POSTS.gigWorkerShiftIntelligence;
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
            If you drive for DoorDash, Uber Eats, or Instacart, you already know
            the feeling. You finish a long shift, check your payout, and think:
            that can't be right. The problem isn't motivation — it's
            information.
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
              The Real Problem: You're Earning Less Than You Think
            </h2>
            <p>
              The gig economy runs on guesswork. Most drivers and delivery
              workers operate without a clear picture of their real net earnings
              after fuel, mileage wear, and platform fees. They pick hours based
              on gut feeling and hope the math works out. It usually doesn't as
              well as they think.
            </p>
            <p>
              A January 2026 iHire survey of 2,250 U.S. workers found that
              unstable, unpredictable income was the single biggest reason
              people hesitated to commit to gig work full-time. But here's what
              that survey doesn't capture: a lot of that instability is
              self-inflicted — not because gig workers are making bad choices,
              but because they're making uninformed ones.
            </p>
            <p>
              Consider what most gig workers don't know about their own
              earnings:
            </p>
            <ul
              className="list-none space-y-2 pl-4"
              style={{ borderLeft: "2px solid rgba(212,168,67,0.2)" }}
            >
              <li>
                Which specific hours generate the highest net pay after gas and
                expenses
              </li>
              <li>
                How much their mileage is actually worth in IRS deductions (the
                current rate is 70 cents per mile)
              </li>
              <li>
                Whether platform A genuinely outperforms platform B, or just
                pays more gross while costing more to operate
              </li>
              <li>
                What their quarterly estimated tax bill will be before it's due
              </li>
            </ul>
            <p>
              The result: gig workers routinely work more hours than necessary
              because they can't identify which hours are actually productive.
              They miss thousands in IRS deductions. And they face tax penalties
              because quarterly estimates feel too complicated until they're
              overdue. This is the problem UnifyOne was built to eliminate.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              What UnifyOne Actually Does
            </h2>
            <p>
              UnifyOne is not a budgeting app or a mileage tracker bolted onto a
              spreadsheet. It's a full financial intelligence layer built
              specifically for the economics of gig work, powered by an AI
              called Kai that reads your real operational data and surfaces
              insights that would take hours to calculate manually.
            </p>
            <p>Here's how it works:</p>
            <ol
              className="list-decimal list-inside space-y-3 pl-2"
              style={{ color: "#C0B090" }}
            >
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Connect your platforms.
                </strong>{" "}
                Link your DoorDash, Uber Eats, Instacart, Stripe, PayPal, or
                Square accounts in minutes. No developer required.
              </li>
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Kai reads your actual numbers.
                </strong>{" "}
                Not industry benchmarks — your specific shift history, your
                mileage, your platform payouts, your expenses.
              </li>
              <li>
                <strong style={{ color: "#D4A843" }}>
                  You get actionable intelligence.
                </strong>{" "}
                Which hours and zones generate the highest net pay after fuel.
                What your YTD deductions look like in real time. What your
                quarterly tax estimate is right now.
              </li>
            </ol>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              GigIQ: Your Shift Intelligence Module
            </h2>
            <p>
              The core feature most gig workers care about immediately is GigIQ,
              UnifyOne's shift intelligence module. It answers the question
              every driver asks but can never actually answer with confidence:
              when should I be working, and where?
            </p>
            <p>
              GigIQ analyzes your historical shift data and identifies the
              specific time windows and delivery zones that generate the highest
              dollars per hour after expenses. Not before expenses — after. That
              distinction matters enormously when fuel costs can swing your
              effective hourly rate by $4 to $7 depending on the shift.
            </p>
            <p>
              If Friday evenings in a specific zone consistently outperform
              Saturday mornings by 23%, GigIQ surfaces that pattern. Without
              software reading hundreds of your past shifts simultaneously,
              you'd never catch it.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Automatic IRS Mileage Tracking
            </h2>
            <p>
              Every mile you drive for work is a deduction. At the current IRS
              standard mileage rate, that adds up fast. UnifyOne auto-captures
              mileage from every logged shift and maintains a real-time
              year-to-date deduction figure. No manual logging. No
              reconstructing trips from memory at tax time.
            </p>
            <p>
              Most gig workers who start using UnifyOne discover they were
              leaving $800–$2,400 in annual deductions uncaptured — not from
              fraud, but from friction. When logging is automatic, every mile
              gets recorded.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Quarterly Tax Forecasting
            </h2>
            <p>
              Gig workers are responsible for their own estimated taxes, due
              four times per year. Miss a payment or underpay, and the IRS
              charges a penalty on top of what you owe. UnifyOne tracks your
              income across all connected platforms and generates quarterly
              estimate alerts before the deadlines hit — so you're never caught
              off guard.
            </p>
            <p>
              The Money Manager module always knows your current tax position.
              You can ask Kai a question and get an answer grounded in your
              actual income, not a generic estimate based on what someone else
              earns.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Why Generic Financial Apps Don't Cut It
            </h2>
            <p>
              Most personal finance tools were built for people with a salary.
              They assume your income arrives on a predictable schedule and that
              tax time means uploading a W-2. Gig work breaks every one of those
              assumptions.
            </p>
            <p>
              The tools that exist for gig workers tend to solve one piece of
              the puzzle. A mileage tracker here. A tax estimator there. A
              separate dashboard for each platform. You end up spending more
              time managing your tools than actually understanding your
              finances.
            </p>
            <p>
              UnifyOne consolidates all of it. One connection, one dashboard,
              one AI — Kai — that understands the full picture of your gig
              income. Kai doesn't see your DoorDash earnings in isolation. It
              sees your total earnings across every platform, your total
              mileage, your total deductible expenses, and your real net income
              after everything.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Intelligence Matrix: What Kai Knows About Your Money
            </h2>
            <p>
              Kai is context-aware in a way generic chatbots aren't. It operates
              with full visibility into your actual work data, and the
              intelligence it surfaces changes depending on where you are in the
              platform:
            </p>
            <ul
              className="list-none space-y-4 pl-4"
              style={{ borderLeft: "2px solid rgba(212,168,67,0.2)" }}
            >
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Route Intelligence.
                </strong>{" "}
                Kai analyzes your historical mileage and earnings per platform
                to surface the specific routes and time windows with the highest
                dollars per hour after expenses.
              </li>
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Earnings Illumination.
                </strong>{" "}
                Every session, Kai updates your YTD earnings projection, tax
                deduction total, and cross-platform performance comparison.
              </li>
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Challenge Strategy.
                </strong>{" "}
                For platforms that run earnings challenges (like DoorDash's
                streak bonuses), Kai monitors your active challenges and
                suggests the most efficient completion paths.
              </li>
              <li>
                <strong style={{ color: "#D4A843" }}>
                  Tax Position Awareness.
                </strong>{" "}
                The Money Manager module always knows your current tax position,
                grounded in your actual income — not a generic estimate.
              </li>
            </ul>
            <p>
              Most financial tools show you what happened. UnifyOne tells you
              what to do next.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Who UnifyOne Is Built For
            </h2>
            <p>UnifyOne is the right tool if any of these describe you:</p>
            <ul
              className="list-none space-y-2 pl-4"
              style={{ borderLeft: "2px solid rgba(212,168,67,0.2)" }}
            >
              <li>
                You drive for DoorDash, Uber Eats, Instacart, or any delivery
                platform and you're not sure which one actually pays better
                after expenses
              </li>
              <li>
                You work multiple gig platforms simultaneously and have no
                unified view of your total earnings
              </li>
              <li>
                You've missed or underpaid quarterly estimated taxes before
              </li>
              <li>
                You know you're leaving IRS mileage deductions on the table but
                don't have a system to capture them
              </li>
              <li>
                You want to work smarter, not just longer, and need data to back
                that up
              </li>
            </ul>
            <p>
              A 2026 study examining gig worker data-sharing found that
              individual financial tracking enabled workers to reflect on and
              plan their work more effectively, directly improving earnings
              outcomes. The workers who tracked their data made better
              scheduling decisions. UnifyOne removes the manual work from that
              tracking entirely.
            </p>
          </section>

          <section
            className="rounded-xl p-8 mt-12"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.03))",
              border: "1px solid rgba(212,168,67,0.15)",
            }}
          >
            <h2
              className="font-cinzel text-xl font-bold mb-3"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Start Knowing What You Actually Earn
            </h2>
            <p className="mb-6" style={{ color: "#9A9A9A" }}>
              You're already putting in the hours. The question is whether
              you're putting them in the right places, at the right times, on
              the right platforms. Connect your platforms, let Kai read your
              numbers, and find out what you're actually earning versus what you
              could be earning.
            </p>
            <a
              href="/register"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "#D4A843",
                color: "#020202",
                fontFamily: "Cinzel, serif",
                letterSpacing: "0.1em",
              }}
            >
              Connect Your Platforms →
            </a>
          </section>
        </div>

        <RelatedPostsSection currentPost="gigWorkerShiftIntelligence" />
      </article>
    </div>
  );
}
