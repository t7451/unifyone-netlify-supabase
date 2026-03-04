import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard,
  Download,
  ExternalLink,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

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

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    paid: {
      label: "Paid",
      icon: <CheckCircle2 className="w-3 h-3" />,
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    open: {
      label: "Open",
      icon: <Clock className="w-3 h-3" />,
      className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    },
    void: {
      label: "Void",
      icon: <XCircle className="w-3 h-3" />,
      className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    },
    uncollectible: {
      label: "Uncollectible",
      icon: <AlertTriangle className="w-3 h-3" />,
      className: "bg-red-500/15 text-red-400 border-red-500/30",
    },
  };
  const cfg = map[status] ?? map.open;
  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

export default function Billing() {
  const [, navigate] = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subStatus, isLoading: subLoading } = trpc.subscription.getStatus.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.subscription.getInvoices.useQuery();

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
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe billing portal...");
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const periodEndStr = subStatus?.subscriptionCurrentPeriodEnd
    ? new Date(subStatus.subscriptionCurrentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your plan, payment method, and invoice history.
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Current Plan</p>
                {subLoading ? (
                  <Skeleton className="h-6 w-32 mt-1 bg-slate-700" />
                ) : (
                  <p className="text-lg font-semibold text-white">
                    {subStatus?.plan?.name ?? "Free Tier"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {subLoading ? (
                <Skeleton className="h-6 w-20 bg-slate-700" />
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className={
                      subStatus?.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : subStatus?.status === "trialing"
                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                        : subStatus?.status === "past_due"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                    }
                  >
                    {subStatus?.status === "active"
                      ? "Active"
                      : subStatus?.status === "trialing"
                      ? "Trialing"
                      : subStatus?.status === "past_due"
                      ? "Past Due"
                      : subStatus?.status === "cancelled"
                      ? "Cancelled"
                      : "Free"}
                  </Badge>
                  {periodEndStr && (
                    <p className="text-xs text-slate-500">Renews {periodEndStr}</p>
                  )}
                  {subStatus?.trialDaysLeft !== null && subStatus?.tenantStatus === "trial" && (
                    <p className="text-xs text-amber-400">
                      {subStatus.trialDaysLeft} days left in trial
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Plan details */}
          {!subLoading && subStatus?.plan && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-white">{subStatus.plan.maxProducts?.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Max Products</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{subStatus.plan.maxOrders?.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Max Orders/mo</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{subStatus.plan.maxUsers}</p>
                <p className="text-xs text-slate-500">Team Members</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {(subStatus?.status === "none" || subStatus?.tenantStatus === "trial" || subStatus?.status === "cancelled") && (
              <Button
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
                onClick={() => navigate("/settings")}
              >
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Upgrade Plan
              </Button>
            )}
            {subStatus?.stripeCustomerId && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={handleOpenPortal}
                disabled={portalLoading}
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                {portalLoading ? "Opening..." : "Manage Billing"}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-60" />
              </Button>
            )}
          </div>
        </div>

        {/* Invoice History */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50">
            <Receipt className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Invoice History</h2>
          </div>

          {invoicesLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
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
              <Receipt className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-400">No invoices yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Invoices will appear here after your first payment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {invoice.number ?? invoice.id.slice(0, 12)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(invoice.created)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="text-sm font-semibold text-white min-w-[4rem] text-right">
                      {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                    </span>
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="View invoice"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
