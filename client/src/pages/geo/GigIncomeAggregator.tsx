import ReadingLayout from "@/components/ReadingLayout";
import ResourceReview from "@/components/ResourceReview";
import { Link } from "wouter";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const CANONICAL = `${SITE_URL}/gig-income-aggregator`;
const TITLE = "Compare Gig Income: Earnings, Costs & Hours | UnifyOne";
const DESCRIPTION =
  "Combine gig-work records, reconcile CSV imports, and compare earnings after costs. Understand the difference between cash flow and tax deductions.";
const FAQS = [
  {
    q: "Does naming a platform connect my account?",
    a: "No. Choose a source label for manual work records or upload an earnings CSV and review its preview. A platform name in your records does not establish an API connection or automatic synchronization.",
  },
  {
    q: "Can imported statements duplicate my work sessions?",
    a: "Yes. An imported payout can describe the same earnings as a session you entered. Compare source dates and amounts before adding them together. Statement imports do not provide reliable working hours, so do not infer an hourly rate from payout totals alone.",
  },
  {
    q: "Is a mileage deduction a cash expense?",
    a: "No. The IRS mileage method is a tax calculation, not a measurement of cash spent. For planning, choose a vehicle-cost estimate or recorded vehicle costs. Do not subtract fuel again if it is already included in your estimate, and do not subtract both actual vehicle expenses and standard mileage for the same tax deduction.",
  },
  {
    q: "Does the result tell me exactly what tax I owe?",
    a: "No. A selected reserve percentage is a planning assumption. Taxable profit and final tax depend on eligibility rules, household income, credits, withholding and other factors. Keep records for tax preparation even if a platform sends no 1099.",
  },
];
const STEPS = [
  {
    heading: "Gather comparable records",
    body: "Choose the same date range for each source. Record gross pay, tips, bonuses, fees, work time and business miles. Save statements so you can explain differences between gross earnings and bank deposits.",
  },
  {
    heading: "Review imports and overlaps",
    body: "In UnifyOne, record a timed or completed work session, or preview an earnings CSV before saving it. Imports retain their source labels. Reconcile overlapping sessions, statements and deposits rather than treating each record as new income.",
  },
  {
    heading: "Separate cash planning from tax deductions",
    body: "Work Insights uses your chosen costs and reserve to estimate what remains. A per-mile vehicle-cost estimate is not automatically the IRS rate. Keep tax deductions separate from actual spending; neither a deduction nor a reserve is a tax payment.",
  },
  {
    heading: "Include the time the work took",
    body: "Record relevant waiting, travel between jobs and administration alongside paid work. Missing hours can inflate an hourly result. Compare similar periods and review unusual bonuses or costs before drawing conclusions about which work pays better.",
  },
];

export default function GigIncomeAggregator() {
  return (
    <ReadingLayout kind="article">
      <PageHead
        title={TITLE}
        description={DESCRIPTION}
        canonical={CANONICAL}
        jsonLd={[
          ...buildWebPageJsonLd({
            canonical: CANONICAL,
            name: TITLE,
            description: DESCRIPTION,
            breadcrumbs: [{ name: "Compare gig income", item: CANONICAL }],
          }),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          },
        ]}
      />
      <div className="reading-content">
        <header className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Income records
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Compare your gig income, costs and hours
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A useful comparison starts with complete records from the same
            period. Bring earnings together, account for costs once, and include
            the time you actually worked.
          </p>
        </header>
        <ResourceReview slug="gig-income-aggregator" />
        {STEPS.map(({ heading, body }) => (
          <section className="mb-8" key={heading}>
            <h2 className="text-xl font-semibold mb-3">{heading}</h2>
            <p className="text-muted-foreground leading-relaxed">{body}</p>
          </section>
        ))}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            An illustrative weekly comparison
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Suppose your records show $600 in earnings, $100 in vehicle costs
            and $20 in other costs for 20 hours of work. That leaves $480 before
            a tax reserve, or $24 per hour. If you choose a 25% reserve on that
            $480, the planning amount left is $360, or $18 per hour. These are
            example inputs, not typical earnings or a calculated tax rate.
          </p>
        </section>
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Common questions</h2>
          <div className="space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
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
            Sources and product scope
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The workflow described here covers manual sessions, CSV imports and
            recorded expenses. See the product walkthrough for account features
            and limits.
          </p>
          <ul className="space-y-3">
            <li>
              <Link className="text-primary underline" href="/the-system">
                How UnifyOne works
              </Link>
            </li>
            <li>
              <a
                className="text-primary underline"
                href="https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping"
              >
                IRS: Recordkeeping
              </a>
            </li>
            <li>
              <a
                className="text-primary underline"
                href="https://www.irs.gov/taxtopics/tc510"
              >
                IRS: Business use of a car
              </a>
            </li>
          </ul>
        </section>
        <section className="rounded-xl border bg-muted/30 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3">Try your own numbers</h2>
          <div className="flex flex-col gap-3">
            <Link
              className="text-primary underline"
              href="/tools/gig-hourly-rate"
            >
              Hourly earnings calculator
            </Link>
            <Link
              className="text-primary underline"
              href="/tools/earnings-consolidator"
            >
              Earnings consolidator
            </Link>
            <Link className="text-primary underline" href="/resources">
              Back to the guide library
            </Link>
          </div>
        </section>
        <p className="text-xs text-muted-foreground">
          Educational information. Planning results depend on the completeness
          of your records and chosen assumptions; they are not a tax return or
          financial advice.
        </p>
      </div>
    </ReadingLayout>
  );
}
