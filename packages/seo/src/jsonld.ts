const SITE_URL = "https://1commerce.online";
const LOGO_URL = `${SITE_URL}/logo.svg`;

export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "UnifyOne",
    url: SITE_URL,
    logo: LOGO_URL,
    sameAs: [
      "https://github.com/unifyone",
      "https://x.com/unifyone",
    ],
  };
}

export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "UnifyOne",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export interface ArticlePost {
  title: string;
  description: string;
  slug: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  author?: string;
  coverImage?: string;
}

export function article(post: ArticlePost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished:
      post.publishedAt instanceof Date
        ? post.publishedAt.toISOString()
        : post.publishedAt,
    dateModified:
      post.updatedAt instanceof Date
        ? post.updatedAt.toISOString()
        : (post.updatedAt ??
          (post.publishedAt instanceof Date
            ? post.publishedAt.toISOString()
            : post.publishedAt)),
    author: {
      "@type": "Person",
      name: post.author ?? "UnifyOne",
    },
    publisher: {
      "@type": "Organization",
      name: "UnifyOne",
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    ...(post.coverImage ? { image: post.coverImage } : {}),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPage(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumb(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
