import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { trackOrganicLanding } from "@/lib/userTracking";
import { useEffect, useState } from "react";
import { ArrowUpRight, Calculator, Search } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

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
    tagline: "Explore an estimate for your quarterly federal tax planning.",
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
    tagline: "Estimate self-employment tax and see how the calculation works.",
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
  {
    slug: "tax-set-aside",
    title: "1099 Tax Set-Aside Calculator",
    tagline: "Explore a starting point for your tax set-aside.",
    description:
      "Enter your net income, filing status, and state rate to get a personalized set-aside percentage combining SE tax, federal income tax, and state tax — plus the dollar amount to save per payment.",
    audience:
      "1099 gig workers and freelancers who want to avoid a tax-time surprise",
    keywords: [
      "how much to set aside for taxes 1099",
      "gig worker tax savings",
      "self-employment tax set aside",
      "1099 tax percentage",
    ],
    live: true,
  },
  {
    slug: "route-pulse",
    title: "RoutePulse — AI Route & Incident Checker",
    tagline: "Review route and incident information before a trip.",
    description:
      "Enter an origin and destination to get an AI-scored route with live incident data factored in, plus a plain-language explanation of what to watch for.",
    audience: "Rideshare and delivery drivers planning a route",
    keywords: [
      "route intelligence",
      "traffic incident checker",
      "gig driver route planner",
      "AI route explanation",
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
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visibleTools = TOOLS_REGISTRY.filter(tool =>
    (tool.title + " " + tool.tagline + " " + tool.keywords.join(" "))
      .toLowerCase()
      .includes(query)
  );
  useEffect(() => {
    trackOrganicLanding("/tools");
  }, []);
  return (
    <PublicLayout>
      <PageHead
        title="Free calculators for independent work | UnifyOne"
        description="Explore free calculators for gig earnings, mileage, tax planning, pricing, and cash flow. Enter your own numbers to see an estimate."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">The free toolkit</p>
          <h1>
            Bring your numbers.
            <br />
            <em>Find a clearer answer.</em>
          </h1>
          <p className="marketing-lead">
            A useful starting point for earnings, expenses, and planning.
            Explore the calculators without creating an account.
          </p>
        </header>
        <section
          className="marketing-library marketing-container"
          aria-label="Browse free tools"
        >
          <label className="marketing-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search free tools</span>
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search mileage, hourly rate, taxes…"
            />
          </label>
          <p className="marketing-result-count" role="status">
            {visibleTools.length} {visibleTools.length === 1 ? "tool" : "tools"}
          </p>
          {visibleTools.length ? (
            <div className="marketing-tool-grid">
              {visibleTools.map(tool =>
                tool.live ? (
                  <Link
                    key={tool.slug}
                    href={"/tools/" + tool.slug}
                    className="marketing-tool-card"
                  >
                    <Calculator size={22} aria-hidden="true" />
                    <h2>{tool.title}</h2>
                    <p>{tool.tagline}</p>
                    <span>
                      Open tool <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                ) : (
                  <article className="marketing-tool-card" key={tool.slug}>
                    <h2>{tool.title}</h2>
                    <p>{tool.tagline}</p>
                    <span>Coming soon</span>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="marketing-empty">
              <h2>No matching tools.</h2>
              <p>Try another phrase or see the full toolkit.</p>
              <button
                type="button"
                className="marketing-button marketing-button-outline"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            </div>
          )}
          <p className="marketing-library-note">
            Results depend on the numbers you enter. Estimates support planning
            and do not replace professional tax, legal, or financial advice.
          </p>
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Build on what you learn</p>
            <h2>
              One calculation today.
              <br />A better habit tomorrow.
            </h2>
            <p>
              Keep a record of your work with a free account, or explore the
              guide library.
            </p>
            <div className="marketing-actions">
              <Link href="/register" className="marketing-button">
                Start tracking for free →
              </Link>
              <Link href="/resources" className="marketing-text-link">
                Read the guides →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
