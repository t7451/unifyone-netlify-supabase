import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/about`;
const ABOUT_JSON_LD = buildWebPageJsonLd({
  canonical: CANONICAL,
  name: "About | UnifyOne by 1Commerce",
  description:
    "Learn about 1Commerce / PNW Enterprises — the team building UnifyOne, a multi-tenant commerce platform engineered on the Cathedral Framework for gig operators and e-commerce teams.",
  breadcrumbs: [{ name: "About", item: CANONICAL }],
});

export default function About() {
  return (
    <div
      style={{
        backgroundColor: "#020202",
        color: "#F0E8D0",
        minHeight: "100vh",
      }}
    >
      <PageHead
        title="About | UnifyOne by 1Commerce"
        description="1Commerce / PNW Enterprises builds UnifyOne — a multi-tenant commerce platform on the Cathedral Framework for gig operators and e-commerce teams. Built to endure."
        canonical={CANONICAL}
        jsonLd={ABOUT_JSON_LD}
      />
      <header className="border-b" style={{ borderColor: "#242424" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-sm font-700"
              style={{ color: "#D4A843", letterSpacing: "0.2em" }}
            >
              UNIFYONE
            </span>
          </Link>
          <Link href="/">
            <span
              className="cursor-pointer font-cinzel text-xs"
              style={{ color: "#5A5A5A", letterSpacing: "0.2em" }}
            >
              ← BACK TO HOME
            </span>
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-8 py-24">
        <div
          className="font-cinzel text-xs mb-6"
          style={{ color: "#D4A843", letterSpacing: "0.3em" }}
        >
          ABOUT
        </div>
        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-8"
          style={{ color: "#F0E8D0" }}
        >
          One product. One name. One platform.
        </h1>

        <div
          className="font-crimson text-lg space-y-6"
          style={{ color: "#A0A0A0", lineHeight: 1.7 }}
        >
          <p>
            <strong style={{ color: "#F0E8D0" }}>UnifyOne</strong> is the
            commerce platform.{" "}
            <strong style={{ color: "#F0E8D0" }}>1Commerce Solutions</strong> is
            the company that builds it. If you've seen us referenced as "ONE
            STACK," "0ne Stack," or "1 Stack" elsewhere — those are legacy names
            from earlier iterations. We're consolidating to UnifyOne everywhere.
          </p>

          <p>
            We started with one frustration: every existing commerce stack is
            assembled from plugins, integrations, and middleware that nobody
            owns end-to-end. When something breaks, you debug across four
            vendors. When you scale, the seams pull apart.
          </p>

          <p>
            UnifyOne is engineered like a cathedral instead — sequential,
            structural, built to outlast platform trends. Multi-tenant isolation
            at the schema level. Payment orchestration as a load-bearing wall,
            not a plugin. Automation triggered by real commerce events, not
            scheduled polling. Manus AI built into every page from day one, not
            bolted on after launch.
          </p>

          <p>
            We're a small team. We answer support email ourselves. We don't
            outsource the roadmap to AI and we don't ship features we wouldn't
            run our own business on.
          </p>

          <h2
            className="font-cinzel text-2xl font-700 mt-12 mb-4"
            style={{ color: "#F0E8D0" }}
          >
            Who it's for
          </h2>
          <p>
            Gig operators running multiple platforms. E-commerce teams who
            outgrew Shopify plugins. Builders who want commerce infrastructure
            they can actually own.
          </p>

          <h2
            className="font-cinzel text-2xl font-700 mt-12 mb-4"
            style={{ color: "#F0E8D0" }}
          >
            What's next
          </h2>
          <p>
            See{" "}
            <Link href="/architecture">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                the architecture
              </span>
            </Link>
            ,{" "}
            <Link href="/pricing">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                the pricing
              </span>
            </Link>
            , or{" "}
            <Link href="/contact">
              <span
                className="cursor-pointer underline"
                style={{ color: "#D4A843" }}
              >
                send us a note
              </span>
            </Link>
            .
          </p>
        </div>
      </article>
    </div>
  );
}
