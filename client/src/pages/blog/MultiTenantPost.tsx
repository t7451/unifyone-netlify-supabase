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

export default function MultiTenantPost() {
  const post = BLOG_POSTS.multiTenant;
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
            Most gig workers juggle several apps and a stack of spreadsheets to
            keep their earnings straight. You may never think about the
            architecture underneath your tools — but for UnifyOne it is the
            whole point. Multi-tenant, secure-by-design infrastructure is what
            keeps your earnings, mileage, and tax data private, organized, and
            yours.
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
              The Scattered-Data Tax
            </h2>
            <p>
              Every gig worker who tracks earnings across four apps, a banking
              app, and two spreadsheets is paying what we call the
              scattered-data tax: numbers that never quite reconcile, mileage
              you forgot to log, and a quarterly tax estimate you can only guess
              at. With one platform it is annoying. With four, it is hours of
              your week. At tax time, it is real money left on the table.
            </p>
            <p className="mt-4">
              That tax compounds invisibly. Each app shows you its own slice and
              none of them show you the whole picture — what you actually
              earned, what you actually drove, and what you can actually deduct.
              The answer is not more spreadsheets. It is one place that holds
              all of it and keeps it straight for you.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              What Keeping Your Data Yours Actually Means
            </h2>
            <p>
              The fair question about any platform that holds your money data
              is: &quot;Could someone else ever see my earnings?&quot; In a
              poorly built system, that is a real risk. In a properly
              architected multi-tenant platform, isolation is enforced at the
              database row level — every query is scoped to your account, and no
              query can return data outside your boundary.
            </p>
            <p className="mt-4">
              UnifyOne enforces that isolation at three layers: the database
              (row-level security), the API (your account context injected into
              every request via JWT), and the UI (hard session boundaries). No
              other worker on the platform can see, modify, or infer your
              earnings, mileage, or tax data under any code path. Your numbers
              are yours.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              Why This Lets Us Keep It Cheap
            </h2>
            <p>
              Here is the part that matters to your wallet. Because every worker
              shares the same well-built platform instead of a private, one-off
              deployment, the cost of serving one more person is close to zero.
              The fixed costs — servers, database, security, monitoring — are
              spread across everyone who uses UnifyOne, not billed to you alone.
            </p>
            <p className="mt-4">
              That is precisely why a tool this capable can start at free and
              top out at $4.99/month. You are not paying for a custom server
              that sits idle between your shifts. You are paying a few dollars
              for a share of infrastructure that thousands of gig workers keep
              running together — the same model that lets big consumer apps
              charge so little for so much.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              One Login for Every Platform You Drive For
            </h2>
            <p>
              Because each worker&apos;s data lives in its own secure space, the
              same architecture lets you keep every platform you drive for under
              one roof. DoorDash, Uber Eats, Instacart, Amazon Flex — each one
              shows up as its own clean stream of earnings and mileage inside a
              single account, with nothing bleeding between them.
            </p>
            <p className="mt-4">
              That means one login instead of four, one running tax estimate
              instead of a guess, and one honest answer to the question that
              actually matters: across everything you do, what are you really
              making per hour after fuel? The architecture is invisible. The
              clarity it gives you is not.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Cathedral Framework for Getting Set Up
            </h2>
            <p>
              The Cathedral Framework prescribes a simple sequence: start with
              one platform, track it fully, trust the numbers, then add the
              rest. Connect the app you drive for most and log a few shifts
              until the earnings and mileage look right. Then bring in your
              second platform, and your third. Solid foundation first, breadth
              second.
            </p>
            <p className="mt-4">
              UnifyOne&apos;s setup follows the same order. Your first platform
              is your proof that the tracking matches reality — once your
              earnings, mileage, and tax estimate line up with what you actually
              took home, adding the next platform is a couple of taps. It is not
              a limitation; it is how you end up trusting the numbers you base
              real decisions on.
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
            Put Every Platform You Drive For in One Place
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <span className="btn-illuminate inline-block cursor-pointer">
                Get Started Free
              </span>
            </Link>
            <Link href="/#pricing">
              <span className="btn-ghost-gold inline-block cursor-pointer">
                View Pricing
              </span>
            </Link>
          </div>
        </div>

        <RelatedPostsSection currentPost="multiTenant" />
      </article>
    </div>
  );
}
