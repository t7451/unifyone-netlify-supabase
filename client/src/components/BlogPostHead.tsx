import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

interface BlogPostHeadProps {
  canonical: string;
  title: string;
  description: string;
  ogImage: string;
  breadcrumbName: string;
  /**
   * Extra structured-data blocks supplied by the caller (e.g. FAQPage). These
   * are emitted after any auto-generated BlogPosting/BreadcrumbList nodes.
   */
  jsonLd: Record<string, unknown>[];
  /**
   * When provided, BlogPostHead emits a schema.org `BlogPosting` node built
   * from these fields. Callers that already hand-roll an Article/BlogPosting in
   * `jsonLd` should omit `headline` to avoid duplicate article nodes.
   */
  headline?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  articleSection?: string;
  wordCount?: number;
  /**
   * Emit a Home → Blog → post BreadcrumbList. Defaults to true when `headline`
   * is supplied (i.e. when this component owns the article schema), false
   * otherwise so callers that already provide their own breadcrumb aren't
   * duplicated.
   */
  withBreadcrumb?: boolean;
}

/**
 * `<head>` wrapper for blog post pages. Renders through {@link PageHead} so blog
 * posts share the same canonical/OG/Twitter handling as the rest of the site,
 * with `ogType="article"`. Optionally builds a `BlogPosting` + `BreadcrumbList`
 * pair from the post's metadata.
 */
export default function BlogPostHead({
  canonical,
  title,
  description,
  ogImage,
  breadcrumbName,
  jsonLd,
  headline,
  datePublished,
  dateModified,
  author,
  articleSection,
  wordCount,
  withBreadcrumb,
}: BlogPostHeadProps) {
  const generated: Record<string, unknown>[] = [];

  if (headline) {
    const blogPosting: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline,
      description,
      image: [ogImage],
      author: {
        "@type": "Organization",
        name: "1Commerce Solutions",
        ...(author ? { alternateName: author } : {}),
        url: SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "1Commerce by 1Commerce LLC",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      url: canonical,
      inLanguage: "en-US",
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      ...(articleSection ? { articleSection } : {}),
      ...(typeof wordCount === "number" ? { wordCount } : {}),
    };
    generated.push(blogPosting);
  }

  const shouldBreadcrumb = withBreadcrumb ?? Boolean(headline);
  if (shouldBreadcrumb) {
    generated.push({
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
          name: "Blog",
          item: `${SITE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: breadcrumbName,
          item: canonical,
        },
      ],
    });
  }

  return (
    <PageHead
      title={title}
      description={description}
      canonical={canonical}
      ogImage={ogImage}
      ogType="article"
      jsonLd={[...generated, ...jsonLd]}
    />
  );
}
