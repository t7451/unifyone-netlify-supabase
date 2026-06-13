import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackOrganicLanding } from "@/lib/userTracking";
import { useEffect } from "react";

/** Metadata shape for a free tool listing. */
interface ToolMeta {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** Who benefits most from this tool. */
  audience: string;
  /** Free-form keywords for the tool's schema.org description. */
  keywords: string[];
  /** Whether this tool is live and linked. */
  live: boolean;
}

/**
 * TOOLS_REGISTRY — the single source of truth for /tools.
 * Add new tools here once Keith confirms the pivot direction (WS2).
 * Each entry: unique slug, distinct search query, live=false until reviewed.
 */
const TOOLS_REGISTRY: ToolMeta[] = [
  {
    slug: "mileage-deduction-calculator",
    title: "Gig Worker Mileage & Deduction Calculator",
    tagline:
      "Estimate your IRS mileage deduction for Uber, DoorDash, and other gig apps",
    description:
      "Enter your miles driven and app income to calculate the current IRS standard mileage deduction. Works for all 1099 gig workers.",
    audience: "Rideshare and delivery drivers, gig workers",
    keywords: [
      "mileage deduction",
      "1099 gig worker",
      "IRS mileage rate",
      "tax deduction calculator",
    ],
    live: true,
  },
  {
    slug: "earnings-consolidator",
    title: "Multi-Platform Earnings Consolidator",
    tagline:
      "Add up your true hourly rate across Uber, DoorDash, Etsy, eBay, and more",
    description:
      "Enter gross earnings from each gig platform, plus time spent and estimated expenses, and see your real take-home hourly rate after all deductions.",
    audience: "Gig workers with multiple income streams",
    keywords: [
      "gig earnings calculator",
      "multi-platform income",
      "true hourly rate",
      "side hustle income",
    ],
    live: true,
  },
  {
    slug: "quarterly-tax-estimator",
    title: "Quarterly Estimated Tax Estimator — 1099 Self-Employed",
    tagline: "Never miss a quarterly IRS payment. Know exactly what you owe.",
    description:
      "Based on your net self-employment income, calculate your Q1–Q4 estimated tax payments using the IRS safe-harbor method.",
    audience: "Freelancers, contractors, gig workers, side-hustle earners",
    keywords: [
      "quarterly estimated tax",
      "self-employed tax calculator",
      "1099 taxes",
      "safe harbor",
    ],
    live: true,
  },
  {
    slug: "reseller-break-even",
    title: "Reseller Break-Even & Pricing Calculator",
    tagline:
      "Find your minimum sale price on eBay, Etsy, Amazon FBA, or any marketplace",
    description:
      "Enter item cost, marketplace fees, shipping, and returns rate to calculate your break-even price and target margin.",
    audience: "eBay, Etsy, and Amazon resellers; e-commerce sellers",
    keywords: [
      "reseller break-even calculator",
      "marketplace fee calculator",
      "eBay pricing",
      "Etsy fees",
    ],
    live: true,
  },
  {
    slug: "cashflow-tracker",
    title: "Payout Timing & Cash-Flow Tracker",
    tagline: "Model when your gig platform payouts actually hit your bank",
    description:
      "Each app pays on different schedules. Enter your platforms and estimated weekly earnings to see a 30-day cash-flow forecast.",
    audience: "Full-time gig workers managing cash flow",
    keywords: [
      "gig payout schedule",
      "cash flow tracker",
      "gig worker finances",
      "income timing",
    ],
    live: true,
  },
  {
    slug: "se-tax-calculator",
    title: "Self-Employment Tax Calculator — 1099 Gig Workers",
    tagline:
      "See exactly how much SE tax you owe, your deductible half, and quarterly payment amounts",
    description:
      "Enter your net self-employment income to calculate Social Security + Medicare tax (15.3%), the deductible half that lowers your AGI, and how much to pay each quarter.",
    audience: "1099 contractors, freelancers, gig workers",
    keywords: [
      "self-employment tax calculator",
      "SE tax 1099",
      "gig worker taxes",
      "Schedule SE",
    ],
    live: true,
  },
  {
    slug: "gig-hourly-rate",
    title: "Gig Worker Real Hourly Rate Calculator",
    tagline:
      "Find your true effective hourly rate across DoorDash, Uber Eats, Instacart, and more",
    description:
      "Enter gross earnings, hours, and miles per platform to calculate your real net hourly rate after vehicle costs. Compare platforms side by side to see where your time pays most.",
    audience: "Delivery drivers and gig workers on multiple platforms",
    keywords: [
      "gig worker hourly rate",
      "DoorDash earnings calculator",
      "true hourly rate",
      "earnings optimizer",
    ],
    live: true,
  },
];

