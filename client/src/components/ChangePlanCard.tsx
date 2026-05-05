/**
 * ChangePlanCard — list available plans + switch in-place.
 *
 * Wraps trpc.subscription.changePlan (commit 8c466e6) with a UI that:
 *   - shows the current plan + cycle
 *   - lists active plans from subscription.getPlans
 *   - lets the user switch monthly/yearly per plan
 *   - confirms with a toast that prorates apply on the next invoice
 *
 * Drops into the Billing page or any settings panel.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

type Cycle = "monthly" | "yearly";

interface PlanShape {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  priceMonthly: string | number;
  priceYearly: string | number;
  features?: string[] | null;
  isActive: boolean;
}

export function ChangePlanCard() {
  const utils = trpc.useUtils();
  const plansQuery = trpc.subscription.getPlans.useQuery();
  const status = trpc.subscription.getStatus.useQuery();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const change = trpc.subscription.changePlan.useMutation({
    onSuccess: data => {
      setPendingSlug(null);
      if (data.unchanged) {
        toast.info("Already on that plan.");
        return;
      }
      toast.success(
        "Plan updated. Stripe prorated the difference; the change is reflected on your next invoice."
      );
      utils.subscription.getStatus.invalidate?.();
    },
    onError: (e: { message: string }) => {
      setPendingSlug(null);
      toast.error(e.message);
    },
  });

  const currentPlanSlug =
    (status.data as { plan?: { slug?: string } } | undefined)?.plan?.slug ??
    null;

  const plans = (plansQuery.data ?? []) as PlanShape[];
  const activePlans = plans.filter(p => p.isActive);

  const handlePick = (slug: string) => {
    if (
      !confirm(
        `Switch to plan '${slug}' on the ${cycle} cycle? Stripe will prorate the difference on your next invoice.`
      )
    ) {
      return;
    }
    setPendingSlug(slug);
    change.mutate({ planSlug: slug, billingCycle: cycle });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-[#00D9FF]" />
          Change Plan
        </CardTitle>
        <CardDescription className="text-gray-400">
          Switch your active subscription. Proration applies automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex rounded-lg bg-white/5 border border-white/10 p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              cycle === "monthly"
                ? "bg-[#00D9FF]/20 text-[#00D9FF]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              cycle === "yearly"
                ? "bg-[#00D9FF]/20 text-[#00D9FF]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>

        {plansQuery.isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading plans...
          </div>
        ) : !activePlans.length ? (
          <p className="text-sm text-gray-500">No plans available.</p>
        ) : (
          <div className="space-y-2">
            {activePlans.map(p => {
              const isCurrent = p.slug === currentPlanSlug;
              const price =
                cycle === "monthly" ? p.priceMonthly : p.priceYearly;
              const isPending = pendingSlug === p.slug;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border ${
                    isCurrent ? "border-[#00D9FF]/40" : "border-white/10"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{p.name}</span>
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="border-[#00D9FF]/30 text-[#00D9FF] text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      ${Number(price).toFixed(2)} / {cycle}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePick(p.slug)}
                    disabled={isCurrent || change.isPending || isPending}
                    variant="outline"
                    className="border-white/10 text-gray-300 hover:text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : isCurrent ? (
                      "Current"
                    ) : (
                      `Switch to ${p.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-600">
          Stripe handles proration automatically (proration_behavior=
          create_prorations). The credit or charge appears on your next invoice
          — no upfront payment is taken at switch time.
        </p>
      </CardContent>
    </Card>
  );
}

export default ChangePlanCard;
