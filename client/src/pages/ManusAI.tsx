import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/manus-ai`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "Manus AI | UnifyOne",
  description:
    "See how Manus AI fits into UnifyOne's public-facing commerce, documentation, and operator workflows.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Manus AI", item: CANONICAL },
    ],
  },
};

export default function ManusAI() {
  return (
    <PublicLayout>
      <Helmet>
        <title>Manus AI | UnifyOne by 1Commerce</title>
        <meta
          name="description"
          content="Discover how Manus AI extends UnifyOne with guided operators, documentation workflows, and governed automation."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Manus AI | UnifyOne by 1Commerce" />
        <meta
          property="og:description"
          content="Discover how Manus AI extends UnifyOne with guided operators, documentation workflows, and governed automation."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

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
          Manus AI inside UnifyOne is positioned as an operator layer: helping
          teams navigate documentation, orchestrate guided workflows, and expose
          the right context at the right step without breaking tenant
          boundaries.
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
          <Link href="/blog/manus-ai">
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
      </section>
    </PublicLayout>
  );
}
