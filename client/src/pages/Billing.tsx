import DashboardLayout from "@/components/DashboardLayout";
import { ChangePlanCard } from "@/components/ChangePlanCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  PLAN_CATALOG_BY_SLUG,
  formatUsdCents,
  getPlanNumericLimitLabel,
  isPlanSlug,
} from "@shared/pricing";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Package,
  Receipt,
  ShoppingCart,
  Star,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    paid: {
      label: "Paid",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    open: {
      label: "Open",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    },
    void: {
      label: "Void",
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    },
    uncollectible: {
      label: "Uncollectible",
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-red-500/15 text-red-300 border-red-500/30",
    },
  };
  const cfg = map[status] ?? map.open;
  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1 text-xs", cfg.className)}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function PlanTierBadge({ slug }: { slug: string | null | undefined }) {
  const tier =
    slug === "scale"
      ? {
          label: "Scale",
          className: "border-violet-500/30 bg-violet-500/15 text-violet-200",
        }
      : slug === "pro"
        ? {
            label: "Pro",
            className: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
          }
        : {
            label: "Free",
            className: "border-slate-600 bg-slate-700/50 text-slate-200",
          };

  return (
    <Badge variant="outline" className={tier.className}>
      {tier.label}
    </Badge>
  );
}

function SubscriptionStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const badge =
    status === "active"
      ? {
          label: "Active",
          className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
        }
      : status === "trialing"
        ? {
            label: "Trialing",
            className: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
          }
        : status === "past_due"
          ? {
              label: "Past Due",
              className: "border-red-500/30 bg-red-500/15 text-red-200",
            }
          : status === "cancelled"
            ? {
                label: "Cancelled",
                className: "border-slate-500/30 bg-slate-500/15 text-slate-200",
              }
            : {
                label: "None",
                className: "border-slate-500/30 bg-slate-500/15 text-slate-200",
              };

  return (
    <Badge variant="outline" className={badge.className}>
      {badge.label}
    </Badge>
  );
}

function UsageBar({
  icon: Icon,
  label,
  used,
  max,
  loading,
  indicatorClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number | null;
  max: number | null;
  loading: boolean;
  indicatorClassName: string;
}) {
  const hasValues = typeof used === "number" && typeof max === "number";
  const progress =
    hasValues && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <Icon className="h-4 w-4 text-slate-400" />
          {label}
        </span>
        <span className="text-xs text-slate-400">
          {loading
            ? "—"
            : `${used?.toLocaleString() ?? "—"} / ${
                typeof max === "number" ? getPlanNumericLimitLabel(max) : "—"
              }`}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-2 w-full bg-slate-700/70" />
      ) : (
        <Progress
          value={progress}
          className={cn(
            "h-2 bg-slate-700/60 [&_[data-slot=progress-indicator]]:bg-cyan-400",
            indicatorClassName
          )}
        />
      )}
    </div>
  );
}

