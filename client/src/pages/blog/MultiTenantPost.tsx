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
            Single-tenant deployments made sense when infrastructure was
            expensive and teams were small. In 2026, they are an operational
            liability. Here is why multi-tenant architecture is the only
            rational choice for commerce teams managing more than one brand,
            client, or channel.
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
              The Single-Tenant Tax
            </h2>
            <p>
              Every commerce agency, franchise operator, or holding company that
              runs separate deployments per client or brand is paying what we
              call the single-tenant tax: duplicated infrastructure costs,
              duplicated maintenance overhead, and duplicated onboarding time
              for every new account. At two clients, it is manageable. At ten,
              it is a full-time job. At fifty, it is a structural failure mode.
            </p>
            <p className="mt-4">
              The single-tenant tax compounds invisibly. Each deployment has its
              own database, its own update cycle, its own incident surface. When
              a security patch drops, you apply it fifty times. When a feature
              ships, you deploy it fifty times. The operational drag is not
              linear — it is exponential.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              What Tenant Isolation Actually Means
            </h2>
            <p>
              The objection to multi-tenant architecture is always data
              isolation: &quot;What if one client&apos;s data bleeds into
              another?&quot; This is a legitimate concern in poorly designed
              systems. In a properly architected multi-tenant platform, tenant
              isolation is enforced at the database row level — every query is
              scoped to a tenant ID, and no query can return data outside its
              tenant boundary.
            </p>
            <p className="mt-4">
              UnifyOne enforces tenant isolation at three layers: the database
              (row-level security), the API (tenant context injected into every
              request via JWT), and the UI (tenant switcher with hard session
              boundaries). A tenant cannot see, modify, or infer data from
              another tenant under any code path.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Economics of Multi-Tenancy
            </h2>
            <p>
              The economic argument for multi-tenant SaaS is straightforward. A
              single infrastructure deployment serves N tenants at a marginal
              cost approaching zero per additional tenant. Your fixed costs
              (server, database, CDN, monitoring) are amortized across the
              entire tenant base. As you add clients, your cost per client drops
              — your margin expands without headcount growth.
            </p>
            <p className="mt-4">
              For agencies, this is the difference between a services business
              (linear revenue, linear cost) and a product business (exponential
              revenue, flat cost). UnifyOne&apos;s Scale tier at $99/month
              supports unlimited tenants. A ten-client agency paying $99/month
              in infrastructure costs while billing each client $500/month is
              running an exceptional gross margin infrastructure layer.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              White-Label: The Reseller Multiplier
            </h2>
            <p>
              Multi-tenant architecture enables white-labeling at zero marginal
              cost. UnifyOne&apos;s Scale tier includes custom domain support
              and full brand customization per tenant. An agency can deploy
              UnifyOne under their own brand — &quot;PoweredBy YourAgency
              Commerce&quot; — and resell it to clients as a proprietary
              product. The underlying infrastructure is UnifyOne; the brand
              experience is entirely theirs.
            </p>
            <p className="mt-4">
              This is the reseller multiplier: you buy infrastructure at
              $99/month and sell it as a branded product at $500/month per
              client. The margin is the brand. The brand is built on someone
              else&apos;s infrastructure. This is how software companies are
              built without engineering teams.
            </p>
          </section>

          <section>
            <h2
              className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
              style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
            >
              The Cathedral Framework for Multi-Tenant Deployment
            </h2>
            <p>
              The Cathedral Framework prescribes a specific sequence for
              multi-tenant deployment: start with one tenant, instrument it
              fully, prove the data model, then expand. Do not add a second
              tenant until the first is generating clean, reliable data. Do not
              add a third until the second is stable. The architecture scales
              horizontally — but only if the foundation is solid.
            </p>
            <p className="mt-4">
              UnifyOne&apos;s onboarding flow enforces this sequence. Your first
              tenant is your proof of concept. The platform guides you through
              integration, data validation, and baseline analytics before
              unlocking multi-tenant features. This is not a limitation — it is
              quality control built into the product.
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
            Build Your Multi-Tenant Commerce Infrastructure
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <span className="btn-illuminate inline-block cursor-pointer">
                Start Free Trial
              </span>
            </Link>
            <Link href="/#pricing">
              <span className="btn-ghost-gold inline-block cursor-pointer">
                View Tiers
              </span>
            </Link>
          </div>
        </div>

        <RelatedPostsSection currentPost="multiTenant" />
      </article>
    </div>
  );
}
