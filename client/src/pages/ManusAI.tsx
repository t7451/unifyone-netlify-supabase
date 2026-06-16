import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { BLOG_POSTS } from "@/pages/blog/blogPostShared";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/manus-ai`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const LOGO_URL = `${SITE_URL}/favicon.ico`;
const DESCRIPTION =
  "Discover how Manus AI extends UnifyOne with guided operators, documentation workflows, and governed automation.";

const FAQS = [
  {
    q: "What is Manus AI in UnifyOne?",
    a: "Manus AI is positioned as an operator layer inside UnifyOne. It helps teams navigate documentation, orchestrate guided workflows, and surface the right context at the right step — all without crossing tenant boundaries. It serves the operating system rather than replacing it.",
  },
  {
    q: "How does Manus AI differ from a generic chatbot?",
    a: "Generic chat answers questions in isolation. Manus AI is commerce-native: prompts are tied to the products, plans, and workflows that actually exist in your platform, so guidance is grounded in your real system rather than generic advice.",
  },
  {
    q: "Does Manus AI respect tenant isolation?",
    a: "Yes. Manus AI pairs its suggestions with explicit routes and tenant-safe operations, and it keeps human review in the loop where it matters. It never breaks the data boundaries that separate one tenant's store from another.",
  },
  {
    q: "How do I start using guided AI in UnifyOne?",
    a: "Open Docs Chat to ask questions about UnifyOne documentation and get instant, context-aware answers from the platform's built-in assistant. From there, guided workflows expose the right system notes and implementation steps inside both public and operator experiences.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": CANONICAL,
    url: CANONICAL,
    name: "Manus AI | UnifyOne",
    description:
      "See how Manus AI fits into UnifyOne's public-facing commerce, documentation, and operator workflows.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Manus AI", item: CANONICAL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Manus AI: A Governed Operator Layer for UnifyOne",
    description:
      "How Manus AI extends UnifyOne as an operator layer — docs-aware guidance, governed execution, and commerce-native context that respects tenant boundaries.",
    url: CANONICAL,
    mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    image: OG_IMAGE,
    author: { "@type": "Organization", name: "1Commerce Solutions" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce Solutions",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    keywords:
      "Manus AI, agentic AI, operator layer, commerce automation, documentation workflows, governed AI, multi-tenant commerce",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function ManusAI() {
  return (
    <PublicLayout>
      <PageHead
        title="Manus AI | UnifyOne by 1Commerce"
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      <section className="max-w-4xl mx-auto px-6 sm:px-8 pt-32 pb-24">
        <div className="inscription mb-6" style={{ color: "#D4A843" }}>
          MANUS AI
        </div>

        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-6"
          style={{ color: "#F0E8D0" }}
        >
          AI that serves the operating system, not the other way around.
        </h1>

        <p
          className="max-w-3xl text-lg mb-10"
          style={{ color: "#6A6A6A", lineHeight: 1.7 }}
        >
          Manus AI inside UnifyOne is an operator layer that serves the platform
          rather than replacing it: it helps teams navigate documentation,
          orchestrate guided workflows, and expose the right context at the
          right step — without ever breaking tenant boundaries.
        </p>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          {[
            {
              title: "Docs-aware guidance",
              body: "Surface the right system notes, route context, and implementation guidance inside public and operator experiences.",
            },
            {
              title: "Governed execution",
              body: "Pair AI suggestions with explicit routes, tenant-safe operations, and human review where it matters.",
            },
            {
              title: "Commerce-native context",
              body: "Tie prompts to products, plans, and workflows that exist in the platform instead of generic chat alone.",
            },
          ].map(item => (
            <article
              key={item.title}
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
                {item.title}
              </h2>
              <p style={{ color: "#8A8A8A", lineHeight: 1.7 }}>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/docs-chat">
            <span
              className="cursor-pointer rounded-full px-6 py-3 text-sm font-cinzel tracking-[0.2em] uppercase"
              style={{ backgroundColor: "#D4A843", color: "#020202" }}
            >
              Explore Docs Chat
            </span>
          </Link>
          <Link href={BLOG_POSTS.aiGigWorkers.href}>
            <span
              className="cursor-pointer rounded-full border px-6 py-3 text-sm font-cinzel tracking-[0.2em] uppercase"
              style={{
                borderColor: "rgba(212, 168, 67, 0.35)",
                color: "#D4A843",
              }}
            >
              Read the Manus AI essay
            </span>
          </Link>
        </div>

        <div className="mt-20">
          <div className="inscription mb-4" style={{ color: "#D4A843" }}>
            FREQUENTLY ASKED
          </div>
          <h2
            className="font-cinzel text-3xl font-black mb-10"
            style={{ color: "#F0E8D0" }}
          >
            Manus AI Questions
          </h2>
          <div className="space-y-6">
            {FAQS.map(item => (
              <div
                key={item.q}
                className="rounded-3xl border p-6"
                style={{
                  borderColor: "rgba(212, 168, 67, 0.2)",
                  backgroundColor: "rgba(10, 10, 10, 0.92)",
                }}
              >
                <h3
                  className="font-cinzel text-lg font-bold mb-3"
                  style={{ color: "#F0E8D0" }}
                >
                  {item.q}
                </h3>
                <p style={{ color: "#8A8A8A", lineHeight: 1.7 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
