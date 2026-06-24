import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/press`;
const PRESS_EMAIL = "support@1commerce.online";

const DESCRIPTION =
  "UnifyOne media kit: brand logos, boilerplate copy, company facts, and category tags for press, app directories, and reviewers. By 1Commerce LLC.";

// ── Copy blocks (gig-first media-kit boilerplate) ──────────────────────────

const TAGLINE_60 = "Track gig earnings, mileage & taxes in one app.";

const SHORT_160 =
  "UnifyOne is an AI-powered gig-worker earnings and tax app that tracks " +
  "income, auto-logs mileage, and forecasts quarterly taxes across every " +
  "platform in one dashboard.";

const MEDIUM_80 =
  "UnifyOne by 1Commerce LLC is a gig-worker earnings and tax app built for " +
  "drivers, couriers, and freelancers working across DoorDash, Uber, Lyft, " +
  "Instacart, and more. It tracks income from every platform, auto-logs " +
  "deductible mileage, and forecasts quarterly taxes in one dashboard. GigIQ " +
  "surfaces the highest-paying hours and zones, Tax Autopilot sets aside the " +
  "right amount and preps estimates, the Money Manager organizes deductions, " +
  "and Kai answers earnings and tax questions. Plans start free, with Pro at " +
  "$4.99/mo.";

const ONE_LINER =
  "UnifyOne by 1Commerce LLC — an AI-powered gig-worker earnings and tax app " +
  "that tracks income, auto-logs mileage, forecasts quarterly taxes, and " +
  "finds the best-paying work across every gig platform from one dashboard.";

const CATEGORY_TAGS = [
  "Gig Economy",
  "1099 Taxes",
  "Mileage Tracking",
  "Personal Finance",
  "Earnings Tracker",
  "Self-Employment Taxes",
  "Expense Tracking",
];

const FAST_FACTS: { label: string; value: string }[] = [
  { label: "Product", value: "UnifyOne" },
  { label: "Company", value: "1Commerce LLC (PNW Enterprises)" },
  { label: "Headquarters", value: "Canby, Oregon, USA" },
  { label: "Founded", value: "2025" },
  { label: "Category", value: "Gig-worker earnings & tax app" },
  { label: "Press contact", value: PRESS_EMAIL },
];

const COPY_BLOCKS: { label: string; hint: string; text: string }[] = [
  {
    label: "Tagline",
    hint: "≤ 60 characters — logos, cards, nav",
    text: TAGLINE_60,
  },
  {
    label: "Short description",
    hint: "≤ 160 characters — directory meta, search snippets",
    text: SHORT_160,
  },
  {
    label: "Medium description",
    hint: "~ 80 words — directory body, about sections",
    text: MEDIUM_80,
  },
];

const ASSETS: { label: string; href: string; note: string }[] = [
  {
    label: "Logo lockup (SVG)",
    href: "/press/unifyone-logo.svg",
    note: "Emblem + wordmark, vector",
  },
  {
    label: "Logo lockup (PNG)",
    href: "/press/unifyone-logo.png",
    note: "512px wide, transparent",
  },
  {
    label: "Square emblem (SVG)",
    href: "/press/unifyone-mark.svg",
    note: "Avatar / app-icon mark",
  },
  {
    label: "Square emblem (PNG)",
    href: "/press/unifyone-mark.png",
    note: "512×512, transparent",
  },
  {
    label: "Boilerplate (TXT)",
    href: "/press/boilerplate.txt",
    note: "All copy, colors, usage rules",
  },
];

// Owned guide pages from docs/AEO_SUBMISSION_KIT.md — link these from listings.
const GUIDE_LINKS: { label: string; href: string }[] = [
  {
    label: "Multi-Tenant Ecommerce Platform",
    href: "/seo/multi-tenant-ecommerce-platform",
  },
  {
    label: "Unify Inventory Across Multiple Stores",
    href: "/seo/unify-inventory-multiple-stores",
  },
  {
    label: "Unify Disconnected Sales Channels",
    href: "/seo/unify-disconnected-sales-channels",
  },
  {
    label: "Multi-Channel Order Management",
    href: "/seo/multi-channel-order-management",
  },
  {
    label: "Multi-Store Management Platform",
    href: "/seo/multi-store-management-platform",
  },
  {
    label: "Real-Time Inventory Sync",
    href: "/seo/real-time-inventory-sync",
  },
];

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "1Commerce LLC",
  legalName: "1Commerce LLC",
  alternateName: ["PNW Enterprises", "1Commerce Solutions", "UnifyOne"],
  url: SITE_URL,
  logo: `${SITE_URL}/press/unifyone-mark.png`,
  email: PRESS_EMAIL,
  description: SHORT_160,
  foundingDate: "2025",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Canby",
    addressRegion: "OR",
    addressCountry: "US",
  },
  sameAs: ["https://www.instagram.com/1commerce_llc"],
};

const WEBPAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": CANONICAL,
  url: CANONICAL,
  name: "Press & Media Kit | UnifyOne by 1Commerce",
  description: DESCRIPTION,
  inLanguage: "en-US",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#organization` },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Press", item: CANONICAL },
  ],
};

