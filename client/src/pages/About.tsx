import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { CdnImage } from "@/components/CdnImage";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/about`;
const DESCRIPTION =
  "1Commerce / PNW Enterprises builds UnifyOne — the earnings and tax app for gig and 1099 workers. Track real take-home, capture every IRS mileage deduction, and stay ahead of quarterly taxes.";

const LOGO_URL = `${SITE_URL}/favicon.svg`;
const ORG_ID = `${SITE_URL}/#organization`;

// Social profiles referenced in client/index.html (sameAs) plus the Instagram
// profile linked from this page and Contact.
const SAME_AS = [
  "https://github.com/unifyone",
  "https://x.com/unifyone",
  "https://www.instagram.com/1commerce_llc",
  "https://1commerce.online",
];

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "1Commerce Solutions",
  legalName: "1Commerce LLC",
  alternateName: [
    "PNW Enterprises",
    "1Commerce LLC",
    "PNW Enterprises / 1Commerce LLC",
    "1Commerce",
    "1-Commerce",
    "UnifyOne Solutions",
  ],
  url: SITE_URL,
  logo: LOGO_URL,
  email: "support@1commerce.online",
  description:
    "1Commerce Solutions (legally 1Commerce LLC, also known as PNW Enterprises) builds UnifyOne — the earnings and tax app for gig and 1099 workers. Based in Canby, Oregon, in the Pacific Northwest.",
  foundingDate: "2025",
  areaServed: "US",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Canby",
    addressRegion: "OR",
    addressCountry: "US",
  },
  sameAs: SAME_AS,
};

const WEBPAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "About | UnifyOne by 1Commerce",
  description:
    "Learn about 1Commerce / PNW Enterprises — the team building UnifyOne, the earnings and tax app that helps gig and 1099 workers track real take-home, capture IRS mileage deductions, and stay ahead of quarterly taxes.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
  about: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
};

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "About", item: CANONICAL },
  ],
};

const JSON_LD = [ORGANIZATION_JSON_LD, WEBPAGE_JSON_LD, BREADCRUMB_JSON_LD];

export default function About() {
  return (
    <PublicLayout>
      <PageHead
        title="About | UnifyOne by 1Commerce"
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={JSON_LD}
      />

      <article
        className="max-w-3xl mx-auto px-6 sm:px-8"
        style={{ paddingTop: "8rem", paddingBottom: "6rem" }}
      >
        <div className="inscription mb-6" style={{ color: "#D4A843" }}>
          ABOUT
        </div>

        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-8"
          style={{ color: "#F0E8D0" }}
        >
          Know your real pay. Keep more of it.
        </h1>

        <div
          className="font-crimson text-lg space-y-6"
          style={{ color: "#6A6A6A", lineHeight: 1.7 }}
        >
          <p>
            <strong style={{ color: "#F0E8D0" }}>UnifyOne</strong> is the
            earnings and tax app for gig and 1099 workers.{" "}
            <strong style={{ color: "#F0E8D0" }}>1Commerce Solutions</strong> is
            the company that builds it. If you've seen us referenced as "ONE
            STACK," "0ne Stack," or "1 Stack" elsewhere — those are legacy names
            from earlier iterations. We're consolidating to UnifyOne everywhere.
          </p>

          <p>
            We started with one frustration: gig work pays in fragments. Cash
            lands across a half-dozen apps, mileage goes untracked, and a tax
            bill nobody set money aside for shows up every quarter. The work is
            real, but the numbers never add up in one place.
          </p>

          <p>
            UnifyOne puts them in one place. GigIQ shows your true take-home
            after expenses across every platform. Tax Autopilot captures every
            IRS standard-mileage deduction and tells you what to set aside for
            quarterly estimated taxes before the deadline — not after. Money
            Manager keeps the cash flow honest, and Kai answers the
            "what-does-this-mean" questions in plain language on every page.
          </p>

          <p>
            We're a small team. We answer support email ourselves. We don't
            outsource the roadmap to AI, and we don't ship features we wouldn't
            rely on to file our own taxes.
          </p>

          <h2
            className="font-cinzel text-2xl font-700 mt-12 mb-4"
            style={{ color: "#F0E8D0" }}
          >
            Who it's for
          </h2>
          <p>
            The 76M+ Americans doing gig and 1099 work — rideshare and delivery
            drivers, freelancers, contractors, and anyone juggling multiple
            earning apps who wants to know what they actually made and what they
            actually owe. Start free; Pro is $4.99/mo.
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

        {/* CTA strip */}
        <div
          className="mt-16 pt-10 flex flex-col sm:flex-row gap-4"
          style={{ borderTop: "1px solid #242424" }}
        >
          <a href={getSignupUrl()} className="btn-illuminate">
            Start Free
          </a>
          <Link href="/the-system">
            <span className="btn-ghost-gold cursor-pointer">
              See How It Works →
            </span>
          </Link>
        </div>

        {/* Follow strip */}
        <div
          className="mt-10 pt-10 flex items-center gap-6"
          style={{ borderTop: "1px solid #242424" }}
        >
          <a
            href="https://www.instagram.com/1commerce_llc"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0"
          >
            <CdnImage
              src="https://github.com/user-attachments/assets/6dbb3057-6f53-4fcd-9d50-edff38133fed"
              alt="Follow @1COMMERCE_LLC on Instagram — scan QR code"
              width={88}
              height={88}
              fit="cover"
              className="rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              style={{ imageRendering: "pixelated" }}
            />
          </a>
          <div>
            <span
              className="inscription block mb-1"
              style={{ color: "#D4A843" }}
            >
              FOLLOW ALONG
            </span>
            <a
              href="https://www.instagram.com/1commerce_llc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-cinzel text-sm tracking-widest transition-colors duration-200"
              style={{ color: "#8A8A8A", letterSpacing: "0.15em" }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLElement).style.color = "#D4A843")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLElement).style.color = "#8A8A8A")
              }
            >
              @1COMMERCE_LLC
            </a>
            <p
              className="font-crimson text-sm mt-1"
              style={{ color: "#5A5A5A", fontStyle: "italic" }}
            >
              Product updates, tax tips for gig workers, and behind-the-scenes
              build notes.
            </p>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
