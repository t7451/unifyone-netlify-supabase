/**
 * PlanCheckout — /checkout/plan?plan=pro&period=yearly
 *
 * One-click subscription purchase. Replaces the generic Checkout console
 * for plan purchases: no editable amount, no rail picker — a locked
 * order summary that fires subscription.createCheckout immediately and
 * hands off to Stripe Checkout. Custom/order payments still use /checkout.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import {
  PLAN_CATALOG_BY_SLUG,
  formatUsdCents,
  isPlanSlug,
  type PlanSlug,
} from "@shared/pricing";

const GOLD = "#D4A843";
const PARCHMENT = "#F0E8D0";
const MUTED = "#6A6A6A";

type Period = "monthly" | "yearly";

export default function PlanCheckout() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const rawPlan = params.get("plan") ?? "";
  const planSlug: PlanSlug | null = isPlanSlug(rawPlan) ? rawPlan : null;
  const period: Period =
    params.get("period") === "yearly" ? "yearly" : "monthly";

  const plan = planSlug ? PLAN_CATALOG_BY_SLUG[planSlug] : null;
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: data => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(
          "Checkout session was created but no redirect URL came back. Try again."
        );
      }
    },
    onError: e => setError(e.message),
  });

  const fire = () => {
    if (!planSlug) return;
    setError(null);
    createCheckout.mutate({
      planSlug,
      billingPeriod: period,
      origin: window.location.origin,
    });
  };

  // Auto-fire once on mount — the person already chose their plan on the
  // pricing page; don't make them confirm a second time.
  useEffect(() => {
    if (planSlug && !firedRef.current) {
      firedRef.current = true;
      fire();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSlug]);

  if (!plan || !planSlug) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#020202" }}
      >
        <div className="text-center px-6">
          <p className="font-crimson text-lg mb-6" style={{ color: MUTED }}>
            That plan link isn't valid.
          </p>
          <Link href="/pricing" className="btn-illuminate inline-block">
            View plans
          </Link>
        </div>
      </div>
    );
  }

  const priceCents =
    period === "yearly" && plan.yearlyPriceCents
      ? plan.yearlyPriceCents
      : plan.monthlyPriceCents;
  const periodLabel = period === "yearly" ? "per year" : "per month";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#020202" }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 font-crimson text-sm mb-8"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={14} /> Back to plans
        </Link>

        {/* Locked order summary */}
        <div
          className="p-8"
          style={{
            backgroundColor: "#0A0A0A",
            border: "1px solid rgba(212,168,67,0.35)",
            boxShadow: "0 0 60px rgba(212,168,67,0.08)",
          }}
        >
          <div
            className="inscription mb-4"
            style={{ color: "rgba(212,168,67,0.5)" }}
          >
            ORDER SUMMARY
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span
              className="font-cinzel text-2xl font-black"
              style={{ color: PARCHMENT }}
            >
              {plan.name}
            </span>
            <span
              className="font-cinzel text-2xl font-black"
              style={{ color: "#F0D080" }}
            >
              {formatUsdCents(priceCents)}
            </span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span
              className="font-crimson text-sm"
              style={{ color: MUTED, fontStyle: "italic" }}
            >
              {plan.tagline}
            </span>
            <span className="font-crimson text-sm" style={{ color: "#5A5A5A" }}>
              {periodLabel}
            </span>
          </div>

          {period === "yearly" && (
            <div
              className="inscription inline-block px-2 py-1 mb-6"
              style={{
                backgroundColor: "rgba(212,168,67,0.12)",
                border: "1px solid rgba(212,168,67,0.35)",
                color: GOLD,
              }}
            >
              2 MONTHS FREE VS MONTHLY
            </div>
          )}

          {/* Status */}
          {createCheckout.isPending && !error && (
            <div className="flex items-center gap-3 py-4">
              <Loader2
                size={18}
                className="animate-spin"
                style={{ color: GOLD }}
              />
              <span
                className="font-crimson text-base"
                style={{ color: PARCHMENT }}
              >
                Opening secure Stripe checkout…
              </span>
            </div>
          )}

          {error && (
            <div className="py-2">
              <p
                className="font-crimson text-sm mb-4"
                style={{ color: "#E07A5F" }}
              >
                {error}
              </p>
              <button
                onClick={fire}
                className="btn-illuminate w-full text-center"
              >
                Try again
              </button>
            </div>
          )}

          {!createCheckout.isPending && !error && (
            <button
              onClick={fire}
              className="btn-illuminate w-full text-center"
            >
              Continue to payment
            </button>
          )}

          {/* Trust strip — at the moment of payment, not buried in an FAQ */}
          <div
            className="mt-6 pt-6 space-y-2"
            style={{ borderTop: "1px solid #1A1A1A" }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={13} style={{ color: "#6EE7B7" }} />
              <span className="font-crimson text-xs" style={{ color: MUTED }}>
                14-day full refund on any paid tier — no questions asked
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={13} style={{ color: GOLD }} />
              <span className="font-crimson text-xs" style={{ color: MUTED }}>
                Payment handled by Stripe. Card details never touch our servers.
              </span>
            </div>
          </div>
        </div>

        <p
          className="font-crimson text-xs text-center mt-6"
          style={{ color: "#3A3A3A" }}
        >
          Cancel anytime from your billing page. Upgrades and downgrades are
          prorated.
        </p>
      </div>
    </div>
  );
}
