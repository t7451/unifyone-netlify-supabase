import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/siteConfig";

const DEFAULT_OG_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/manus-ai-og-card-gmKaF7wnfK9eUMpcMfEqQ4.png";

interface PageHeadProps {
  /** <title> text — keep under 60 chars */
  title: string;
  /** Meta description — keep under 160 chars */
  description: string;
  /** Absolute canonical URL (use SITE_URL from siteConfig) */
  canonical: string;
  /** OG/Twitter share image. Defaults to the global brand card. */
  ogImage?: string;
  /** OG type. Defaults to "website". */
  ogType?: "website" | "article";
  /** Schema.org JSON-LD blocks (optional). */
  jsonLd?: Record<string, unknown>[];
}

/**
 * Drop-in `<Helmet>` wrapper for public marketing / legal / feature pages.
 *
 * Usage:
 *   <PageHead
 *     title="Pricing | UnifyOne"
 *     description="Three plans …"
 *     canonical={`${SITE_URL}/pricing`}
 *   />
 */
export default function PageHead({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: PageHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="UnifyOne by 1Commerce" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@1CommerceSol" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD structured data */}
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

/** Convenience helper: build a WebPage + BreadcrumbList JSON-LD pair. */
export function buildWebPageJsonLd(opts: {
  canonical: string;
  name: string;
  description: string;
  breadcrumbs: Array<{ name: string; item: string }>;
}): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": opts.canonical,
      url: opts.canonical,
      name: opts.name,
      description: opts.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "en-US",
      publisher: {
        "@type": "Organization",
        name: "1Commerce / PNW Enterprises",
        url: SITE_URL,
      },
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
        ...opts.breadcrumbs.map((bc, idx) => ({
          "@type": "ListItem",
          position: idx + 2,
          name: bc.name,
          item: bc.item,
        })),
      ],
    },
  ];
}
