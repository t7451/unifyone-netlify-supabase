import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Check,
  Zap,
  Navigation,
  Brain,
  TrendingUp,
  FileText,
  Shield,
  Star,
  Crown,
  Rocket,
} from "lucide-react";

const TIER_ICONS: Record<string, React.ElementType> = {
  starter: Rocket,
  pro: Star,
  elite: Crown,
};

const TIER_COLORS: Record<string, string> = {
  starter: "border-border bg-card",
  pro: "border-primary/60 bg-card",
  elite: "border-border bg-card",
};

const TIER_BADGE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-primary/15 text-primary",
  elite: "bg-muted text-foreground",
};

const FEATURE_LABELS: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  shift_tracker: { label: "Shift Tracker", icon: Navigation },
  mileage_log: { label: "Mileage Log (IRS Rate)", icon: TrendingUp },
  basic_ai: { label: "Basic AI Tips", icon: Brain },
  route_optimizer: { label: "Route Optimizer", icon: Navigation },
  tax_export: { label: "Tax Export (CSV/PDF)", icon: FileText },
  unlimited_rules: { label: "Unlimited Financial Rules", icon: Zap },
  advanced_analytics: {
    label: "Advanced Earnings Analytics",
    icon: TrendingUp,
  },
  earnings_forecast: { label: "AI Earnings Forecast", icon: Brain },
  ai_strategy: { label: "AI Strategy Coach", icon: Brain },
  priority_support: { label: "Priority Support", icon: Shield },
  tax_calculators: {
    label: "Tax Calculators (SE, Quarterly, Mileage)",
    icon: FileText,
  },
  unlimited_history: { label: "Unlimited Saved History", icon: Zap },
  tax_dashboard: { label: "Year-Round Tax Dashboard", icon: TrendingUp },
  early_ai_access: { label: "AI Tools Included When They Ship", icon: Brain },
};

