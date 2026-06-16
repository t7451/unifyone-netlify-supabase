import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { BLOG_POSTS } from "@/pages/blog/blogPostShared";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/blog`;
const DESCRIPTION =
  "Read UnifyOne essays on gig ecommerce, multi-tenant SaaS architecture, and AI-assisted commerce operations.";

const POSTS = [
  {
    href: BLOG_POSTS.gigEcommerce.href,
    title: "Gig Ecommerce",
    description:
      "How UnifyOne helps operators unify storefront, payments, automation, and fulfillment in one stack.",
  },
  {
    href: BLOG_POSTS.multiTenant.href,
    title: "Multi-Tenant Commerce",
    description:
      "Why tenant-safe architecture matters when products, orders, and analytics share one platform.",
  },
];

const BLOG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "UnifyOne Blog",
  description:
    "Public writing from UnifyOne on multi-tenant commerce, agentic AI, and platform architecture.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  publisher: {
    "@type": "Organization",
    name: "1Commerce by 1Commerce LLC",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
  },
  blogPost: POSTS.map((post, index) => ({
    "@type": "BlogPosting",
    position: index + 1,
    headline: post.title,
    url: `${SITE_URL}${post.href}`,
    description: post.description,
  })),
};

const ITEM_LIST_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "UnifyOne Blog posts",
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: POSTS.length,
  itemListElement: POSTS.map((post, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: post.title,
    url: `${SITE_URL}${post.href}`,
  })),
};

const JSON_LD = [BLOG_JSON_LD, ITEM_LIST_JSON_LD];

export default function BlogIndex() {
  return (
    <PublicLayout>
      <PageHead
        title="Blog | UnifyOne by 1Commerce"
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      <section className="max-w-4xl mx-auto px-6 sm:px-8 pt-32 pb-24">
        <div className="inscription mb-6" style={{ color: "#D4A843" }}>
          BLOG
        </div>

        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-6"
          style={{ color: "#F0E8D0" }}
        >
          Public writing on commerce architecture.
        </h1>

        <p
          className="max-w-2xl text-lg mb-12"
          style={{ color: "#6A6A6A", lineHeight: 1.7 }}
        >
          Explore the public side of UnifyOne: platform design, multi-tenant
          operations, and the role of agentic AI inside a governed commerce
          stack.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {POSTS.map(post => (
            <article
              key={post.href}
              className="rounded-3xl border p-6"
              style={{
                borderColor: "rgba(212, 168, 67, 0.2)",
                backgroundColor: "rgba(10, 10, 10, 0.92)",
              }}
            >
              <h2
                className="font-cinzel text-2xl font-bold mb-4"
                style={{ color: "#F0E8D0" }}
              >
                {post.title}
              </h2>
              <p className="mb-6" style={{ color: "#8A8A8A", lineHeight: 1.7 }}>
                {post.description}
              </p>
              <Link href={post.href}>
                <span
                  className="cursor-pointer font-cinzel text-sm tracking-[0.2em] uppercase"
                  style={{ color: "#D4A843" }}
                >
                  Read article →
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
