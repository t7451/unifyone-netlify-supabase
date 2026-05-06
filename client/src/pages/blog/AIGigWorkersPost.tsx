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

export default function AIGigWorkersPost() {
  const post = BLOG_POSTS.aiGigWorkers;
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
            The difference between a gig worker earning $18/hr and one earning
            $28/hr is not effort — it is information. Kai embedded inside
            UnifyOne closes that gap by turning your raw earnings data into
            specific, actionable decisions in real time.
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
              What Kai Actually Does Inside UnifyOne
            </h2>
            <p>
              Kai is not a generic chatbot bolted onto a dashboard. It is a
              context-aware intelligence layer that reads your actual
              operational data — your shift history, your earnings per platform,
              your mileage by zone, your YTD tax deduction accumulation — and
              generates insights specific to your numbers.
            </p>
            <p className="mt-4">
              When you open the Gig Command page, Kai has already read your last
              30 days of shifts. When you ask &quot;Where should I drive
              tonight?&quot;, it answers with your specific zone performance
              data, not a generic tip about surge pricing. When you ask
              &quot;How much can I deduct this year?&quot;, it calculates your
              exact IRS standard mileage deduction based on your logged miles.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Three AI Insight Surfaces in UnifyOne
            </h2>
            <p>
              Kai surfaces insights at three points in the UnifyOne dashboard,
              each with a different context:
            </p>
            <div className="mt-6 space-y-6">
              {[
                {
                  title: "Gig Command AI Panel",
                  desc: "Reads your platform, average $/hr, YTD miles, tax deduction, and current shift status. Generates route optimization recommendations, platform comparison analysis, and shift scheduling suggestions based on your historical peak performance windows.",
                },
                {
                  title: "Money Manager AI Panel",
                  desc: "Reads your earnings total, shift count, total hours, average $/hr, total miles, and YTD tax deduction. Generates tax strategy insights, earnings trend analysis, and platform diversification recommendations based on your financial data.",
                },
                {
                  title: "Full AI Assistant (/ai-assistant)",
                  desc: "A full conversational interface with persistent conversation history, 10 context modes (Dashboard, Gig Command, Money Manager, Challenges, etc.), and suggested prompts. Ask anything about your operation and get answers grounded in your actual data.",
                },
              ].map((item, i) => (
                <div key={i} className="stone-card p-6">
                  <h3
                    className="font-cinzel text-sm font-600 mb-3"
                    style={{ color: "#D4A843", letterSpacing: "0.1em" }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: "#9A9A9A" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Floating AI Widget: Always One Click Away
            </h2>
            <p>
              Every page in the UnifyOne dashboard has a floating Kai button in
              the bottom-right corner — a gold cross icon that expands into a
              full chat panel without leaving your current page. It
              automatically detects your current context (which page you are on)
              and pre-loads the relevant data before you type your first
              message.
            </p>
            <p className="mt-4">
              This is not a feature. It is an operational reflex. The AI is
              always present, always context-aware, and always one click from
              answering your next question.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Challenge Strategy: The Competitive Edge
            </h2>
            <p>
              UnifyOne&apos;s social challenge system lets gig operators compete
              on earnings, mileage, and shift metrics. Kai provides
              challenge-specific strategy: which challenge to enter based on
              your current performance trajectory, how many shifts you need to
              win, and what zone or platform to prioritize to close the gap on a
              leading competitor.
            </p>
            <p className="mt-4">
              This is AI applied to competitive intelligence within a peer group
              — a capability that did not exist for individual gig operators
              before UnifyOne.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Privacy and Data Ownership
            </h2>
            <p>
              Your earnings data never leaves UnifyOne&apos;s infrastructure.
              Kai processes your data server-side — your shift history, mileage,
              and earnings are never transmitted to a third-party AI provider in
              raw form. The AI receives only the structured context object
              (platform, avg $/hr, YTD miles, etc.) that you can see in the UI.
              You own your data. You control what the AI sees.
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
            Experience Kai Inside UnifyOne
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

        <RelatedPostsSection currentPost="aiGigWorkers" />
      </article>
    </div>
  );
}
