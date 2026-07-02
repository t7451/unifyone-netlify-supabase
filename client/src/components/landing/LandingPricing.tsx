/**
 * LandingPricing — pricing cards embedded in the landing page.
 *
 * Conversion logic: every click away from the landing page sheds
 * visitors. Put the buy decision on the page itself. Annual is the
 * default (higher LTV, "2 months free" anchor), Gig Pro is the
 * highlighted default choice, Gig Starter (free) removes signup
 * friction, and the refund guarantee sits directly under the buttons —
 * not in a footer FAQ.
 *
 * Reuses the canonical gig TIERS content so landing and /pricing never
 * drift.
 */
import { useState } from "react";
import { TIERS } from "@/content/pricing";
import { getSignupUrl } from "@/const";

export default function LandingPricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <section
      id="pricing"
      className="parchment-alt-bg"
      style={{ padding: "5rem 0" }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-10">
          <div className="inscription-ink mb-4">PRICING</div>
          <h2
            className="font-cinzel text-3xl sm:text-5xl font-black mb-4"
            style={{ color: "var(--ink)" }}
          >
            Start free. Upgrade when it pays for itself.
          </h2>
          <p
            className="font-crimson text-lg mx-auto"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 480,
            }}
          >
            Track every shift, mile, and dollar you owe. Free forever — go Pro
            when it pays for itself.
          </p>
        </div>

        {/* Billing toggle — annual default */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center p-1"
            style={{
              border: "1px solid var(--parchment-line)",
              borderRadius: "var(--radius-soft)",
              backgroundColor: "var(--parchment)",
            }}
          >
            {(["annual", "monthly"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setBilling(mode)}
                className="px-4 py-2 font-cinzel text-sm transition-colors"
                style={{
                  backgroundColor:
                    billing === mode ? "var(--gold-ink)" : "transparent",
                  color:
                    billing === mode ? "var(--parchment)" : "var(--ink-faint)",
                  borderRadius: "calc(var(--radius-soft) - 2px)",
                }}
              >
                {mode === "annual" ? (
                  <>
                    Annual
                    <span
                      className="ml-2 font-crimson"
                      style={{
                        color:
                          billing === "annual" ? "var(--parchment)" : "#1F9D6B",
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {TIERS.map(tier => {
            const showAnnual =
              billing === "annual" && Boolean(tier.annualPrice);
            const displayedPrice = showAnnual ? tier.annualPrice : tier.price;
            const displayedPeriod = showAnnual
              ? tier.annualPeriod
              : tier.period;
            const isPaid = tier.id !== "gig-starter";
            const href = isPaid
              ? getSignupUrl(
                  undefined,
                  `/checkout/plan?plan=${tier.id}&period=${showAnnual ? "yearly" : "monthly"}`
                )
              : // Free gig-starter signup: land the new operator on the gig-first
                // home, not the commerce dashboard.
                getSignupUrl(undefined, "/overview");

            return (
              <div
                key={tier.id}
                className="surface-card relative p-8 sm:p-10"
                style={
                  tier.highlight
                    ? {
                        border: "2px solid var(--gold-ink)",
                        boxShadow:
                          "0 0 0 4px rgba(154,123,34,0.08), 0 8px 32px rgba(154,123,34,0.12)",
                      }
                    : undefined
                }
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="inscription px-3 py-1"
                      style={{
                        backgroundColor: "var(--gold-ink)",
                        color: "var(--parchment)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      Most Chosen
                    </span>
                  </div>
                )}

                <div className="inscription-ink mb-6">
                  {tier.name.toUpperCase()}
                </div>

                <div className="mb-2">
                  <span
                    className="font-cinzel text-4xl font-black"
                    style={{ color: "var(--ink)" }}
                  >
                    {displayedPrice}
                  </span>
                  <div
                    className="font-crimson text-sm"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    / {displayedPeriod}
                  </div>
                  {showAnnual && tier.annualSubtext && (
                    <div
                      className="font-crimson text-sm mt-1"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {tier.annualSubtext}
                    </div>
                  )}
                </div>

                <p
                  className="font-crimson text-base mb-6"
                  style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
                >
                  {tier.description}
                </p>

                <div className="space-y-3 mb-8">
                  {tier.features.slice(0, 6).map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div
                        className="w-3 h-px shrink-0"
                        style={{ backgroundColor: "var(--gold-ink)" }}
                      />
                      <span
                        className="font-crimson text-sm"
                        style={{ color: "var(--ink-soft)" }}
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
                      ? "btn-solid-gold block text-center"
                      : "btn-line-ink block text-center"
                  }
                >
                  {tier.cta}
                </a>

                {/* Risk reversal at the point of decision */}
                {isPaid && (
                  <p
                    className="font-crimson text-xs text-center mt-3"
                    style={{ color: "var(--ink-faint)" }}
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
