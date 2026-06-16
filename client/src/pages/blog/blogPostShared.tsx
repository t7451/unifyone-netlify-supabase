import { Link } from "wouter";
import { buildWebPageJsonLd } from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

interface StaticBlogPostMeta {
  href: string;
  canonical: string;
  title: string;
  headline: string;
  description: string;
  shortDescription: string;
  category: string;
  breadcrumbName: string;
  ogImage: string;
  author: string;
  publishedAt: string;
  modifiedAt: string;
  wordCount: number;
}

export const BLOG_POSTS = {
  gigEcommerce: {
    href: "/blog/gig-economy-commerce-platform",
    canonical: `${SITE_URL}/blog/gig-economy-commerce-platform`,
    title:
      "How Gig Economy Workers Can Build a Commerce Platform That Scales | 1Commerce",
    headline:
      "How Gig Economy Workers Can Build a Commerce Platform That Scales",
    description:
      "A deep-dive into how gig operators on DoorDash, Uber Eats, Instacart, and Amazon Flex can leverage multi-tenant commerce infrastructure to maximize earnings, automate tax tracking, and build a scalable side business.",
    shortDescription:
      "Learn how gig operators can track earnings, automate tax data, and turn platform work into a compounding commerce asset.",
    category: "Commerce Infrastructure",
    breadcrumbName: "Gig Economy Commerce",
    ogImage:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/cathedral-hero-v2-3tFDpV7FHQo4P2qJjERF7q.png",
    author: "UnifyOne Team",
    publishedAt: "2026-03-06",
    modifiedAt: "2026-04-04",
    wordCount: 1200,
  },
  multiTenant: {
    href: "/blog/multi-tenant-ecommerce-saas",
    canonical: `${SITE_URL}/blog/multi-tenant-ecommerce-saas`,
    title:
      "Why Multi-Tenant SaaS Is the Right Architecture for Commerce Teams | 1Commerce",
    headline:
      "Why Multi-Tenant SaaS Is the Right Architecture for Commerce Teams",
    description:
      "A technical and strategic breakdown of multi-tenant commerce architecture — why it outperforms single-tenant deployments for agencies, franchises, and holding companies managing multiple brands or client accounts.",
    shortDescription:
      "See why multi-tenant architecture beats single-tenant deployments for agencies, franchises, and multi-brand commerce teams.",
    category: "Commerce Architecture",
    breadcrumbName: "Multi-Tenant Architecture",
    ogImage:
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663412766662/uBzlkALhOZxeuTyR.jpg",
    author: "UnifyOne Team",
    publishedAt: "2026-03-06",
    modifiedAt: "2026-04-04",
    wordCount: 1100,
  },
  aiGigWorkers: {
    href: "/blog/manus-ai-gig-workers",
    canonical: `${SITE_URL}/blog/manus-ai-gig-workers`,
    title:
      "Kai AI for Gig Workers: From Data to Decisions in Seconds | 1Commerce",
    headline: "Kai AI for Gig Workers: From Data to Decisions in Seconds",
    description:
      "How Kai embedded inside UnifyOne transforms raw gig earnings data into actionable route optimization, tax deduction tracking, and challenge strategy — without leaving the dashboard.",
    shortDescription:
      "Discover how Kai turns gig earnings, mileage, and route data into actionable recommendations inside the UnifyOne dashboard.",
    category: "AI Integration",
    breadcrumbName: "Kai AI for Gig Workers",
    ogImage:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/unifyone-og-card.png",
    author: "UnifyOne Team",
    publishedAt: "2026-03-06",
    modifiedAt: "2026-04-04",
    wordCount: 1050,
  },
  gigWorkerShiftIntelligence: {
    href: "/blog/gig-worker-shift-intelligence",
    canonical: `${SITE_URL}/blog/gig-worker-shift-intelligence`,
    title:
      "Stop Guessing Which Shifts Pay: How UnifyOne Tells Gig Workers Exactly Where Their Money Goes | 1Commerce",
    headline:
      "Stop Guessing Which Shifts Pay: How UnifyOne Tells Gig Workers Exactly Where Their Money Goes",
    description:
      "UnifyOne's GigIQ module analyzes your real shift history to surface which hours and zones generate the highest net pay after fuel. Automatic mileage tracking, quarterly tax forecasting, and AI-powered earnings intelligence for DoorDash, Uber Eats, and Instacart workers.",
    shortDescription:
      "GigIQ reads your actual shift data to show which hours and zones pay the most after expenses — plus automatic mileage deductions and quarterly tax estimates.",
    category: "Financial Intelligence",
    breadcrumbName: "Gig Worker Shift Intelligence",
    ogImage:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663400814556/VyofXqD3FvrztXonjtHUZp/unifyone-og-card.png",
    author: "UnifyOne Team",
    publishedAt: "2026-06-13",
    modifiedAt: "2026-06-13",
    wordCount: 1800,
  },
} satisfies Record<string, StaticBlogPostMeta>;

