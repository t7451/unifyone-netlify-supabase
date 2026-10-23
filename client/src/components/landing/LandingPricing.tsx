import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Check } from "lucide-react";
import {
  GIG_PLAN_CATALOG,
  formatGigPrice,
  getGigAnnualSubtext,
} from "@shared/gigPricing";
import { getSignupUrl } from "@/const";

const proPlan = GIG_PLAN_CATALOG.find(plan => plan.slug === "gig-pro")!;
const annualSavings = Math.round(
  (1 - proPlan.yearlyPriceCents / (proPlan.monthlyPriceCents * 12)) * 100
);

export default function LandingPricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  return (
    <section id="pricing" className="marketing-pricing">
      <div className="marketing-container marketing-section">
        <div className="marketing-section-heading marketing-centered">
          <p className="marketing-eyebrow">Room to start. Room to grow.</p>
          <h2>
            A simple place to start.
            <br />A little more when you need it.
          </h2>
          <p>
            Keep the basics free. Choose Pro for a longer view of your work.
          </p>
        </div>
        <div
          className="marketing-billing"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            aria-pressed={billing === "monthly"}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={billing === "yearly"}
            onClick={() => setBilling("yearly")}
          >
            Annual <span>Save about {annualSavings}%</span>
          </button>
        </div>
        <div className="marketing-plan-grid">
          {GIG_PLAN_CATALOG.map(plan => {
            const paid = plan.monthlyPriceCents > 0;
            const annual = paid && billing === "yearly";
            const href = paid
              ? getSignupUrl(
                  undefined,
                  "/checkout/plan?plan=" + plan.slug + "&period=" + billing
                )
              : getSignupUrl(undefined, "/overview");
            return (
              <article
                key={plan.slug}
                className={
                  "marketing-plan" + (paid ? " marketing-plan-pro" : "")
                }
              >
                <div className="marketing-plan-title">
                  <h3>{plan.name}</h3>
                  <span>{paid ? "For the whole year" : "The essentials"}</span>
                </div>
                <p className="marketing-plan-price">
                  {paid
                    ? formatGigPrice(
                        annual ? plan.yearlyPriceCents : plan.monthlyPriceCents
                      )
                    : "$0"}
                  <span>
                    {" "}
                    / {paid ? (annual ? "year" : "month") : "forever"}
                  </span>
                </p>
                <p className="marketing-plan-billing">
                  {paid
                    ? annual
                      ? getGigAnnualSubtext(plan)
                      : "Billed monthly. Annual billing is optional."
                    : "No subscription payment or credit card needed."}
                </p>
                <p className="marketing-plan-description">{plan.description}</p>
                <a
                  href={href}
                  className={
                    "marketing-button" +
                    (paid ? "" : " marketing-button-outline")
                  }
                >
                  {paid ? "Choose Pro" : "Start free"}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
                <ul>
                  {plan.features.map(feature => (
                    <li key={feature}>
                      <Check size={17} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="marketing-pricing-note">
          Prices in USD. Tax tools provide estimates, not tax filing.{" "}
          <Link href="/terms">Review subscription terms</Link>.
        </p>
      </div>
    </section>
  );
}
