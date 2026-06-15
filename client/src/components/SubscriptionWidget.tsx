import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    trialing: {
      label: "Trial",
      className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    past_due: {
      label: "Past Due",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    none: {
      label: "Free",
      className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    },
  };
  const cfg = map[status] ?? map.none;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function UsageMeter({
  icon: Icon,
  label,
  used,
  max,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span
          className={
            isCritical
              ? "text-red-400"
              : isWarning
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-1.5 bg-slate-700/50"
        style={
          {
            "--progress-color": isCritical
              ? "rgb(248 113 113)"
              : isWarning
                ? "rgb(251 191 36)"
                : "rgb(34 211 238)",
          } as React.CSSProperties
        }
      />
    </div>
  );
}

export function SubscriptionWidget() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.subscription.getStatus.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-700/60 rounded w-1/3" />
        <div className="h-2 bg-slate-700/60 rounded w-full" />
        <div className="h-2 bg-slate-700/60 rounded w-4/5" />
      </div>
    );
  }

  if (!data) return null;

  const { status, plan, trialDaysLeft, subscriptionCurrentPeriodEnd, usage } =
    data;

  const periodEndStr = subscriptionCurrentPeriodEnd
    ? new Date(subscriptionCurrentPeriodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      {/* Trial countdown banner — never shown to the platform owner account */}
      {!data.isMaster &&
        data.tenantStatus === "trial" &&
        trialDaysLeft !== null &&
        trialDaysLeft <= 7 && (
          <div
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${
              trialDaysLeft <= 2
                ? "bg-red-500/20 text-red-300 border-b border-red-500/20"
                : "bg-amber-500/15 text-amber-300 border-b border-amber-500/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {trialDaysLeft === 0
              ? "Your trial expires today"
              : `Trial expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`}
            <button
              onClick={() => navigate("/settings")}
              className="ml-auto underline underline-offset-2 hover:opacity-80"
            >
              Upgrade now
            </button>
          </div>
        )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                {plan?.name ?? "Free Tier"}
              </p>
              {periodEndStr && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Renews {periodEndStr}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Status message */}
        {status === "past_due" && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Payment failed. Update your billing info to keep access.
          </div>
        )}
        {status === "cancelled" && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-300">
            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Subscription cancelled. Reactivate to restore full access.
          </div>
        )}
        {status === "active" && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            All features active
          </div>
        )}
        {!data.isMaster &&
          (status === "none" || data.tenantStatus === "trial") &&
          trialDaysLeft !== null &&
          trialDaysLeft > 7 && (
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {trialDaysLeft} days left in trial
            </div>
          )}

        {/* Usage meters */}
        {usage && (
          <div className="space-y-2.5 pt-1">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Usage
            </p>
            <UsageMeter
              icon={Package}
              label="Products"
              used={usage.products}
              max={usage.maxProducts}
            />
            <UsageMeter
              icon={ShoppingCart}
              label="Orders"
              used={usage.orders}
              max={usage.maxOrders}
            />
            <UsageMeter
              icon={Users}
              label="Team Members"
              used={1}
              max={usage.maxUsers}
            />
            <p className="text-[11px] text-slate-500">
              Kai unified API usage is billed at one model-agnostic credit rate
              for your tier.
            </p>
          </div>
        )}

        {/* CTA — hidden for the platform owner account */}
        {!data.isMaster &&
          (status === "none" ||
            status === "cancelled" ||
            data.tenantStatus === "trial") && (
            <Button
              size="sm"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-xs h-8"
              onClick={() => navigate("/settings")}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
              {status === "cancelled" ? "Reactivate Plan" : "Upgrade Plan"}
            </Button>
          )}
        {status === "past_due" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs h-8"
            onClick={() => navigate("/settings")}
          >
            Update Billing
          </Button>
        )}
      </div>
    </div>
  );
}
