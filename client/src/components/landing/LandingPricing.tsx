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
          <p className="marketing-eyebrow">Choose a plan</p>
          <h2>
            Start recording your work.
            <br />
            Keep more history with Pro.
          </h2>
          <p>
            Starter includes the shift tracker and mileage log. Pro adds
            unlimited saved history and annual accountant records in CSV or PDF.
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
                  <span>
                    {paid
                      ? "History & annual records"
                      : "Shift & mileage records"}
                  </span>
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
                <p className="marketing-plan-description">
                  {paid
                    ? "Keep your saved history and review a year of work, imports, expenses and mileage before exporting records for your accountant."
                    : "Time a work session, record its earnings and business miles, and use the calculators to check your own assumptions."}
                </p>
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
          Prices in USD. Annual plans charge the full year upfront. Accountant
          records and tax estimates are not a tax return.{" "}
          <Link href="/terms">Review subscription terms</Link>.
        </p>
      </div>
    </section>
  );
}