function PlanCard({
  plan,
  isCurrentPlan,
  billingPeriod,
  onSelect,
  loading,
  checkoutPending,
}: {
  plan: {
    id: number;
    name: string;
    slug: string;
    tier: string;
    description: string | null;
    priceMonthly: string;
    priceYearly: string;
    monthlyAICredits: number;
    features: string[];
  };
  isCurrentPlan: boolean;
  billingPeriod: "monthly" | "yearly";
  onSelect: (slug: string) => void;
  loading: boolean;
  checkoutPending: boolean;
}) {
  const Icon = TIER_ICONS[plan.tier] ?? Rocket;
  const price =
    billingPeriod === "yearly"
      ? Number(plan.priceYearly) / 12
      : Number(plan.priceMonthly);
  const yearlyTotal = Number(plan.priceYearly);
  const isFree = Number(plan.priceMonthly) === 0;
  const isPopular = plan.tier === "pro";

  return (
    <Card
      className={`relative flex flex-col border transition-colors ${TIER_COLORS[plan.tier] ?? "border-border bg-card"} ${isPopular ? "ring-1 ring-primary/30" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">
              {plan.name}
            </CardTitle>
            <Badge
              className={`text-xs mt-1 ${TIER_BADGE[plan.tier] ?? "bg-muted text-muted-foreground"}`}
            >
              {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {plan.description}
        </p>

        <div className="mt-4">
          {isFree ? (
            <div className="flex items-end gap-1">
              <span className="text-3xl font-semibold text-foreground">
                Free
              </span>
              <span className="text-muted-foreground mb-1">forever</span>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-semibold text-foreground">
                  ${price.toFixed(2)}
                </span>
                <span className="text-muted-foreground mb-1">/mo</span>
              </div>
              {billingPeriod === "yearly" && (
                <p className="text-xs text-emerald-400 mt-1">
                  Billed ${yearlyTotal.toFixed(2)}/yr · Save 20%
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {plan.monthlyAICredits} AI requests/month
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        <ul className="space-y-2 flex-1">
          {plan.features.map(f => {
            const info = FEATURE_LABELS[f];
            if (!info) return null;
            const FIcon = info.icon;
            return (
              <li
                key={f}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <FIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{info.label}</span>
              </li>
            );
          })}
        </ul>

        <Button
          className="w-full mt-2"
          variant={
            isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"
          }
          disabled={isCurrentPlan || checkoutPending || isFree}
          onClick={() => !isFree && onSelect(plan.slug)}
        >
          {isCurrentPlan
            ? "Current Plan"
            : isFree
              ? "Your Free Plan"
              : loading
                ? "Redirecting…"
                : `Upgrade to ${plan.name}`}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GigWorkerPlans() {
  const [, navigate] = useLocation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const plansQuery = trpc.gigWorker.getPlans.useQuery();
  const { data: plans, isLoading: plansLoading } = plansQuery;
  const subscriptionQuery = trpc.gigWorker.getSubscription.useQuery();
  const { data: subscription } = subscriptionQuery;
  const createCheckout = trpc.gigWorker.createCheckout.useMutation();

  const currentPlanSlug = subscription?.plan?.slug ?? "gig-starter";

  async function handleSelect(slug: string) {
    if (loadingSlug || subscriptionQuery.isLoading || subscriptionQuery.isError)
      return;
    setLoadingSlug(slug);
    try {
      const origin = window.location.origin;
      const result = await createCheckout.mutateAsync({
        planSlug: slug,
        billingPeriod,
        origin,
      });
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Could not start checkout. Please try again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoadingSlug(null);
    }
  }

  return (
    <DashboardPageShell
      eyebrow="Your account"
      title="Gig Worker Plans"
      description="Tools built for gig economy workers — shift tracking, IRS mileage deductions, AI-powered route optimization, and tax export. Pick the plan that matches your hustle."
      actions={
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-muted border border-border"
        >
          <button
            aria-pressed={billingPeriod === "monthly"}
            onClick={() => setBillingPeriod("monthly")}
            className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            aria-pressed={billingPeriod === "yearly"}
            onClick={() => setBillingPeriod("yearly")}
            className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "yearly"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge className="ml-2 bg-emerald-700 text-emerald-100 text-xs">
              Save 20%
            </Badge>
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Plan cards */}
        {plansQuery.isError || subscriptionQuery.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <p className="font-medium">Could not load plans and subscription</p>
            <p className="text-sm text-muted-foreground">
              Your current plan must be verified before choosing another.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                void plansQuery.refetch();
                void subscriptionQuery.refetch();
              }}
            >
              Retry plans
            </Button>
          </div>
        ) : plansLoading || subscriptionQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : !plans?.length ? (
          <div
            role="status"
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <p>No plans are available right now.</p>
            <Button variant="outline" onClick={() => void plansQuery.refetch()}>
              Reload plans
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(plans ?? []).map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.slug === currentPlanSlug}
                billingPeriod={billingPeriod}
                onSelect={handleSelect}
                loading={loadingSlug === plan.slug}
                checkoutPending={loadingSlug !== null}
              />
            ))}
          </div>
        )}

        {/* AI usage summary */}
        {subscription && (
          <div className="mt-8 p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  AI Credits This Month
                </p>
                <p className="text-xs text-muted-foreground">
                  {subscription.aiUsage?.requestsUsed ?? 0} used ·{" "}
                  {subscription.aiCreditsRemaining} remaining ·{" "}
                  {subscription.plan?.monthlyAICredits ?? 25} monthly quota
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/gig-command")}
            >
              Go to Gig Command
            </Button>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "Is the Starter plan really free forever?",
              a: "Yes. Shift tracking, mileage logging, and 25 basic AI tips per month are included free forever — no credit card required.",
            },
            {
              q: "How does the AI credit limit work?",
              a: "Each AI request (route tips, earnings analysis, strategy advice) consumes one credit. Limits reset on the 1st of each month. Unused credits do not roll over.",
            },
            {
              q: "Can I cancel my Pro or Elite plan anytime?",
              a: "Yes. Cancellation takes effect at the end of your current billing period. Your data and shift history are never deleted.",
            },
            {
              q: "Does this plan replace my UnifyOne main subscription?",
              a: "No. Gig Worker plans are a standalone add-on for individual gig workers and are separate from your store's commerce subscription.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="group p-4 rounded-lg border border-border bg-card cursor-pointer"
            >
              <summary className="text-sm font-medium text-foreground list-none flex min-h-11 items-center justify-between gap-3">
                {q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </DashboardPageShell>
  );
}
