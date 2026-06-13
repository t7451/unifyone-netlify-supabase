/**
 * LandingPricing — pricing cards embedded in the landing page.
 *
 * Conversion logic: every click away from the landing page sheds
 * visitors. Put the buy decision on the page itself. Annual is the
 * default (higher LTV, "2 months free" anchor), Pro is the highlighted
 * default choice, Scale anchors it as the reasonable middle, and the
 * refund guarantee sits directly under the buttons — not in a footer FAQ.
 *
 * Reuses the canonical TIERS content so landing and /pricing never drift.
 */
import { useState } from "react";
import { TIERS } from "@/content/pricing";
import { getSignupUrl } from "@/const";

const GOLD = "#D4A843";
const PARCHMENT = "#F0E8D0";

export default function LandingPricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <section
      id="pricing"
      style={{ padding: "5rem 0", backgroundColor: "#020202" }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-10">
          <div className="inscription mb-4" style={{ color: GOLD }}>
            PRICING
          </div>
          <h2
            className="font-cinzel text-3xl sm:text-5xl font-black mb-4"
            style={{ color: PARCHMENT }}
          >
            Start free. Upgrade when it pays for itself.
          </h2>
          <p
            className="font-crimson text-lg mx-auto"
            style={{ color: "#6A6A6A", fontStyle: "italic", maxWidth: 480 }}
          >
            One unified Kai cost across every model. No per-vendor bills, no
            surprises.
          </p>
        </div>

        {/* Billing toggle — annual default */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center p-1"
            style={{
              border: "1px solid rgba(212,168,67,0.25)",
              borderRadius: 4,
            }}
          >
            {(["annual", "monthly"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setBilling(mode)}
                className="px-4 py-2 font-cinzel text-sm transition-colors"
                style={{
                  backgroundColor: billing === mode ? GOLD : "transparent",
                  color: billing === mode ? "#020202" : "#6A6A6A",
                  borderRadius: 4,
                }}
              >
                {mode === "annual" ? (
                  <>
                    Annual
                    <span
                      className="ml-2 font-crimson"
                      style={{
                        color: billing === "annual" ? "#020202" : "#6EE7B7",
                      }}
                    >
                      — 2 months free
                    </span>
                  </>
                ) : (
                  "Monthly"
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {TIERS.map((tier, i) => {
            const showAnnual =
              billing === "annual" && Boolean(tier.annualPrice);
            const displayedPrice = showAnnual ? tier.annualPrice : tier.price;
            const displayedPeriod = showAnnual
              ? tier.annualPeriod
              : tier.period;
            const isPaid = tier.id !== "starter";
            const href = isPaid
              ? getSignupUrl(
                  undefined,
                  `/checkout/plan?plan=${tier.id}&period=${showAnnual ? "yearly" : "monthly"}`
                )
              : getSignupUrl(undefined, "/dashboard");

            return (
              <div
                key={tier.id}
                className="relative p-8 sm:p-10"
                style={{
                  backgroundColor: tier.highlight ? "#0A0A0A" : "#020202",
                  border: tier.highlight
                    ? "1px solid rgba(212,168,67,0.4)"
                    : "1px solid #242424",
                  borderRight:
                    i < 2 && !tier.highlight ? "1px solid #242424" : undefined,
                  boxShadow: tier.highlight
                    ? "0 0 60px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.2)"
                    : "none",
                }}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="inscription px-3 py-1"
                      style={{ backgroundColor: GOLD, color: "#020202" }}
                    >
                      Most Chosen
                    </span>
                  </div>
                )}

                <div
                  className="inscription mb-6"
                  style={{ color: "rgba(212,168,67,0.5)" }}
                >
                  {tier.name.toUpperCase()}
                </div>

                <div className="mb-2">
                  <span
                    className="font-cinzel text-4xl font-black"
                    style={{ color: tier.highlight ? "#F0D080" : PARCHMENT }}
                  >
                    {displayedPrice}
                  </span>
                  <div
                    className="font-crimson text-sm"
                    style={{ color: "#5A5A5A" }}
                  >
                    / {displayedPeriod}
                  </div>
                  {showAnnual && tier.annualSubtext && (
                    <div
                      className="font-crimson text-sm mt-1"
                      style={{ color: "#5A5A5A" }}
                    >
                      {tier.annualSubtext}
                    </div>
                  )}
                </div>

                <p
                  className="font-crimson text-base mb-6"
                  style={{ color: "#5A5A5A", fontStyle: "italic" }}
                >
                  {tier.description}
                </p>

                <div className="space-y-3 mb-8">
                  {tier.features.slice(0, 5).map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div
                        className="w-3 h-px shrink-0"
                        style={{ backgroundColor: GOLD }}
                      />
                      <span
                        className="font-crimson text-sm"
                        style={{ color: "#6A6A6A" }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <a
                  href={href}
                  className={
                    tier.highlight
                      ? "btn-illuminate block text-center"
                      : "btn-ghost-gold block text-center"
                  }
                >
                  {tier.cta}
                </a>

                {/* Risk reversal at the point of decision */}
                {isPaid && (
                  <p
                    className="font-crimson text-xs text-center mt-3"
                    style={{ color: "#4A4A4A" }}
                  >
                    14-day full refund · cancel anytime
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
