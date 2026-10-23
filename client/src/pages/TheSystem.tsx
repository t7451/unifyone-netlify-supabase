import { Link } from "wouter";
import { ArrowUpRight, MapPinned, ReceiptText, Wallet } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import MarketingFaq from "@/components/MarketingFaq";
import { MARKETING_FAQ } from "@/content/marketing";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";

const DESCRIPTION =
  "See how UnifyOne helps independent workers log shifts, understand earnings after expenses, record mileage, and plan for taxes.";
export default function TheSystem() {
  return (
    <PublicLayout>
      <PageHead
        title="How UnifyOne works | Earnings, mileage & tax planning"
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
            One working week.
            <br />
            <em>A more useful record.</em>
          </h1>
          <p className="marketing-lead">
            Start with what you earned. Add the time, mileage, and expenses
            behind it. Use the picture you build to plan ahead.
          </p>
        </header>
        <section className="marketing-section marketing-container">
          <div className="marketing-feature-grid">
            {[
              {
                icon: Wallet,
                title: "01 · Log your work",
                text: "Create a free account and start a record for your shifts or jobs. Keep earnings from different platforms and clients in one place.",
              },
              {
                icon: MapPinned,
                title: "02 · Include the costs",
                text: "Keep mileage and expenses alongside your income. Review the record instead of relying on the gross payout alone.",
              },
              {
                icon: ReceiptText,
                title: "03 · Plan what comes next",
                text: "Use the calculators to explore take-home pay and tax estimates. Review your history and keep building the habit.",
              },
            ].map(item => (
              <article className="marketing-feature-card" key={item.title}>
                <item.icon size={26} aria-hidden="true" />
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-workflow">
          <div className="marketing-section marketing-container marketing-story">
            <div>
              <p className="marketing-eyebrow">Start without an account</p>
              <h2>
                A quick calculation
                <br />
                can be a useful first step.
              </h2>
            </div>
            <div>
              <p>
                Want to understand one shift before you commit to a tracking
                routine? The public calculators let you work through earnings,
                mileage, and tax-planning questions right away.
              </p>
              <Link
                href="/tools/gig-hourly-rate"
                className="marketing-text-link"
              >
                Try the real hourly rate calculator{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
        <section className="marketing-section marketing-container marketing-faq-grid">
          <div>
            <p className="marketing-eyebrow">Know what to expect</p>
            <h2>
              A few practical
              <br />
              questions, answered.
            </h2>
          </div>
          <MarketingFaq items={MARKETING_FAQ} />
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Start simply</p>
            <h2>
              Your next shift.
              <br />
              Your first clear record.
            </h2>
            <div className="marketing-actions">
              <a className="marketing-button" href={getSignupUrl()}>
                Start free <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <Link className="marketing-text-link" href="/pricing">
                Compare plans →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
