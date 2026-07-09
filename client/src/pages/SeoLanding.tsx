import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/siteConfig";
import { getSeoPage, SEO_PAGES, type SeoPage } from "@/content/seoPages";
import NotFound from "./NotFound";

const OG_IMAGE = "/og-image.png";

function buildJsonLd(page: SeoPage, canonical: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: canonical,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "UnifyOne by 1Commerce",
        url: `${SITE_URL}/`,
      },
      about: {
        "@type": "SoftwareApplication",
        name: "UnifyOne",
        alternateName: [
          "UnifOne",
          "1Commerce",
          "1-Commerce",
          "1Commerce LLC",
          "OneCommerce",
          "OneCommerc",
          "UnifyOne Solutions",
          "PNW Enterprises",
        ],
        applicationCategory: "BusinessApplication",
      },
      publisher: {
        "@type": "Organization",
        name: "1Commerce LLC",
        alternateName: ["PNW Enterprises", "1Commerce Solutions"],
        url: SITE_URL,
      },
      keywords: page.keywords.join(", "),
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
          name: "SEO",
          item: `${SITE_URL}/seo`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.h1,
          item: canonical,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map(item => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}

export default function SeoLanding() {
  const [, params] = useRoute<{ slug: string }>("/seo/:slug");
  const slug = params?.slug ?? "";
  const page = useMemo(() => getSeoPage(slug), [slug]);

  if (!page) return <NotFound />;

  const canonical = `${SITE_URL}/seo/${page.slug}`;
  const jsonLd = buildJsonLd(page, canonical);
  const related = (page.related ?? [])
    .map(s => getSeoPage(s))
    .filter((p): p is SeoPage => Boolean(p));

  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <meta name="keywords" content={page.keywords.join(", ")} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:site_name" content="UnifyOne by 1Commerce" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
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
          <Link href="/seo">
            <span
              className="inscription cursor-pointer"
              style={{ color: "#5A5A5A" }}
            >
              All Guides
            </span>
          </Link>
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
              <Link href="/seo">
                <span className="cursor-pointer hover:text-amber-500 transition-colors">
                  SEO
                </span>
              </Link>
            </li>
            <li style={{ color: "#242424" }}>›</li>
            <li style={{ color: "#D4A843" }}>{page.h1}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <span className="inscription block mb-4">
            UnifyOne · 1Commerce LLC · PNW Enterprises
          </span>
          <h1
            className="font-cinzel text-3xl sm:text-5xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
            }}
          >
            {page.h1}
          </h1>
          <p
            className="font-crimson text-xl sm:text-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            {page.tagline}
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
          className="font-crimson text-lg space-y-10"
          style={{ color: "#C0B090", lineHeight: 1.8 }}
        >
          {page.sections.map((section, idx) => (
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
                <ul
                  className="mt-4 space-y-3 pl-6"
                  style={{ listStyleType: "none" }}
                >
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
          {page.faq.length > 0 && (
            <section>
              <h2
                className="font-cinzel text-xl sm:text-2xl font-bold mb-4"
                style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
              >
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {page.faq.map((item, i) => (
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
          <span className="inscription block mb-4">Get started</span>
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
                <Link key={r.slug} href={`/seo/${r.slug}`}>
                  <div className="stone-card p-6 cursor-pointer group">
                    <span
                      className="inscription block mb-2"
                      style={{ color: "#3A3A3A" }}
                    >
                      UnifyOne Guide
                    </span>
                    <h4
                      className="font-cinzel text-sm font-600 group-hover:text-amber-400 transition-colors"
                      style={{ color: "#F0E8D0", letterSpacing: "0.05em" }}
                    >
                      {r.h1}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Full index for internal linking */}
        <div
          className="mt-16 pt-12"
          style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
        >
          <span className="inscription block mb-6">All UnifyOne Guides</span>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {SEO_PAGES.map(p => (
              <li key={p.slug}>
                <Link href={`/seo/${p.slug}`}>
                  <span
                    className="cursor-pointer hover:text-amber-400 transition-colors"
                    style={{ color: "#9A9A9A" }}
                  >
                    {p.h1}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