const SECTION_BORDER = "1px solid rgba(212,168,67,0.1)";

function CopyBlock({
  label,
  hint,
  text,
}: {
  label: string;
  hint: string;
  text: string;
}) {
  return (
    <div className="stone-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <span
          className="font-cinzel text-sm font-700 tracking-widest"
          style={{ color: "#F0E8D0", letterSpacing: "0.12em" }}
        >
          {label}
        </span>
        <span className="inscription" style={{ color: "#5A5A5A" }}>
          {hint}
        </span>
      </div>
      <p
        className="font-mono text-sm select-all"
        style={{
          color: "#C0B090",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </p>
    </div>
  );
}

export default function Press() {
  return (
    <PublicLayout>
      <PageHead
        title="Press & Media Kit | UnifyOne by 1Commerce"
        description={DESCRIPTION}
        canonical={CANONICAL}
        ogImage="/press/unifyone-mark.png"
        jsonLd={[ORGANIZATION_JSON_LD, WEBPAGE_JSON_LD, BREADCRUMB_JSON_LD]}
      />

      <article
        className="max-w-3xl mx-auto px-6 sm:px-8"
        style={{ paddingTop: "8rem", paddingBottom: "6rem" }}
      >
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-8">
          <ol
            className="flex items-center gap-2 text-xs"
            style={{
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.15em",
              color: "#3A3A3A",
            }}
          >
            <li>
              <Link href="/">
                <span className="cursor-pointer hover:text-amber-500 transition-colors">
                  Home
                </span>
              </Link>
            </li>
            <li style={{ color: "#242424" }}>›</li>
            <li style={{ color: "#D4A843" }}>Press</li>
          </ol>
        </nav>

        <div className="inscription mb-6" style={{ color: "#D4A843" }}>
          PRESS &amp; MEDIA KIT
        </div>

        <h1
          className="font-cinzel text-4xl sm:text-5xl font-black mb-6"
          style={{ color: "#F0E8D0" }}
        >
          UnifyOne media kit
        </h1>

        <p
          className="font-crimson text-lg mb-4"
          style={{ color: "#9A9A9A", lineHeight: 1.7 }}
        >
          {ONE_LINER}
        </p>
        <p
          className="font-crimson text-base"
          style={{ color: "#6A6A6A", lineHeight: 1.7 }}
        >
          Everything here is free to use for editorial coverage,
          software-directory listings, and product reviews. For anything not
          included — additional screenshots, an interview, a specific format —
          email{" "}
          <a
            href={`mailto:${PRESS_EMAIL}`}
            className="underline"
            style={{ color: "#D4A843" }}
          >
            {PRESS_EMAIL}
          </a>
          .
        </p>

        {/* Fast facts */}
        <section className="mt-16 pt-10" style={{ borderTop: SECTION_BORDER }}>
          <h2
            className="font-cinzel text-2xl font-700 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Fast facts
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {FAST_FACTS.map(fact => (
              <div
                key={fact.label}
                className="flex flex-col gap-1 py-2"
                style={{ borderBottom: "1px solid rgba(212,168,67,0.06)" }}
              >
                <dt className="inscription" style={{ color: "#5A5A5A" }}>
                  {fact.label}
                </dt>
                <dd
                  className="font-crimson text-base"
                  style={{ color: "#F0E8D0" }}
                >
                  {fact.label === "Press contact" ? (
                    <a
                      href={`mailto:${fact.value}`}
                      className="underline"
                      style={{ color: "#D4A843" }}
                    >
                      {fact.value}
                    </a>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Boilerplate copy */}
        <section className="mt-16 pt-10" style={{ borderTop: SECTION_BORDER }}>
          <h2
            className="font-cinzel text-2xl font-700 mb-3"
            style={{ color: "#F0E8D0" }}
          >
            Boilerplate copy
          </h2>
          <p
            className="font-crimson text-base mb-6"
            style={{ color: "#6A6A6A", lineHeight: 1.7 }}
          >
            Please use the product name and these descriptions verbatim.
            Consistent wording is what turns hedged AI mentions into confident,
            citable ones.
          </p>
          <div className="space-y-5">
            {COPY_BLOCKS.map(block => (
              <CopyBlock
                key={block.label}
                label={block.label}
                hint={block.hint}
                text={block.text}
              />
            ))}
          </div>
        </section>

        {/* Category tags */}
        <section className="mt-16 pt-10" style={{ borderTop: SECTION_BORDER }}>
          <h2
            className="font-cinzel text-2xl font-700 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Category tags
          </h2>
          <ul className="flex flex-wrap gap-3">
            {CATEGORY_TAGS.map(tag => (
              <li
                key={tag}
                className="font-cinzel text-xs tracking-widest px-4 py-2 rounded-sm"
                style={{
                  color: "#C0B090",
                  letterSpacing: "0.1em",
                  border: "1px solid rgba(212,168,67,0.2)",
                  backgroundColor: "rgba(212,168,67,0.04)",
                }}
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>

        {/* Brand assets */}
        <section className="mt-16 pt-10" style={{ borderTop: SECTION_BORDER }}>
          <h2
            className="font-cinzel text-2xl font-700 mb-6"
            style={{ color: "#F0E8D0" }}
          >
            Brand assets
          </h2>
          <div className="stone-card p-6 mb-6 flex items-center justify-center">
            <img
              src="/press/unifyone-logo.svg"
              alt="UnifyOne by 1Commerce logo"
              width={384}
              height={96}
              className="w-full max-w-sm h-auto"
            />
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ASSETS.map(asset => (
              <li key={asset.href}>
                <a
                  href={asset.href}
                  download
                  className="stone-card p-4 flex flex-col gap-1 cursor-pointer group"
                >
                  <span
                    className="font-cinzel text-sm font-600 tracking-widest group-hover:text-amber-400 transition-colors"
                    style={{ color: "#F0E8D0", letterSpacing: "0.08em" }}
                  >
                    {asset.label}
                  </span>
                  <span
                    className="font-crimson text-sm"
                    style={{ color: "#6A6A6A" }}
                  >
                    {asset.note}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Guide pages */}
        <section className="mt-16 pt-10" style={{ borderTop: SECTION_BORDER }}>
          <h2
            className="font-cinzel text-2xl font-700 mb-3"
            style={{ color: "#F0E8D0" }}
          >
            Reference guides
          </h2>
          <p
            className="font-crimson text-base mb-6"
            style={{ color: "#6A6A6A", lineHeight: 1.7 }}
          >
            In-depth pages on the problems UnifyOne solves — useful context for
            reviews and directory listings.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {GUIDE_LINKS.map(guide => (
              <li key={guide.href}>
                <Link href={guide.href}>
                  <span
                    className="font-cinzel text-sm tracking-widest cursor-pointer transition-colors"
                    style={{ color: "#9A9A9A", letterSpacing: "0.05em" }}
                  >
                    → {guide.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA strip */}
        <div
          className="mt-16 pt-10 flex flex-col sm:flex-row gap-4"
          style={{ borderTop: "1px solid #242424" }}
        >
          <Link href="/about">
            <span className="btn-illuminate cursor-pointer">
              About 1Commerce
            </span>
          </Link>
          <a href={`mailto:${PRESS_EMAIL}`} className="btn-ghost-gold">
            Contact Press →
          </a>
        </div>
      </article>
    </PublicLayout>
  );
}