const CANONICAL = `${SITE_URL}/tools`;

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Free Tools for Gig Workers & Sellers | UnifyOne",
    description:
      "Free calculators and estimators for 1099 gig workers, resellers, and multi-platform sellers. No account required.",
    breadcrumbs: [{ name: "Free Tools", item: CANONICAL }],
  }),
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free Tools for Gig Workers and Sellers",
    description:
      "Standalone free calculators and estimators. No account required.",
    numberOfItems: TOOLS_REGISTRY.filter(t => t.live).length,
    itemListElement: TOOLS_REGISTRY.filter(t => t.live).map((tool, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "WebApplication",
        name: tool.title,
        url: `${SITE_URL}/tools/${tool.slug}`,
        description: tool.description,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    })),
  },
];

export default function ToolsIndex() {
  useEffect(() => {
    trackOrganicLanding("/tools");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Free Tools for Gig Workers & Sellers | UnifyOne"
        description="Free tools for 1099 gig workers: mileage, quarterly tax, earnings consolidation, break-even pricing, and cash-flow tracking. No account required."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="border-b bg-muted/30 py-14 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-3">
            Free Tools
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Calculators & Estimators for Independent Earners
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Standalone tools for 1099 gig workers, multi-platform sellers, and
            side-hustle earners. Real computed output — not guesses. No account
            required.
          </p>
        </div>
      </section>

      {/* Tool grid */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS_REGISTRY.map(tool => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Conversion CTA — separate from tool content, clearly marked */}
      <section className="border-t bg-muted/20 py-12 px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-xl font-semibold mb-2">
            Save your results to a dashboard
          </h2>
          <p className="text-muted-foreground mb-6">
            Create a free UnifyOne account to store calculations, track earnings
            across platforms, and get quarterly tax reminders automatically.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* FAQ — boosts AI citation */}
      <section className="border-t py-12 px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Faq
              q="Are these tools really free?"
              a="Yes. All calculators on this page work without an account. You can optionally sign up to save results to a dashboard, but every tool produces real computed output for free."
            />
            <Faq
              q="Do the tools work for all gig platforms?"
              a="Yes. The tools are platform-agnostic — enter numbers from Uber, DoorDash, Etsy, eBay, Amazon, or any other platform. The mileage calculator uses the current IRS standard rate."
            />
            <Faq
              q="How accurate is the quarterly tax estimator?"
              a="It uses the IRS safe-harbor method (pay 100% of last year's tax or 90% of this year's, whichever is smaller). It is an estimate — consult a CPA for your specific situation."
            />
            <Faq
              q="What is UnifyOne?"
              a="UnifyOne is a multi-tenant e-commerce and gig-income management platform built for independent operators. It unifies sales channels, income streams, and operations in one workspace. These free tools are a standalone subset of its financial-management features."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolMeta }) {
  const inner = (
    <div className="group rounded-lg border bg-card p-6 flex flex-col gap-3 h-full transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
          {tool.title}
        </h2>
        {!tool.live && (
          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
            Coming soon
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground flex-1">{tool.tagline}</p>
      <p className="text-xs text-muted-foreground/70">{tool.audience}</p>
    </div>
  );

  if (!tool.live)
    return <div className="opacity-70 cursor-default">{inner}</div>;
  return <Link href={`/tools/${tool.slug}`}>{inner}</Link>;
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-medium mb-1">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
