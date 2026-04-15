import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
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
  starter: "border-slate-600 bg-slate-800/40",
  pro: "border-violet-500 bg-violet-900/20",
  elite: "border-amber-400 bg-amber-900/20",
};

const TIER_BADGE: Record<string, string> = {
  starter: "bg-slate-700 text-slate-300",
  pro: "bg-violet-700 text-violet-100",
  elite: "bg-amber-600 text-amber-100",
};

const FEATURE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  shift_tracker: { label: "Shift Tracker", icon: Navigation },
  mileage_log: { label: "Mileage Log (IRS Rate)", icon: TrendingUp },
  basic_ai: { label: "Basic AI Tips", icon: Brain },
  route_optimizer: { label: "Route Optimizer", icon: Navigation },
  tax_export: { label: "Tax Export (CSV/PDF)", icon: FileText },
  unlimited_rules: { label: "Unlimited Financial Rules", icon: Zap },
  advanced_analytics: { label: "Advanced Earnings Analytics", icon: TrendingUp },
  earnings_forecast: { label: "AI Earnings Forecast", icon: Brain },
  ai_strategy: { label: "AI Strategy Coach", icon: Brain },
  priority_support: { label: "Priority Support", icon: Shield },
};

function PlanCard({
  plan,
  isCurrentPlan,
  billingPeriod,
  onSelect,
  loading,
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
}) {
  const Icon = TIER_ICONS[plan.tier] ?? Rocket;
  const price =
    billingPeriod === "yearly" ? Number(plan.priceYearly) / 12 : Number(plan.priceMonthly);
  const yearlyTotal = Number(plan.priceYearly);
  const isFree = Number(plan.priceMonthly) === 0;
  const isPopular = plan.tier === "pro";

  return (
    <Card
      className={`relative flex flex-col border-2 transition-all ${TIER_COLORS[plan.tier] ?? "border-slate-700 bg-slate-800/40"} ${isPopular ? "ring-2 ring-violet-500/40 scale-[1.02]" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-violet-600 text-white text-xs px-3 py-1 shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-slate-700/60">
            <Icon className="w-5 h-5 text-slate-200" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
            <Badge className={`text-xs mt-1 ${TIER_BADGE[plan.tier] ?? "bg-slate-700 text-slate-300"}`}>
              {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{plan.description}</p>

        <div className="mt-4">
          {isFree ? (
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold text-white">Free</span>
              <span className="text-slate-400 mb-1">forever</span>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">
                  ${price.toFixed(2)}
                </span>
                <span className="text-slate-400 mb-1">/mo</span>
              </div>
              {billingPeriod === "yearly" && (
                <p className="text-xs text-emerald-400 mt-1">
                  Billed ${yearlyTotal.toFixed(2)}/yr · Save 20%
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">
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
              <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <FIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{info.label}</span>
              </li>
            );
          })}
        </ul>

        <Button
          className="w-full mt-2"
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
          disabled={isCurrentPlan || loading || isFree}
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = trpc.gigWorker.getPlans.useQuery();
  const { data: subscription } = trpc.gigWorker.getSubscription.useQuery();
  const createCheckout = trpc.gigWorker.createCheckout.useMutation();

  const currentPlanSlug = subscription?.plan?.slug ?? "gig-starter";

  async function handleSelect(slug: string) {
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
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Navigation className="w-6 h-6 text-violet-400" />
            <h1 className="text-3xl font-bold text-white">Gig Worker Plans</h1>
          </div>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Tools built for gig economy workers — shift tracking, IRS mileage
            deductions, AI-powered route optimization, and tax export. Pick the
            plan that matches your hustle.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-lg bg-slate-800 border border-slate-700">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-slate-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                billingPeriod === "yearly"
                  ? "bg-slate-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly
              <Badge className="ml-2 bg-emerald-700 text-emerald-100 text-xs">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
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
              />
            ))}
          </div>
        )}

        {/* AI usage summary */}
        {subscription && (
          <div className="mt-8 p-4 rounded-xl border border-slate-700 bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-violet-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">AI Credits This Month</p>
                <p className="text-xs text-slate-400">
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
          <h2 className="text-lg font-semibold text-white">Frequently Asked Questions</h2>
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
              className="group p-4 rounded-lg border border-slate-700 bg-slate-800/30 cursor-pointer"
            >
              <summary className="text-sm font-medium text-white list-none flex items-center justify-between">
                {q}
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
