/**
 * BillingSuccess — /billing/success
 *
 * The post-payment moment. Polls subscription status + credit balance
 * until the webhook lands (usually < 5s), then shows the person exactly
 * what they got: plan active, N credits granted. This is where the
 * product proves the purchase worked — don't dump them on a dashboard
 * with no confirmation.
 *
 * Requires server success_url -> /billing/success (see PATCHES.md).
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2 } from "lucide-react";

const GOLD = "#D4A843";
const PARCHMENT = "#F0E8D0";
const MUTED = "#6A6A6A";

// SSE `credit_balance` events (useServerEvents at app root) invalidate the
// getCreditBalance query immediately when the Stripe webhook lands.
// We keep a slow poll (5s) as a safety net in case SSE isn't available
// (Netlify serverless), capped at 60s.
const POLL_MS = 5_000;
const MAX_POLLS = 12; // 60s ceiling before we stop spinning

export default function BillingSuccess() {
  const [polls, setPolls] = useState(0);

  const status = trpc.subscription.getStatus.useQuery(undefined, {
    refetchInterval: q =>
      q.state.data?.status === "active" || polls >= MAX_POLLS ? false : POLL_MS,
  });
  const credits = trpc.subscription.getCreditBalance.useQuery(undefined, {
    refetchInterval: q => {
      const bal = (q.state.data as any)?.balance ?? 0;
      return bal > 0 || polls >= MAX_POLLS ? false : POLL_MS;
    },
  });

  useEffect(() => {
    if (polls >= MAX_POLLS) return;
    const t = setInterval(() => setPolls(p => p + 1), POLL_MS);
    return () => clearInterval(t);
  }, [polls]);

  const isActive = status.data?.status === "active";
  const balance = (credits.data as any)?.balance ?? 0;
  const confirmed = isActive || balance > 0;
  const timedOut = polls >= MAX_POLLS && !confirmed;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#020202" }}
    >
      <div className="w-full text-center" style={{ maxWidth: 460 }}>
        {!confirmed && !timedOut && (
          <>
            <Loader2
              size={40}
              className="animate-spin mx-auto mb-6"
              style={{ color: GOLD }}
            />
            <h1
              className="font-cinzel text-2xl font-black mb-3"
              style={{ color: PARCHMENT }}
            >
              Payment received
            </h1>
            <p className="font-crimson text-base" style={{ color: MUTED }}>
              Activating your plan and granting credits — this usually takes a
              few seconds.
            </p>
          </>
        )}

        {confirmed && (
          <>
            <CheckCircle2
              size={48}
              className="mx-auto mb-6"
              style={{ color: "#6EE7B7" }}
            />
            <h1
              className="font-cinzel text-3xl font-black mb-3"
              style={{ color: PARCHMENT }}
            >
              You're in.
            </h1>
            <p className="font-crimson text-lg mb-2" style={{ color: MUTED }}>
              {isActive
                ? "Your subscription is active."
                : "Your payment is confirmed."}
            </p>
            {balance > 0 && (
              <div
                className="inline-block px-4 py-2 mt-2 mb-8"
                style={{
                  border: "1px solid rgba(212,168,67,0.35)",
                  backgroundColor: "rgba(212,168,67,0.08)",
                }}
              >
                <span
                  className="font-cinzel text-xl font-black"
                  style={{ color: "#F0D080" }}
                >
                  {new Intl.NumberFormat("en-US").format(balance)}
                </span>
                <span
                  className="font-crimson text-sm ml-2"
                  style={{ color: MUTED }}
                >
                  Kai credits ready to use
                </span>
              </div>
            )}
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="btn-illuminate inline-block px-10"
              >
                Open your dashboard
              </Link>
            </div>
          </>
        )}

        {timedOut && (
          <>
            <CheckCircle2
              size={48}
              className="mx-auto mb-6"
              style={{ color: GOLD }}
            />
            <h1
              className="font-cinzel text-2xl font-black mb-3"
              style={{ color: PARCHMENT }}
            >
              Payment received — finishing setup
            </h1>
            <p className="font-crimson text-base mb-8" style={{ color: MUTED }}>
              Your payment went through. Plan activation is taking longer than
              usual; your credits will appear on the billing page within a few
              minutes. If they don't, contact us and we'll fix it same-day.
            </p>
            <Link
              href="/dashboard"
              className="btn-ghost-gold inline-block px-10"
            >
              Continue to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
