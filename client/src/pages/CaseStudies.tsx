import { Link } from "wouter";
import ReadingLayout from "@/components/ReadingLayout";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
const DESCRIPTION =
  "Illustrative workflows for comparing gig earnings, keeping mileage records, and planning irregular income with UnifyOne's free tools.";
const EXAMPLES = [
  {
    id: "multi-app-driver-earnings",
    title: "Compare two kinds of work",
    text: "Record earnings, hours, and work-related miles for the same week. Use consistent earnings definitions across platforms, and include waiting time in your hours.",
    result:
      "Compare the hourly estimates, then check whether the mileage cost proxy matches your actual vehicle expenses. A higher past result does not guarantee future pay.",
    href: "/tools/gig-hourly-rate",
    cta: "Compare hourly earnings",
  },
  {
    id: "rideshare-driver-deductions",
    title: "Keep a usable mileage record",
    text: "Keep a dated record of each business trip, its destination, purpose, and miles. Separate commuting and personal driving from eligible business trips.",
    result:
      "Enter eligible miles into the calculator to explore a deduction estimate. A deduction reduces taxable income; it is not a cash payment or a verified trip log.",
    href: "/tools/mileage-deduction-calculator",
    cta: "Estimate a mileage deduction",
  },
  {
    id: "freelancer-quarterly-taxes",
    title: "Revisit a tax set-aside",
    text: "Start with a profit estimate after deductible business expenses. Review the calculator's tax year and assumptions before entering your numbers.",
    result:
      "Use the estimate as a planning starting point. Revisit it when income changes, and check your full tax situation before making payments.",
    href: "/tools/tax-set-aside",
    cta: "Explore a tax set-aside",
  },
  {
    id: "gigiq-best-paying-zones",
    title: "Plan around uneven paydays",
    text: "Look at the timing of your income alongside essential bills, work expenses, and money reserved for taxes. Compare a slow week with a busier one.",
    result:
      "A cash-flow record can help you spot a gap early and decide how much room you have for a buffer.",
    href: "/tools/cashflow-tracker",
    cta: "Try the cash-flow tracker",
  },
];
export default function CaseStudies() {
  return (
    <ReadingLayout kind="reference">
      <PageHead
        title="Workflow examples | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/documents/case-studies"}
      />
      <article className="reading-content">
        <header>
          <span className="marketing-eyebrow">Practical examples</span>
          <h1>Turn a record into a next step.</h1>
          <p>
            These are illustrative workflows, not customer testimonials or
            measured outcomes. Use your own records and check each tool's
            assumptions.
          </p>
        </header>
        {EXAMPLES.map(example => (
          <section key={example.id} id={example.id}>
            <h2>{example.title}</h2>
            <p>{example.text}</p>
            <p>{example.result}</p>
            <Link className="reference-inline-link" href={example.href}>
              {example.cta} →
            </Link>
          </section>
        ))}
        <aside className="reference-note">
          <h2>Make the record a habit.</h2>
          <p>
            The guide library covers bookkeeping, budgeting, and other questions
            that come up between paydays.
          </p>
          <Link href="/resources">Read the guides →</Link>
        </aside>
      </article>
    </ReadingLayout>
  );
}
