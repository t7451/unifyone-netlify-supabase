import { Link } from "wouter";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import LandingPricing from "@/components/landing/LandingPricing";
import MarketingFaq from "@/components/MarketingFaq";
import { PRICING_FAQ } from "@/content/marketing";
import { SITE_URL } from "@/lib/siteConfig";
import { GIG_PLAN_CATALOG } from "@shared/gigPricing";

const DESCRIPTION =
  "Compare UnifyOne plans: free shift tracking, mileage, and calculators, or Pro for $4.99 a month or $49 a year. See billing and AI allowances.";
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pricing | UnifyOne",
    url: SITE_URL + "/pricing",
    description: DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "UnifyOne",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: GIG_PLAN_CATALOG.map(plan => ({
      "@type": "Offer",
      name: plan.name,
      price: String(plan.monthlyPriceCents / 100),
      priceCurrency: "USD",
      url: SITE_URL + "/pricing",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(plan.monthlyPriceCents / 100),
        priceCurrency: "USD",
        unitText: "MONTH",
      },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRICING_FAQ.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

export default function Pricing() {
  return (
    <PublicLayout>
      <PageHead
        title="Pricing | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/pricing"}
        jsonLd={JSON_LD}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">UnifyOne plans</p>
          <h1>
            Good records.
            <br />
            <em>A clear price.</em>
          </h1>
          <p className="marketing-lead">
            Start with the essentials. Add unlimited history, a year-round tax
            dashboard, and more AI requests when you need them.
          </p>
        </header>
        <LandingPricing />
        <section className="marketing-section marketing-container marketing-faq-grid">
          <div>
            <p className="marketing-eyebrow">Before you choose</p>
            <h2>
              Know what
              <br />
              you’re signing up for.
            </h2>
            <Link href="/contact" className="marketing-text-link">
              Talk to the team →
            </Link>
          </div>
          <MarketingFaq items={PRICING_FAQ} />
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Take a look first</p>
            <h2>
              No account?
              <br />
              Still useful.
            </h2>
            <p>
              Try a public calculator before deciding whether tracking is right
              for you.
            </p>
            <Link href="/tools" className="marketing-button">
              Explore free tools →
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
