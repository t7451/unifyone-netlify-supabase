import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/blog`;

const POSTS = [
  {
    href: "/blog/gig-ecommerce",
    title: "Gig Ecommerce",
    description:
      "How UnifyOne helps operators unify storefront, payments, automation, and fulfillment in one stack.",
  },
  {
    href: "/blog/multi-tenant",
    title: "Multi-Tenant Commerce",
    description:
      "Why tenant-safe architecture matters when products, orders, and analytics share one platform.",
  },
  {
    href: "/blog/manus-ai",
    title: "Manus AI",
    description:
      "Where AI agents fit inside a governed commerce platform built for real operations.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "UnifyOne Blog",
  description:
    "Public writing from UnifyOne on multi-tenant commerce, Manus AI, and platform architecture.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  blogPost: POSTS.map((post, index) => ({
    "@type": "BlogPosting",
    position: index + 1,
    headline: post.title,
    url: `${SITE_URL}${post.href}`,
    description: post.description,
  })),
};

export default function BlogIndex() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Blog | UnifyOne by 1Commerce</title>
        <meta
          name="description"
          content="Read UnifyOne essays on gig ecommerce, multi-tenant SaaS architecture, and Manus AI in commerce operations."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Blog | UnifyOne by 1Commerce" />
        <meta
          property="og:description"
          content="Read UnifyOne essays on gig ecommerce, multi-tenant SaaS architecture, and Manus AI in commerce operations."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

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
          operations, and the role of Manus AI inside a governed commerce stack.
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
