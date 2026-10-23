import { Link } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  MapPinned,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import MarketingFaq from "@/components/MarketingFaq";
import LandingPricing from "@/components/landing/LandingPricing";
import { getSignupUrl } from "@/const";
import {
  HOME_TITLE,
  HOME_DESCRIPTION,
  MARKETING_FAQ,
} from "@/content/marketing";
import { SITE_URL } from "@/lib/siteConfig";

const features = [
  {
    icon: Wallet,
    title: "One place for every shift",
    text: "Keep delivery runs, rideshare shifts, and freelance jobs together. Record what came in and what it cost to earn it.",
    link: "/tools/earnings-consolidator",
    cta: "Try the earnings tool",
  },
  {
    icon: MapPinned,
    title: "Miles with a purpose",
    text: "Keep a mileage record alongside your work, then estimate the deduction with the free mileage calculator.",
    link: "/tools/mileage-deduction-calculator",
    cta: "Explore mileage deductions",
  },
  {
    icon: ReceiptText,
    title: "A plan for tax time",
    text: "Use earnings and expenses to estimate a tax set-aside. Build the habit throughout the year, one payout at a time.",
    link: "/tools/tax-set-aside",
    cta: "Estimate a set-aside",
  },
];
const steps = [
  {
    title: "Keep a record",
    text: "Log your work, earnings, expenses, and mileage. Bring the different parts of your working week into one view.",
  },
  {
    title: "Understand your take-home",
    text: "Look beyond the payout. Account for the expenses and time that went into earning it.",
  },
  {
    title: "Plan your next move",
    text: "Review your history, use the calculators, and decide what to set aside for the weeks ahead.",
  },
];
const tools = [
  {
    icon: Clock3,
    title: "Real hourly rate",
    text: "See what a shift pays after expenses and time.",
    href: "/tools/gig-hourly-rate",
  },
  {
    icon: MapPinned,
    title: "Mileage deduction",
    text: "Turn your business miles into a deduction estimate.",
    href: "/tools/mileage-deduction-calculator",
  },
  {
    icon: ReceiptText,
    title: "Quarterly tax estimate",
    text: "Get a starting point for your tax planning.",
    href: "/tools/quarterly-tax-estimator",
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
      <div className="marketing-page">
        <section
          className="marketing-hero marketing-container"
          aria-labelledby="home-heading"
        >
          <div className="marketing-hero-copy">
            <p className="marketing-eyebrow">
              <span className="marketing-dot" /> For people who work
              independently
            </p>
            <h1 id="home-heading">
              Your work is flexible.
              <br />
              Your money should
              <br className="marketing-wide-break" /> feel <em>clear.</em>
            </h1>
            <p className="marketing-lead">
              Different apps. Different paydays. One place to track your
              earnings, keep up with mileage, and make a plan for taxes.
            </p>
            <div className="marketing-actions">
              <a className="marketing-button" href={getSignupUrl()}>
                Start tracking for free{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <Link className="marketing-text-link" href="/tools">
                Try a free calculator{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className="marketing-fine">
              <Check size={15} aria-hidden="true" /> Free plan available. No
              credit card to start.
            </p>
          </div>
          <div className="marketing-preview-wrap">
            <div
              className="marketing-preview"
              aria-label="Illustrative shift summary with example data"
            >
              <div className="marketing-preview-top">
                <span>YOUR SHIFT, AT A GLANCE</span>
                <span className="marketing-preview-badge">Example data</span>
              </div>
              <div className="marketing-preview-date">
                <span>Thursday evening</span>
                <span>4 hours logged</span>
              </div>
              <p className="marketing-preview-label">Earnings after expenses</p>
              <p className="marketing-preview-total">
                $124<span>.00</span>
              </p>
              <p className="marketing-preview-rate">
                $31.00 per hour <span>after $24 in expenses</span>
              </p>
              <div className="marketing-preview-bars" aria-hidden="true">
                {[35, 58, 44, 80, 66, 93, 77, 100].map((height, index) => (
                  <span key={index} style={{ height: height + "%" }} />
                ))}
              </div>
              <dl className="marketing-preview-stats">
                <div>
                  <dt>Gross earnings</dt>
                  <dd>$148.00</dd>
                </div>
                <div>
                  <dt>Expenses</dt>
                  <dd>−$24.00</dd>
                </div>
                <div>
                  <dt>Miles logged</dt>
                  <dd>56 mi</dd>
                </div>
              </dl>
              <div className="marketing-preview-note">
                <ReceiptText size={19} aria-hidden="true" />
                <span>
                  A clearer record now.
                  <br />
                  <strong>Less sorting at tax time.</strong>
                </span>
                <Check size={18} aria-hidden="true" />
              </div>
            </div>
            <p className="marketing-preview-caption">
              An illustration of the workflow. Your results depend on your
              records.
            </p>
          </div>
        </section>
        <section className="marketing-audience-strip">
          <div className="marketing-container">
            <p>
              One working life.
              <br />
              <strong>However you earn.</strong>
            </p>
            <div>
              <span>Delivery</span>
              <span>Rideshare</span>
              <span>Freelance</span>
              <span>Contract work</span>
            </div>
          </div>
        </section>
        <section
          className="marketing-section marketing-container"
          id="features"
        >
          <div className="marketing-section-heading">
            <p className="marketing-eyebrow">Make the numbers useful</p>
            <h2>
              Less piecing it together.
              <br />
              More seeing where you stand.
            </h2>
            <p>
              You put in the work. Give yourself a record that helps you
              understand it.
            </p>
          </div>
          <div className="marketing-feature-grid">
            {features.map(item => (
              <article className="marketing-feature-card" key={item.title}>
                <item.icon size={25} strokeWidth={1.6} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Link href={item.link}>
                  {item.cta}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-workflow" id="how-it-works">
          <div className="marketing-container marketing-section">
            <div className="marketing-section-heading">
              <p className="marketing-eyebrow">A habit, not another project</p>
              <h2>
                From your first shift
                <br />
                to a clearer whole year.
              </h2>
            </div>
            <ol className="marketing-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <Link href="/tools/gig-hourly-rate" className="marketing-text-link">
              Start by checking your hourly rate{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="marketing-section marketing-container marketing-ai-section">
          <div>
            <p className="marketing-eyebrow">
              <Sparkles size={16} aria-hidden="true" /> Meet Kai
            </p>
            <h2>
              A little help making
              <br />
              sense of it all.
            </h2>
            <p className="marketing-lead">
              Use the AI assistant to work through questions about earnings,
              expenses, and planning. Bring the answer back to your records
              before you act.
            </p>
            <p className="marketing-fine">
              AI can make mistakes. Tax estimates and AI answers are
              educational, not professional advice.
            </p>
            <Link href="/pricing" className="marketing-text-link">
              See the AI allowance in each plan{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="marketing-question-card">
            <span className="marketing-eyebrow">Questions worth asking</span>
            <p>“What should I review before estimating my quarterly taxes?”</p>
            <p>“How do I compare two shifts after expenses?”</p>
            <p>“How can I build a buffer when my income changes?”</p>
            <span className="marketing-fine">
              Example prompts, not a live conversation.
            </span>
          </div>
        </section>
        <LandingPricing />
        <section className="marketing-section marketing-container">
          <div className="marketing-section-heading marketing-heading-split">
            <div>
              <p className="marketing-eyebrow">Useful before you sign up</p>
              <h2>
                Start with one
                <br />
                better number.
              </h2>
            </div>
            <Link href="/tools" className="marketing-text-link">
              Browse all free tools <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="marketing-tool-grid">
            {tools.map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className="marketing-tool-card"
              >
                <tool.icon size={22} aria-hidden="true" />
                <h3>{tool.title}</h3>
                <p>{tool.text}</p>
                <span>
                  Open calculator <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section
          className="marketing-section marketing-container marketing-faq-grid"
          id="faq"
        >
          <div>
            <p className="marketing-eyebrow">A few things to know</p>
            <h2>
              Good questions.
              <br />
              Straight answers.
            </h2>
            <Link className="marketing-text-link" href="/contact">
              Ask us something else{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <MarketingFaq items={MARKETING_FAQ} />
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Make room for a clearer picture</p>
            <h2>
              You do the work.
              <br />
              Know what you keep.
            </h2>
            <p>Start with a free account, or explore a calculator first.</p>
            <div className="marketing-actions">
              <a href={getSignupUrl()} className="marketing-button">
                Start free <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <Link href="/tools" className="marketing-text-link">
                Explore the tools <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
