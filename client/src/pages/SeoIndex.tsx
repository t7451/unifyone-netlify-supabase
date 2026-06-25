import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/siteConfig";
import { SEO_PAGES } from "@/content/seoPages";

const CANONICAL = `${SITE_URL}/seo`;
const TITLE = "UnifyOne Guides — 1Commerce, UnifOne, OneCommerce, 1-Commerce";
const DESCRIPTION =
  "Index of UnifyOne guides covering brand variations: UnifyOne, UnifOne, 1Commerce, 1-commerce, OneCommerce, UnifyOne Solutions, and PNW Enterprises.";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "UnifyOne by 1Commerce",
      url: `${SITE_URL}/`,
    },
    hasPart: SEO_PAGES.map(p => ({
      "@type": "WebPage",
      name: p.h1,
      url: `${SITE_URL}/seo/${p.slug}`,
    })),
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
        name: "UnifyOne Guides",
        item: CANONICAL,
      },
    ],
  },
];

export default function SeoIndex() {
  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta
          name="keywords"
          content="UnifyOne, UnifOne, 1Commerce, 1-commerce, 1commerce, 1Commerce LLC, 1Commerce Solutions, OneCommerc, OneCommerce, UnifyOne Solutions, PNW Enterprises, gig worker earnings and tax app"
        />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:site_name" content="UnifyOne by 1Commerce" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content="/og-image.png" />
        {JSON_LD.map((schema, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>

      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "rgba(2,2,2,0.97)",
          borderBottom: "1px solid rgba(212,168,67,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <span
              className="font-cinzel text-xs font-700 tracking-widest cursor-pointer"
              style={{ color: "#D4A843", letterSpacing: "0.2em" }}
            >
              ← UNIFYONE
            </span>
          </Link>
          <span className="inscription" style={{ color: "#3A3A3A" }}>
            UnifyOne Guides
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 pt-28 pb-24">
        <header className="mb-12">
          <span className="inscription block mb-4">
            UnifyOne · 1Commerce · UnifOne · OneCommerce · 1-Commerce · PNW
            Enterprises
          </span>
          <h1
            className="font-cinzel text-3xl sm:text-5xl font-black mb-6"
            style={{
              color: "#F0E8D0",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
            }}
          >
            The Complete Guide to UnifyOne by 1Commerce
          </h1>
          <p
            className="font-crimson text-xl sm:text-2xl"
            style={{ color: "#9A9A9A", fontStyle: "italic", lineHeight: 1.6 }}
          >
            UnifyOne (also written UnifOne, OneCommerce, OneCommerc, 1-commerce,
            or 1Commerce) is the AI-powered earnings & tax app for gig and 1099
            workers by 1Commerce LLC / PNW Enterprises. Browse every guide below
            to find exactly what you searched for.
          </p>
          <div
            className="h-px mt-8"
            style={{
              background: "linear-gradient(to right, #D4A843, transparent)",
            }}
          />
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SEO_PAGES.map(p => (
            <Link key={p.slug} href={`/seo/${p.slug}`}>
              <article className="stone-card p-6 cursor-pointer group h-full">
                <span
                  className="inscription block mb-2"
                  style={{ color: "#3A3A3A" }}
                >
                  UnifyOne Guide
                </span>
                <h2
                  className="font-cinzel text-base font-600 mb-3 group-hover:text-amber-400 transition-colors"
                  style={{ color: "#F0E8D0", letterSpacing: "0.03em" }}
                >
                  {p.h1}
                </h2>
                <p
                  className="font-crimson text-sm"
                  style={{ color: "#9A9A9A", lineHeight: 1.6 }}
                >
                  {p.tagline}
                </p>
              </article>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
