import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-worker-tax-deductions`;

/** The deductions gig workers most commonly miss, as a scannable checklist. */
const DEDUCTIONS = [
  {
    title: "Business mileage",
    body: "Usually the single largest deduction. Track every mile driven while working — to pickups, between deliveries, and back to your zone. Pick ONE method per vehicle for the year: the IRS standard mileage rate (70¢/mile for 2025) or the actual-expense method (the business-use share of gas, insurance, repairs, and depreciation). You cannot combine them.",
  },
  {
    title: "Phone & data",
    body: "Your phone is essential to the work, so the business-use percentage of your bill is deductible. If you use your phone 60% for gig work, deduct 60% of the bill. Mounts, chargers, and a second line used only for gigs count too.",
  },
  {
    title: "Hot bags, coolers & equipment",
    body: "Insulated delivery bags, drink carriers, coolers, dollies, and other gear bought for the work are deductible. Smaller items are deducted in full the year you buy them.",
  },
  {
    title: "Tolls & parking",
    body: "Tolls and parking fees paid while actively working are deductible — but commuting tolls and routine parking at home are not. Tolls and parking are deductible on top of the standard mileage rate; they are not bundled into it.",
  },
  {
    title: "Platform fees & commissions",
    body: "Service fees and commissions a platform takes out of your pay reduce your taxable income. If your 1099 reports gross amounts before fees, deducting the fees keeps you from paying tax on money you never kept.",
  },
  {
    title: "Supplies",
    body: "Hand sanitizer, masks, phone mounts, pens, printer paper, shopping totes, and other consumables used for the work are deductible business supplies. Keep the receipts.",
  },
  {
    title: "Self-employed health insurance",
    body: "If you pay your own health insurance premiums and aren't eligible for a spouse's or employer's plan, the self-employed health insurance deduction can lower your taxable income. It's an above-the-line deduction, subject to limits — confirm eligibility with the IRS.",
  },
  {
    title: "Half of self-employment tax",
    body: "You owe the full 15.3% self-employment tax (Social Security + Medicare) because no employer covers half. The IRS lets you deduct the employer-equivalent half — an above-the-line deduction you take whether or not you itemize.",
  },
  {
    title: "Home office",
    body: "Only if you have a space used regularly AND exclusively for your business — a corner used for admin work, not the kitchen table you also eat at. If you qualify, the simplified method deducts a flat rate per square foot. Most drivers won't qualify; claim it carefully.",
  },
];

/** Questions answer engines get asked about gig-worker deductions. */
const FAQS = [
  {
    q: "Can I deduct mileage AND gas?",
    a: "No. You pick one method per vehicle for the year. The standard mileage rate already bundles gas, depreciation, insurance, and maintenance into a per-mile figure, so you can't also deduct those actual costs on top of it. The alternative is the actual-expense method, where you deduct the business-use share of gas, repairs, insurance, and depreciation instead of using the rate. Tolls and parking are deductible under either method.",
  },
  {
    q: "What's the standard mileage rate?",
    a: "It's a per-mile amount the IRS sets each year that you multiply by your business miles to get your deduction — it bundles gas, depreciation, insurance, and upkeep into one number. The business rate is 70¢ per mile for 2025. The IRS updates it annually, so always confirm the current year's rate on the IRS Standard Mileage Rates page before you file.",
  },
  {
    q: "Can gig workers deduct their phone?",
    a: "Yes, but only the business-use share. Estimate what percentage of your phone and data use is for gig work and deduct that percentage of the bill. If your phone is used 100% for the business (for example, a dedicated second line), the full cost is deductible.",
  },
  {
    q: "Do I need receipts to claim deductions?",
    a: "Yes. The IRS expects you to substantiate expenses, so keep receipts and a contemporaneous mileage log — records created at the time, not reconstructed in April. A mileage log should note the date, miles, and business purpose of each trip. Keep records for at least three years after filing.",
  },
  {
    q: "Can I take the home office deduction as a gig driver?",
    a: "Only if part of your home is used regularly and exclusively for the business — for example, a dedicated area for managing orders, accounting, and supplies. Because most of a delivery driver's work happens in the car, many won't meet the exclusive-use test. If you do qualify, the simplified method deducts a flat rate per square foot.",
  },
];

const jsonLd = [
  ...buildWebPageJsonLd({
    canonical: CANONICAL,
    name: "Gig Worker Tax Deductions: The Complete Checklist | UnifyOne",
    description:
      "The deductible business expenses gig workers most often miss — mileage, phone, hot bags, tolls, platform fees, health insurance, half of SE tax, and home office.",
    breadcrumbs: [
      { name: "Gig Worker Taxes", item: `${SITE_URL}/gig-taxes` },
      { name: "Tax Deductions Checklist", item: CANONICAL },
    ],
  }),
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

const IRS_LINKS = [
  {
    label: "IRS: Self-Employed Individuals Tax Center",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center",
  },
  {
    label: "IRS: Standard Mileage Rates",
    href: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  {
    label: "IRS: Deducting Business Expenses",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/deducting-business-expenses",
  },
  {
    label: "IRS: Home Office Deduction",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction",
  },
  {
    label: "IRS: Self-Employment Tax (Social Security and Medicare)",
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes",
  },
];

/**
 * Spoke page in the gig-tax topic cluster: a complete, scannable checklist of
 * the deductions 1099 gig workers most commonly miss. Pairs a deductions grid
 * with recordkeeping guidance, a FAQPage block for answer engines, and links
 * back to the pillar (/gig-taxes) and the mileage calculator.
 */
export default function GigDeductionsGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Gig Worker Tax Deductions: The Complete Checklist | UnifyOne"
        description="The business expenses gig workers most often miss: mileage, phone, hot bags, tolls, platform fees, health insurance, half of SE tax & home office."
        canonical={CANONICAL}
        ogType="article"
        jsonLd={jsonLd}
      />

      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Home
          </Link>
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Free Tools
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Gig Tax Guide
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Gig Worker Tax Deductions: The Complete Checklist
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            As a 1099 gig worker you're taxed on profit, not gross payouts — so
            every legitimate business expense you track lowers the income you
            pay tax on. The problem is that most drivers leave money on the
            table by missing deductions they're entitled to. Here's the complete
            checklist, plus how to keep records the IRS will accept.
          </p>
          <p className="mt-4">
            <Link
              href="/gig-taxes"
              className="text-sm text-primary hover:underline"
            >
              ← Part of the complete Gig Worker Taxes guide
            </Link>
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            The deductions checklist
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            These are the expenses gig workers most commonly overlook. Deduct
            only the business-use portion of anything you also use personally.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {DEDUCTIONS.map(({ title, body }) => (
              <div key={title} className="rounded-lg border p-4">
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 mb-10 space-y-3">
          <h2 className="text-xl font-semibold">
            Mileage: pick one method, not both
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For your vehicle you choose either the standard mileage rate or the
            actual-expense method for the year — you can't use both for the same
            car. The standard mileage rate (70¢/mile for 2025) multiplies your
            business miles by a single per-mile figure that already includes
            gas, depreciation, insurance, and maintenance. The actual-expense
            method instead deducts the business-use share of those real costs.
            For most drivers the standard mileage rate is both simpler and
            larger, which is why mileage is usually the biggest deduction of
            all. The IRS sets the rate annually, so confirm the current figure
            before you file.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Recordkeeping: track it as you go
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Deductions only count if you can back them up. The IRS expects a
            contemporaneous mileage log — records created at the time you drive,
            not reconstructed from memory in April. For each trip note the date,
            the miles, and the business purpose.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Keep receipts for every expense you deduct (phone bills, equipment,
            tolls, supplies) and hold onto your records for at least three years
            after you file. A simple habit of logging miles and saving receipts
            all year is what turns these deductions into real tax savings.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Put a number on your mileage
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/mileage-deduction-calculator"
              className="rounded-lg border p-4 hover:bg-muted transition-colors block"
            >
              <p className="text-sm font-medium">
                Mileage Deduction Calculator →
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Turn your business miles into a dollar deduction
              </p>
            </Link>
            <Link
              href="/gig-taxes"
              className="rounded-lg border p-4 hover:bg-muted transition-colors block"
            >
              <p className="text-sm font-medium">Gig Worker Taxes guide →</p>
              <p className="text-xs text-muted-foreground mt-1">
                SE tax, 1099 forms, and quarterly payments
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border-b pb-6 last:border-0">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Authoritative IRS resources
          </h2>
          <ul className="space-y-2">
            {IRS_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-muted/30 p-6 text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Stop leaving deductions on the table
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            UnifyOne tracks your miles, platform fees, and expenses across every
            app automatically — so your deductions are captured all year, not
            scrambled together at tax time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start tracking free →
            </Link>
            <Link
              href="/tools/mileage-deduction-calculator"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Try the mileage calculator
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          This checklist is educational information, not tax advice. Deduction
          rules, eligibility, and the IRS standard mileage rate change yearly
          and depend on your situation — confirm current figures with the IRS or
          a qualified tax professional before you file.
        </p>
      </main>
    </div>
  );
}
