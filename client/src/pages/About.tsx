import { Link } from "wouter";
import {
  ArrowUpRight,
  Check,
  Layers3,
  MessageCircle,
  Wallet,
} from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import { getSignupUrl } from "@/const";
import { SITE_URL } from "@/lib/siteConfig";

const DESCRIPTION =
  "Meet UnifyOne by 1Commerce: tools to help independent workers keep clearer earnings records, understand expenses, and plan for taxes.";
export default function About() {
  return (
    <PublicLayout>
      <PageHead
        title="About UnifyOne | Built for independent work"
        description={DESCRIPTION}
        canonical={SITE_URL + "/about"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About UnifyOne",
            description: DESCRIPTION,
            url: SITE_URL + "/about",
          },
        ]}
      />
      <div className="marketing-page">
        <header className="marketing-page-heading marketing-container">
          <p className="marketing-eyebrow">UnifyOne by 1Commerce</p>
          <h1>
            Built for work
            <br />
            across apps.
          </h1>
          <p className="marketing-lead">
            Keep delivery runs, rideshare shifts and client jobs together, with
            the hours, pay, miles and costs that explain them.
          </p>
        </header>
        <section className="marketing-section marketing-container marketing-story">
          <div>
            <p className="marketing-eyebrow">Why we’re building it</p>
            <h2>
              The payout is only
              <br />
              part of the story.
            </h2>
          </div>
          <div>
            <p>
              A busy week can look good in a gig app and feel very different
              after expenses. Add another app, a freelance client, and a tax
              deadline, and it gets harder to see where you stand.
            </p>
            <p>
              UnifyOne brings the record of that work together: shifts,
              earnings, expenses, and mileage. Our goal is to make those records
              useful for the decisions that come next.
            </p>
            <p>
              We’re built by 1Commerce in Oregon. We’re refining the product
              around the everyday needs of delivery drivers, rideshare workers,
              freelancers, and other independent contractors.
            </p>
          </div>
        </section>
        <section className="marketing-workflow">
          <div className="marketing-section marketing-container">
            <div className="marketing-section-heading">
              <p className="marketing-eyebrow">What we value</p>
              <h2>Useful beats complicated.</h2>
            </div>
            <div className="marketing-feature-grid">
              {[
                {
                  icon: Wallet,
                  title: "Start with your numbers",
                  text: "A clearer record of what you earned, what you spent, and how long you worked.",
                },
                {
                  icon: Layers3,
                  title: "Keep a useful free starting point",
                  text: "Public calculators to explore right away, plus a free plan for building a tracking habit.",
                },
                {
                  icon: MessageCircle,
                  title: "Make room for questions",
                  text: "Plain-language tools and a way to reach the team when something needs explaining.",
                },
              ].map(item => (
                <article className="marketing-feature-card" key={item.title}>
                  <item.icon size={25} aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section marketing-container marketing-story">
          <div>
            <p className="marketing-eyebrow">A few clear boundaries</p>
            <h2>
              Tools for planning.
              <br />
              You stay in charge.
            </h2>
          </div>
          <div>
            <p>
              <Check size={18} aria-hidden="true" /> The tax tools estimate;
              they do not file your return.
            </p>
            <p>
              <Check size={18} aria-hidden="true" /> AI can help explain, but
              its answers need checking.
            </p>
            <p>
              <Check size={18} aria-hidden="true" /> Recording work from a
              platform does not imply a partnership or direct account
              integration.
            </p>
            <Link href="/contact" className="marketing-text-link">
              Have feedback? Talk to us{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="marketing-closing">
          <div className="marketing-container">
            <p className="marketing-eyebrow">Start where you are</p>
            <h2>
              Make your next shift
              <br />a little clearer.
            </h2>
            <div className="marketing-actions">
              <a className="marketing-button" href={getSignupUrl()}>
                Create a free account{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <Link href="/tools" className="marketing-text-link">
                Explore the free tools →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
