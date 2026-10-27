import { Link } from "wouter";
import { ArrowDown, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import MarketingFaq from "@/components/MarketingFaq";
import { getSignupUrl } from "@/const";
import {
  HOME_TITLE,
  HOME_DESCRIPTION,
  MARKETING_FAQ,
} from "@/content/marketing";
import { SITE_URL } from "@/lib/siteConfig";
import { GIG_PLAN_BY_SLUG, formatGigPrice } from "@shared/gigPricing";

const tools = [
  {
    number: "01",
    title: "What did that job actually pay?",
    text: "Compare earnings after work costs and the reserve you choose.",
    label: "Hourly rate calculator",
    href: "/tools/gig-hourly-rate",
  },
  {
    number: "02",
    title: "How much mileage did you log?",
    text: "Estimate eligible business-mile deductions using the date you drove.",
    label: "Mileage calculator",
    href: "/tools/mileage-deduction-calculator",
  },
  {
    number: "03",
    title: "What should you put aside?",
    text: "Try a tax set-aside scenario with your own income and assumptions.",
    label: "Set-aside calculator",
    href: "/tools/tax-set-aside",
  },
];
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL + "/",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: MARKETING_FAQ.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

export default function Home() {
  return (
    <PublicLayout>
      <PageHead
        title={HOME_TITLE}
        description={HOME_DESCRIPTION}
        canonical={SITE_URL + "/"}
        jsonLd={jsonLd}
      />
      <div className="marketing-page work-front">
        <section
          className="work-intro marketing-container"
          aria-labelledby="home-heading"
        >
          <div className="work-intro-top">
            <p className="work-kicker">Delivery. Rideshare. Client work.</p>
            <span className="work-edition">Your work, on the record.</span>
          </div>
          <div className="work-intro-grid">
            <h1 id="home-heading">
              Know what
              <br />
              your work
              <br />
              <span>really pays.</span>
            </h1>
            <div className="work-intro-copy">
              <p>
                Track the hours, miles and costs behind every payout. Put
                delivery runs, rideshare shifts and client work in the same work
                log.
              </p>
              <a className="marketing-button" href={getSignupUrl()}>
                Start your work log{" "}
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <p className="work-start-note">
                <Check size={15} aria-hidden="true" /> Free plan. No credit card
                to start.
              </p>
              <Link href="/tools/gig-hourly-rate" className="work-quiet-link">
                Just checking a number? Try the calculator{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <figure className="work-product-shot">
            <div className="work-shot-label">
              <span>
                <span className="work-status-dot" /> Inside UnifyOne / Work
                insights
              </span>
              <a href="#working-week">
                Take a closer look <ArrowDown size={14} aria-hidden="true" />
              </a>
            </div>
            <img
              src="/images/product/work-insights-desktop.webp"
              alt="UnifyOne Work insights showing recorded earnings, estimated costs, hourly return and source comparisons for an example workspace."
              width="1360"
              height="920"
              fetchPriority="high"
            />
            <figcaption>
              Actual product screen, sample records. Costs and reserve
              percentages are editable planning inputs.
            </figcaption>
          </figure>
        </section>

        <section className="work-record-band" aria-label="Work records">
          <div className="marketing-container">
            <p>
              One record for the work
              <br />
              you do across the week.
            </p>
            <div>
              <span>HOURS</span>
              <span>PAY</span>
              <span>MILES</span>
              <span>COSTS</span>
            </div>
          </div>
        </section>

        <section id="working-week" className="work-week marketing-container">
          <div className="work-section-label">
            <span>01 / THE WORK LOG</span>
            <span>Keep the details. Drop the guesswork.</span>
          </div>
          <div className="work-week-grid">
            <div>
              <h2>
                The shift ends.
                <br />
                The record stays.
              </h2>
              <p className="work-body">
                A delivery run before lunch. An airport pickup. A client
                deadline at home. Keep each piece of work with its own time, pay
                and costs.
              </p>
              <ol className="work-actions-list">
                <li>
                  <span>01</span>
                  <div>
                    <h3>Log it while you work. Or afterward.</h3>
                    <p>
                      Run a timer or add a completed job. Enter base pay, tips,
                      bonuses and business miles. Correct a manual entry when
                      you need to.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Find the costs behind the payout.</h3>
                    <p>
                      Record fuel, parking, supplies or software. Compare work
                      using a mileage cost estimate or your recorded expenses.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Keep something useful for tax time.</h3>
                    <p>
                      Filter work by date and source. Pro adds statement imports
                      and accountant-ready CSV and PDF records, with coverage
                      shown before you download.
                    </p>
                  </div>
                </li>
              </ol>
              <Link className="marketing-text-link" href="/the-system">
                See how the records fit together{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <figure className="work-phone-shot">
              <div className="work-phone-caption">
                <span>IN YOUR POCKET</span>
                <span>Work history</span>
              </div>
              <img
                src="/images/product/work-history-mobile.webp"
                alt="The UnifyOne mobile work history with date and source filters, recorded totals, and individual work entries using sample data."
                width="390"
                height="844"
                loading="lazy"
              />
              <figcaption>Example workspace · sample records</figcaption>
            </figure>
          </div>
        </section>

        <section className="work-tools" aria-labelledby="tools-heading">
          <div className="marketing-container">
            <div className="work-section-label">
              <span>02 / RUN THE NUMBERS</span>
              <span>No account needed.</span>
            </div>
            <div className="work-tools-heading">
              <h2 id="tools-heading">
                Start with the question
                <br />
                you came here to answer.
              </h2>
              <Link href="/tools">
                All free tools <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="work-tool-list">
              {tools.map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="work-tool-row"
                >
                  <span className="work-tool-number">{tool.number}</span>
                  <div>
                    <h3>{tool.title}</h3>
                    <p>{tool.text}</p>
                  </div>
                  <span className="work-tool-action">
                    {tool.label} <ArrowUpRight size={21} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          className="work-start marketing-container"
          aria-labelledby="start-heading"
        >
          <div>
            <p className="work-kicker">03 / MAKE IT A HABIT</p>
            <h2 id="start-heading">
              Your next shift
              <br />
              is a good place to start.
            </h2>
          </div>
          <div className="work-start-copy">
            <p>
              Start with the free work log, mileage log and calculators. Pro is{" "}
              {formatGigPrice(GIG_PLAN_BY_SLUG["gig-pro"].monthlyPriceCents)} a
              month for the extra tools.
            </p>
            <a className="marketing-button" href={getSignupUrl()}>
              Start free <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <Link className="marketing-text-link" href="/pricing">
              Compare plans <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          className="work-faq marketing-container"
          aria-labelledby="faq-heading"
        >
          <div>
            <p className="work-kicker">BEFORE YOU START</p>
            <h2 id="faq-heading">
              A few practical
              <br />
              questions.
            </h2>
            <Link className="marketing-text-link" href="/contact">
              Ask us directly <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <MarketingFaq items={MARKETING_FAQ} />
        </section>
      </div>
    </PublicLayout>
  );
}
