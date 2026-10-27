import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import MarketingFaq from "@/components/MarketingFaq";
import { MARKETING_FAQ } from "@/content/marketing";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";

const DESCRIPTION =
  "Record a work session, import an earnings statement, log expenses, and compare what you kept per hour. See how UnifyOne handles your gig-work records.";
const workflow = [
  {
    step: "01 · Record the work",
    title: "Clock a session. Or add one you already finished.",
    text: "Start the timer when you begin working. When you finish, enter pay, tips, bonuses and business miles. Forgot the timer? Add a completed delivery shift, rideshare session or client job with its start and end times.",
    detail:
      "Made a mistake? Correct a manually entered record in your work history. Timed sessions and statement imports keep their source labels.",
    action: "Add a completed session",
    destination: "/money-manager?add=work",
  },
  {
    step: "02 · Bring in a statement",
    title: "Check the CSV before it becomes part of your records.",
    text: "Upload an earnings CSV, choose its source and review the parsed rows. Check dates, amounts and flagged rows before saving the import. If an import fails, it does not leave a half-saved batch behind.",
    detail:
      "Statement earnings stay labeled as imports. They do not supply reliable work hours, and an imported payout may overlap a session you entered yourself. Review those overlaps before adding totals together.",
    action: "Review the import screen",
    destination: "/money-manager?tab=import",
  },
  {
    step: "03 · Record what it cost",
    title: "Fuel, fees, parking. Give each cost a date.",
    text: "Save an expense with its amount, category and date. Add a merchant or note when it helps explain the purchase. Review the period total or correct an entry in your expense history.",
    detail:
      "In Work Insights, choose either a per-mile vehicle estimate or your recorded vehicle costs. Saved fuel and maintenance are not deducted again on top of the mileage estimate.",
    action: "Open expenses",
    destination: "/work-expenses",
  },
  {
    step: "04 · Review the return on your time",
    title: "Compare work using the hours it actually took.",
    text: "Work Insights uses recorded earnings and working time to calculate an hourly result after your chosen costs and reserve. Search your history by source and date when you need to check the entries behind a number.",
    detail:
      "Pro members can review annual export coverage, then download accountant records as CSV or PDF. Work sessions, imports, expenses and mileage stay in separate ledgers. The packet is a record for review, not a completed tax return.",
    action: "Review work profitability",
    destination: "/work-insights",
  },
];
export default function TheSystem() {
  return (
    <PublicLayout>
      <PageHead
        title="How UnifyOne works | Work sessions, statements & expenses"
        description={DESCRIPTION}
        canonical={SITE_URL + "/the-system"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "How UnifyOne works",
            description: DESCRIPTION,
            url: SITE_URL + "/the-system",
          },
        ]}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">How it works</p>
          <h1>
            The payout is only
            <br />
            <em>part of the record.</em>
          </h1>
          <p className="marketing-lead">
            Put the hours, miles and expenses next to what you earned. Start
            with a timer, a completed job or a CSV statement. You do not need a
            bank or gig-platform connection to begin.
          </p>
          <div className="marketing-actions">
            <a className="marketing-button" href={getSignupUrl()}>
              Create an account <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <Link className="marketing-text-link" href="/tools/gig-hourly-rate">
              Try the hourly calculator first →
            </Link>
          </div>
        </header>
        <section
          className="marketing-section marketing-container"
          aria-label="From recording work to reviewing it"
        >
          <div className="space-y-16">
            {workflow.map(item => (
              <article className="marketing-story" key={item.step}>
                <div>
                  <p className="marketing-eyebrow">{item.step}</p>
                  <h2>{item.title}</h2>
                </div>
                <div>
                  <p>{item.text}</p>
                  <p>{item.detail}</p>
                  <a
                    href={getSignupUrl(undefined, item.destination)}
                    className="marketing-text-link"
                  >
                    {item.action} <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-section marketing-container marketing-faq-grid">
          <div>
            <p className="marketing-eyebrow">Before you start</p>
            <h2>
              Accounts, imports
              <br />
              and tax records.
            </h2>
          </div>
          <MarketingFaq items={MARKETING_FAQ} />
        </section>
      </div>
    </PublicLayout>
  );
}
