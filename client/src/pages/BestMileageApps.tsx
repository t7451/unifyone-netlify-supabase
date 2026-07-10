import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import PartnerOffers from "@/components/PartnerOffers";
import AdSlot from "@/components/AdSlot";
import ToolEmailCapture from "@/components/ToolEmailCapture";

const CANONICAL = `${SITE_URL}/best-mileage-tracking-apps`;

/**
 * BestMileageApps -- comparison / answer-engine page targeting
 * "best mileage tracking apps for gig workers 2026".
 *
 * Pricing and the IRS rate below are verified as of 2026 (see sources in the
 * page). Figures are described as current-year and qualified because app
 * pricing changes -- keep them truthful (YMYL). Monetized via disclosed
 * PartnerOffers (mileage category) plus optional display ads.
 */

interface AppRow {
  name: string;
  free: string;
  paid: string;
  best: string;
}

const APPS: AppRow[] = [
  {
    name: "Stride",
    free: "Fully free",
    paid: "None",
    best: "Drivers who want zero cost and simple tax write-off tracking",
  },
  {
    name: "Everlance",
    free: "Free up to 30 trips/mo",
    paid: "~$9-12/mo",
    best: "Automatic GPS tracking plus expense and revenue logging",
  },
  {
    name: "Hurdlr",
    free: "Free tier",
    paid: "~$10/mo",
    best: "Real-time quarterly tax liability as you earn",
  },
  {
    name: "MileIQ",
    free: "Free up to 40 drives/mo",
    paid: "~$13.99/mo",
    best: "Simple swipe-to-classify mileage (mileage only)",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is the best mileage tracking app for gig workers in 2026?",
    a: "There is no single winner -- it depends on cost and features. Stride is the best fully-free option. Everlance and Hurdlr add automatic GPS tracking, expense logging, and (for Hurdlr) real-time tax estimates on paid plans of roughly $9-12/month. MileIQ focuses on mileage only and is now among the pricier options at about $13.99/month after 2026 price increases.",
  },
  {
    q: "What is the IRS mileage rate for 2026?",
    a: "The IRS standard mileage rate for business use in 2026 is 72.5 cents per mile, up 2.5 cents from 70 cents in 2025. Gig drivers can deduct this rate for every business mile, which usually beats deducting actual vehicle expenses.",
  },
  {
    q: "Do I still need to keep a mileage log if I use an app?",
    a: "Yes. The IRS requires a contemporaneous record of dates, miles, and business purpose. A tracking app creates that log automatically, which is the main reason to use one instead of reconstructing miles at tax time.",
  },
  {
    q: "Can I calculate my mileage deduction without an app?",
    a: "Yes -- use our free Mileage & Deduction Calculator to estimate your deduction and tax savings from total business miles. An app just automates the logging so you do not miss miles during the year.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Best Mileage Tracking Apps for Gig Workers (2026)",
    description:
      "An honest 2026 comparison of Stride, Everlance, Hurdlr, and MileIQ for gig and 1099 drivers, plus the 72.5-cent IRS mileage rate.",
    breadcrumbs: [
      { name: "Guides", item: `${SITE_URL}/seo` },
      { name: "Best Mileage Tracking Apps", item: CANONICAL },
    ],
  }),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function BestMileageApps() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Best Mileage Tracking Apps for Gig Workers (2026)"
        description="Honest 2026 comparison of Stride, Everlance, Hurdlr & MileIQ for gig drivers, plus the 72.5-cent IRS mileage rate and a free deduction calculator."
        canonical={CANONICAL}
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li>&rsaquo;</li>
            <li>
              <Link href="/seo" className="hover:text-foreground">
                Guides
              </Link>
            </li>
            <li>&rsaquo;</li>
            <li className="text-foreground">Best Mileage Tracking Apps</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight">
          Best Mileage Tracking Apps for Gig Workers (2026)
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          If you drive for DoorDash, Uber, Lyft, Instacart, or Amazon Flex, a
          mileage app is the difference between deducting every business mile
          and guessing at tax time. At the 2026 IRS rate of{" "}
          <strong className="text-foreground">72.5 cents per mile</strong>, even
          a few hundred untracked miles a month is real money. Here is an honest
          rundown of the main options.
        </p>

        <AdSlot slotId="mileage-top" label="Advertisement" />

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Quick comparison</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-semibold">App</th>
                  <th className="py-2 pr-4 font-semibold">Free tier</th>
                  <th className="py-2 pr-4 font-semibold">Paid</th>
                  <th className="py-2 font-semibold">Best for</th>
                </tr>
              </thead>
              <tbody>
                {APPS.map(a => (
                  <tr key={a.name} className="border-b align-top">
                    <td className="py-3 pr-4 font-medium">{a.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.free}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.paid}</td>
                    <td className="py-3 text-muted-foreground">{a.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Pricing is approximate and current as of 2026 -- app plans change
            often, so confirm the latest price on each provider&apos;s site
            before subscribing.
          </p>
        </section>

        <PartnerOffers
          categories={["mileage", "tax-software"]}
          limit={2}
          heading="Start tracking your miles"
        />

        <section className="mt-12">
          <h2 className="text-xl font-semibold">
            How to choose (30-second version)
          </h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <strong className="text-foreground">Want free?</strong> Start with
              Stride -- it costs nothing and covers mileage plus common
              write-offs.
            </li>
            <li>
              <strong className="text-foreground">
                Want automatic tracking + expenses?
              </strong>{" "}
              Everlance or Hurdlr. Hurdlr adds a live quarterly-tax estimate as
              you earn.
            </li>
            <li>
              <strong className="text-foreground">
                Just want simple swipe-to-classify?
              </strong>{" "}
              MileIQ does one thing well, but it is now the priciest for
              mileage-only tracking.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">
            See your deduction before you pick an app
          </h2>
          <p className="mt-3 text-muted-foreground">
            Our free{" "}
            <Link
              href="/tools/mileage-deduction-calculator"
              className="font-medium text-primary hover:underline"
            >
              Mileage &amp; Deduction Calculator
            </Link>{" "}
            turns your business miles into an estimated deduction and tax savings
            at the 2026 IRS rate -- no account required. Then let an app keep the
            log running all year.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <dl className="mt-4 space-y-6">
            {FAQ.map(f => (
              <div key={f.q}>
                <dt className="font-medium text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ToolEmailCapture
          source="content:best-mileage-tracking-apps"
          heading="Get the gig-worker tax cheat sheet"
          subheading="The deductions most drivers miss, plus quarterly deadline reminders. No spam, unsubscribe anytime."
          cta="Send it to me"
        />

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground/70">
          Educational information only, not financial or tax advice. Confirm
          current pricing and IRS rules with each provider and the IRS. Some
          links are partner/affiliate links; we may earn a commission at no
          extra cost to you.
        </p>
      </main>
    </div>
  );
}