export default function Billing() {
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subStatus, isLoading: subLoading } =
    trpc.subscription.getStatus.useQuery();
  const { data: usage, isLoading: usageLoading } =
    trpc.tenant.getUsage.useQuery();
  const { data: invoices, isLoading: invoicesLoading } =
    trpc.subscription.getInvoices.useQuery();

  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: data => {
      if (data.url) {
        toast.success("Redirecting to secure checkout...");
        window.location.href = data.url;
      } else {
        toast.error("Could not create checkout session.");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(
        error.message || "Failed to start checkout. Please try again."
      );
    },
  });

  const handleUpgrade = () => {
    createCheckout.mutate({
      planSlug: "pro",
      billingPeriod: "monthly",
      origin: window.location.origin,
    });
  };

  const handleOpenPortal = async () => {
    if (!subStatus?.stripeCustomerId) {
      toast.info("No active subscription. Upgrade a plan first.");
      return;
    }

    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: subStatus.stripeCustomerId,
          origin: window.location.origin,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe billing portal...");
      } else {
        toast.error(data.error ?? "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const planSlug = subStatus?.plan?.slug;
  const catalogPlan =
    planSlug && isPlanSlug(planSlug)
      ? PLAN_CATALOG_BY_SLUG[planSlug]
      : PLAN_CATALOG_BY_SLUG.starter;
  const planName = subStatus?.plan?.name ?? catalogPlan.name;
  const status = subStatus?.status ?? "none";
  const billingCycle = subStatus?.billingCycle
    ? toTitleCase(subStatus.billingCycle)
    : null;
  const periodEnd = formatLongDate(subStatus?.subscriptionCurrentPeriodEnd);
  const trialDaysLeft = subStatus?.trialDaysLeft ?? null;
  const isTrialing =
    !subLoading &&
    (subStatus?.status === "trialing" || subStatus?.tenantStatus === "trial") &&
    trialDaysLeft !== null;
  const isFreeTier = !subLoading && subStatus?.status === "none" && !isTrialing;
  const canManageBilling = Boolean(subStatus?.stripeCustomerId);
  const hasPaidPlan = catalogPlan.monthlyPriceCents > 0;
  const usageLimits = {
    maxProducts: subStatus?.plan?.maxProducts ?? catalogPlan.maxProducts,
    maxOrders: subStatus?.plan?.maxOrders ?? catalogPlan.maxOrders,
    maxUsers: subStatus?.plan?.maxUsers ?? catalogPlan.maxUsers,
  };
  const proPlan = PLAN_CATALOG_BY_SLUG.pro;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Billing & Subscription
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your plan, payment method, and invoice history.
          </p>
        </div>

        {status === "past_due" && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
            <AlertTriangle className="text-red-300" />
            <AlertTitle>Payment past due</AlertTitle>
            <AlertDescription className="text-red-100/90">
              <p>
                Your subscription is past due. Update your payment method to
                keep paid features active.
              </p>
              {canManageBilling && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-red-100 hover:text-white"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                >
                  {portalLoading
                    ? "Opening portal..."
                    : "Update payment method"}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-700/50 bg-slate-800/40 text-white shadow-none">
          <CardHeader className="gap-4 border-b border-slate-700/50 pb-6 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15">
                <Zap className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="space-y-2">
                <CardDescription className="text-slate-400">
                  Current Plan
                </CardDescription>
                {subLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-40 bg-slate-700/70" />
                    <Skeleton className="h-4 w-56 bg-slate-700/50" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-2xl text-white">
                        {planName}
                      </CardTitle>
                      <PlanTierBadge slug={planSlug} />
                      <SubscriptionStatusBadge status={status} />
                    </div>
                    <p className="text-sm text-slate-400">
                      {catalogPlan.tagline}
                    </p>
                  </>
                )}
              </div>
            </div>

            {subLoading ? (
              <div className="grid gap-2 sm:min-w-52">
                <Skeleton className="h-4 w-36 bg-slate-700/60" />
                <Skeleton className="h-4 w-40 bg-slate-700/60" />
              </div>
            ) : (
              <dl className="grid gap-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 text-sm sm:min-w-56">
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Subscription status
                  </dt>
                  <dd className="text-slate-200">{toTitleCase(status)}</dd>
                </div>
                {hasPaidPlan && billingCycle && (
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Billing cycle
                    </dt>
                    <dd className="text-slate-200">{billingCycle}</dd>
                  </div>
                )}
                {periodEnd && (
                  <div className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Period end
                    </dt>
                    <dd className="text-slate-200">{periodEnd}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Usage vs limits
                  </h2>
                  <p className="text-xs text-slate-500">
                    Orders reset each calendar month for plan limits.
                  </p>
                </div>
                {usageLoading ? (
                  <Skeleton className="h-4 w-24 bg-slate-700/60" />
                ) : (
                  <span className="text-xs text-slate-500">
                    Plan cap: {getPlanNumericLimitLabel(usageLimits.maxUsers)}{" "}
                    team members
                  </span>
                )}
              </div>
              <div className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
                <UsageBar
                  icon={Package}
                  label="Products"
                  used={usage?.productCount ?? null}
                  max={usageLimits.maxProducts}
                  loading={usageLoading}
                  indicatorClassName="[&_[data-slot=progress-indicator]]:bg-cyan-400"
                />
                <UsageBar
                  icon={ShoppingCart}
                  label="Orders this month"
                  used={usage?.orderCount ?? null}
                  max={usageLimits.maxOrders}
                  loading={usageLoading}
                  indicatorClassName="[&_[data-slot=progress-indicator]]:bg-violet-400"
                />
                <UsageBar
                  icon={Users}
                  label="Team members"
                  used={usage?.userCount ?? null}
                  max={usageLimits.maxUsers}
                  loading={usageLoading}
                  indicatorClassName="[&_[data-slot=progress-indicator]]:bg-emerald-400"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-3 border-t border-slate-700/50 pt-6">
            {canManageBilling && (
              <Button
                variant="outline"
                className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700/60"
                onClick={handleOpenPortal}
                disabled={portalLoading}
              >
                <CreditCard className="h-4 w-4" />
                {portalLoading ? "Opening..." : "Manage billing"}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Button>
            )}
            {(isFreeTier || isTrialing || status === "cancelled") && (
              <Button
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                onClick={handleUpgrade}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    {status === "cancelled"
                      ? "Reactivate plan"
                      : "Upgrade to Pro"}
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {isTrialing && (
          <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-slate-900 to-violet-500/10 text-white shadow-none">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Trial countdown</span>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}{" "}
                    remaining
                  </p>
                  <p className="text-sm text-slate-300">
                    Upgrade now to keep your storefront live and retain access
                    to paid billing features.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                onClick={handleUpgrade}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    Upgrade Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {isFreeTier && (
          <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-slate-900 to-cyan-500/10 text-white shadow-none">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Star className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-white">
                    Upgrade from Free to Pro
                  </p>
                  <p className="text-sm text-slate-300">
                    Unlock {getPlanNumericLimitLabel(proPlan.maxProducts)}{" "}
                    products, {getPlanNumericLimitLabel(proPlan.maxOrders)}{" "}
                    monthly orders, and{" "}
                    {getPlanNumericLimitLabel(proPlan.maxUsers)} team members on
                    one paid plan.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={handleUpgrade}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    Upgrade to Pro — {formatUsdCents(proPlan.monthlyPriceCents)}
                    /mo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <ChangePlanCard />

        <Card className="overflow-hidden border-slate-700/50 bg-slate-800/40 text-white shadow-none">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-slate-700/50 pb-4">
            <Receipt className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm font-semibold text-white">
              Invoice History
            </CardTitle>
          </CardHeader>

          <CardContent className="px-0 pt-0">
            {invoicesLoading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map(item => (
                  <div key={item} className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 bg-slate-700" />
                      <Skeleton className="h-3 w-24 bg-slate-700/60" />
                    </div>
                    <Skeleton className="h-7 w-20 bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : !invoices || invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="mb-3 h-10 w-10 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">
                  No invoices yet
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Invoices will appear here after your first payment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {invoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-700/20"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60">
                        <Receipt className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {invoice.number ?? invoice.id.slice(0, 12)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(invoice.created)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <InvoiceStatusBadge status={invoice.status} />
                      <span className="min-w-[3.5rem] text-right text-sm font-semibold text-white">
                        {formatCurrency(
                          invoice.amount_paid || invoice.amount_due,
                          invoice.currency
                        )}
                      </span>
                      {invoice.invoice_pdf ? (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download PDF"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-slate-600 px-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 cursor-not-allowed border-slate-700 px-2 text-slate-600"
                          disabled
                          title="PDF not available"
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 transition-colors hover:text-slate-300"
                          title="View invoice"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