export type BlogPostKey = keyof typeof BLOG_POSTS;

type PageHeadMetaTag =
  | { name: string; content: string; property?: never }
  | { property: string; content: string; name?: never };

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function getReadingTimeText(wordCount: number) {
  return `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
}

export function buildArticleMeta(post: StaticBlogPostMeta): PageHeadMetaTag[] {
  const publishedDateTime = `${post.publishedAt}T00:00:00Z`;
  const modifiedDateTime = `${post.modifiedAt}T00:00:00Z`;

  return [
    { name: "author", content: post.author },
    { property: "og:published_time", content: publishedDateTime },
    { property: "og:author", content: post.author },
    { property: "article:published_time", content: publishedDateTime },
    { property: "article:modified_time", content: modifiedDateTime },
    { property: "article:author", content: post.author },
  ];
}

/**
 * Author node for a blog post. The registry stores a team byline
 * ("UnifyOne Team"), which is an Organization rather than a named Person, so we
 * emit it as an Organization. If a post ever names a real individual author we
 * can branch on that here.
 */
function buildAuthorJsonLd(author: string): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: "1Commerce Solutions",
    alternateName: author,
    url: SITE_URL,
  };
}

/** Publisher node shared across blog structured data. */
function buildPublisherJsonLd(): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: "1Commerce by 1Commerce LLC",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.ico`,
    },
  };
}

/**
 * Build a schema.org `BlogPosting` node for a registered static blog post.
 * Every field is sourced from the BLOG_POSTS registry — no invented facts.
 * Internal helper; consumed by {@link buildArticleJsonLd}.
 */
function buildBlogPostingJsonLd(
  post: StaticBlogPostMeta
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.headline,
    description: post.description,
    image: [post.ogImage],
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    author: buildAuthorJsonLd(post.author),
    publisher: buildPublisherJsonLd(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.canonical,
    },
    wordCount: post.wordCount,
    articleSection: post.category,
    url: post.canonical,
    inLanguage: "en-US",
  };
}

export function buildArticleJsonLd(
  post: StaticBlogPostMeta
): Record<string, unknown>[] {
  return [
    buildBlogPostingJsonLd(post),
    ...buildWebPageJsonLd({
      canonical: post.canonical,
      name: post.title,
      description: post.description,
      breadcrumbs: [
        { name: "Blog", item: `${SITE_URL}/blog` },
        { name: post.breadcrumbName, item: post.canonical },
      ],
    }),
  ];
}

export function BlogBackLink({ className }: { className?: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        "h-auto px-0 py-0 font-cinzel text-xs tracking-[0.15em] text-[#5A5A5A] transition-colors hover:bg-transparent hover:text-amber-400",
        className
      )}
    >
      <Link href="/blog">← Back to Blog</Link>
    </Button>
  );
}

export function RelatedPostsSection({
  currentPost,
}: {
  currentPost: BlogPostKey;
}) {
  const relatedPosts = (
    Object.entries(BLOG_POSTS) as [BlogPostKey, StaticBlogPostMeta][]
  ).filter(([key]) => key !== currentPost);

  return (
    <section
      className="mt-16 pt-12"
      style={{ borderTop: "1px solid rgba(212,168,67,0.08)" }}
    >
      <span className="inscription block mb-6">Related Posts</span>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {relatedPosts.map(([key, post]) => (
          <Button
            key={key}
            asChild
            variant="outline"
            className={cn(
              "h-auto justify-start rounded-xl border-[#D4A843]/20 bg-transparent p-0 text-left text-inherit shadow-none transition-colors hover:border-[#D4A843]/40 hover:bg-[#0B0B0B]"
            )}
          >
            <Link href={post.href} className="block w-full p-6">
              <span className="inscription mb-2 block text-[#3A3A3A]">
                {post.category}
              </span>
              <h3 className="font-cinzel text-sm font-semibold tracking-[0.05em] text-[#F0E8D0]">
                {post.headline}
              </h3>
              <p className="mt-3 font-crimson text-sm leading-6 text-[#9A9A9A]">
                {post.shortDescription}
              </p>
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
