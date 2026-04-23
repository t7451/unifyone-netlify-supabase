/**
 * DynamicBlogPost.tsx
 *
 * Dynamic blog post reader for AI-generated SEO content stored in the DB.
 * Serves published posts from the `seo_content_jobs` table at /blog/:slug.
 *
 * Static legacy blog posts (GigEcommercePost, MultiTenantPost, AIGigWorkersPost)
 * continue to use their own routes and components — those are unaffected.
 */
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { trpc } from "@/lib/trpc";
import { SITE_URL } from "@/lib/siteConfig";
import NotFound from "../NotFound";

const OG_IMAGE = "/og-image.png";

function buildJsonLd(
  slug: string,
  title: string,
  description: string,
  h1: string,
  publishedAt: Date | null | undefined,
  faq: Array<{ q: string; a: string }>
) {
  const canonical = `${SITE_URL}/blog/${slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
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
      datePublished: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      dateModified: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: h1, item: canonical },
      ],
    },
    ...(faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(item => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ]
      : []),
  ];
}

export default function DynamicBlogPost() {
  const [, params] = useRoute<{ slug: string }>("/blog/:slug");
  const slug = params?.slug ?? "";

  const { data: post, isLoading, error } = trpc.seo.getPublished.useQuery(
    { slug },
    { enabled: Boolean(slug), staleTime: 1000 * 60 * 5 }
  );

  if (isLoading) {
    return (
      <div
        style={{ backgroundColor: "#020202", color: "#F0E8D0", minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <span className="inscription" style={{ color: "#3A3A3A" }}>
          Loading…
        </span>
      </div>
    );
  }

  if (error || !post) return <NotFound />;

  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const sections = (post.sections as Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }> | null) ?? [];
  const faq = (post.faq as Array<{ q: string; a: string }> | null) ?? [];
  const keywords = (post.keywords as string[] | null) ?? [];
  const related = (post.related as string[] | null) ?? [];

  const jsonLd = buildJsonLd(
    post.slug,
    post.title ?? "",
    post.description ?? "",
    post.h1 ?? "",
    post.publishedAt,
    faq
  );

  const publishedDateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div
      style={{ backgroundColor: "#020202", color: "#F0E8D0", minHeight: "100vh" }}
    >
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.description ?? ""} />
        {keywords.length > 0 && (
          <meta name="keywords" content={keywords.join(", ")} />
        )}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={post.title ?? ""} />
        <meta property="og:description" content={post.description ?? ""} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:site_name" content="UnifyOne by 1Commerce" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title ?? ""} />
        <meta name="twitter:description" content={post.description ?? ""} />
        <meta name="twitter:image" content={OG_IMAGE} />
        {jsonLd.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>

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

      <article className="max-w-4xl mx-auto px-6 sm:px-8 pt-28 pb-24">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-8">
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
                <span className="cursor-pointer hover:text-amber-500 transition-colors">
                  Blog
                </span>
              </Link>
            </li>
            <li style={{ color: "#242424" }}>›</li>
            <li style={{ color: "#D4A843" }}>{post.h1}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-12">
          {publishedDateStr && (
            <span className="inscription block mb-4">
              UnifyOne · 1Commerce LLC{" "}
              {publishedDateStr ? `· ${publishedDateStr}` : ""}
            </span>
          )}
          <h1
            className="font-cinzel text-3xl sm:text-5xl font-black mb-6"
            style={{ color: "#F0E8D0", lineHeight: 1.1, letterSpacing: "0.01em" }}
          >
            {post.h1}
          </h1>
          {post.tagline && (
            <p
              className="font-crimson text-xl sm:text-2xl"
              style={{
                color: "#9A9A9A",
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              {post.tagline}
            </p>
          )}
          <div
            className="h-px mt-8"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </header>

        {/* Body */}
        <div
          className="font-crimson text-lg space-y-10"
          style={{ color: "#C0B090", lineHeight: 1.8 }}
        >
          {sections.map((section, idx) => (
            <section key={idx}>
              <h2
                className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
                style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
              >
                {section.heading}
              </h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? undefined : "mt-4"}>
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-3 pl-6" style={{ listStyleType: "none" }}>
                  {section.bullets.map((b, i) => (
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
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* FAQ */}
          {faq.length > 0 && (
            <section>
              <h2
                className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
                style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
              >
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faq.map((item, i) => (
                  <div key={i}>
                    <h3
                      className="font-cinzel text-base font-semibold mb-2"
                      style={{ color: "#F0E8D0" }}
                    >
                      {item.q}
                    </h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
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
            Start with UnifyOne by 1Commerce LLC
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <span className="btn-illuminate inline-block cursor-pointer">
                Start Free Trial
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
        {related.length > 0 && (
          <div
            className="mt-16 pt-12"
            style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
          >
            <span className="inscription block mb-6">Related Guides</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {related.map(r => (
                <Link key={r} href={`/blog/${r}`}>
                  <div className="stone-card p-6 cursor-pointer group">
                    <span
                      className="inscription block mb-2"
                      style={{ color: "#3A3A3A" }}
                    >
                      Related Post
                    </span>
                    <h4
                      className="font-cinzel text-sm font-600 group-hover:text-amber-400 transition-colors"
                      style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
                    >
                      {r}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
