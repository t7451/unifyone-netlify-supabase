import { useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
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
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const pages = SEO_PAGES.filter(
    page =>
      !query ||
      `${page.h1} ${page.title} ${page.tagline} ${page.keywords.join(" ")}`
        .toLowerCase()
        .includes(query)
  );
  return (
    <PublicLayout>
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
      <div className="marketing-page marketing-library">
        <header className="marketing-container marketing-page-heading">
          <span className="marketing-eyebrow">
            The UnifyOne guide collection
          </span>
          <h1>Find the guide you need.</h1>
          <p className="marketing-lead">
            Browse practical guides to UnifyOne, gig work, earnings and business
            records. Search by a topic or question, then follow a guide at your
            own pace.
          </p>
          <div className="marketing-actions">
            <Link
              href="/resources"
              className="marketing-button marketing-button-outline"
            >
              Browse all resources <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/tools"
              className="marketing-button marketing-button-outline"
            >
              Try a free tool <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <section
          className="marketing-container"
          aria-labelledby="guide-library-heading"
        >
          <div className="marketing-library-controls">
            <h2 id="guide-library-heading" className="sr-only">
              Search the guide collection
            </h2>
            <label className="marketing-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search guides</span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search earnings, mileage, taxes…"
              />
            </label>
            <p
              role="status"
              aria-live="polite"
              className="marketing-result-count"
            >
              {pages.length} of {SEO_PAGES.length} guides
            </p>
          </div>
          {pages.length ? (
            <div className="marketing-tool-grid">
              {pages.map(page => (
                <Link
                  key={page.slug}
                  href={`/seo/${page.slug}`}
                  className="marketing-tool-card"
                >
                  <BookOpen size={22} aria-hidden="true" />
                  <span className="marketing-card-category">
                    UnifyOne guide
                  </span>
                  <h2>{page.h1}</h2>
                  <p>{page.tagline}</p>
                  <span className="marketing-text-link">
                    Read the guide <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="marketing-empty">
              <h2>No guides match that search.</h2>
              <p>
                Try a shorter topic, or clear your search to browse the
                collection.
              </p>
              <button
                type="button"
                className="marketing-button marketing-button-outline"
                onClick={() => setSearch("")}
              >
                Show all guides
              </button>
            </div>
          )}
          <p className="marketing-library-note">
            Looking for a practical starting point? The{" "}
            <Link href="/resources">resource library</Link> organizes worker
            guides by topic; the <Link href="/tools">free tools</Link> let you
            explore a scenario with your own figures.
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
