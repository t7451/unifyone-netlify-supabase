import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Calculator,
  Car,
  Clock,
  DollarSign,
  Navigation,
  Receipt,
  Route,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const IRS_RATE = 0.7; // 2025 IRS standard mileage rate per mile

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof Navigation;
  iconClassName: string;
  cta: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Gig Command",
    description:
      "Start a GPS-tracked shift, see live route intelligence, and log earnings as you drive.",
    href: "/gig-command",
    icon: Navigation,
    iconClassName: "bg-cyan-500/15 text-cyan-300",
    cta: "Open command center",
  },
  {
    title: "Money Manager",
    description:
      "Pull every platform together — earnings, mileage, rules, and your full shift history.",
    href: "/money-manager",
    icon: Wallet,
    iconClassName: "bg-emerald-500/15 text-emerald-300",
    cta: "Manage your money",
  },
  {
    title: "Free tools",
    description:
      "Mileage deduction, quarterly tax estimator, hourly-rate and set-aside calculators — no login walls.",
    href: "/tools",
    icon: Wrench,
    iconClassName: "bg-amber-500/15 text-amber-300",
    cta: "Browse free tools",
  },
  {
    title: "Plans",
    description:
      "Stay free or go Pro for $4.99/mo. AI features are included the moment they ship.",
    href: "/gig-worker-plans",
    icon: Sparkles,
    iconClassName: "bg-violet-500/15 text-violet-300",
    cta: "Compare plans",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMiles(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} mi`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default function GigHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const weekStats = trpc.moneyManager.getShiftStats.useQuery({
    period: "week",
  });
  const ytdDeduction = trpc.moneyManager.getYTDDeduction.useQuery();
  const activeShift = trpc.moneyManager.getActiveShift.useQuery();
  const subscription = trpc.gigWorker.getSubscription.useQuery();

  const week = weekStats.data;
  const ytd = ytdDeduction.data;

  const ytdSetAside = useMemo(() => {
    // Estimated quarterly set-aside surfaced by getYTDDeduction. Falls back to
    // a mileage-based deduction figure if the projection is unavailable.
    if (ytd?.quarterlyEstimate && ytd.quarterlyEstimate > 0) {
      return ytd.quarterlyEstimate;
    }
    return (ytd?.ytdMiles ?? 0) * IRS_RATE;
  }, [ytd]);

  // Show the upgrade nudge to anyone who is not on an active paid plan: free
  // starters, users with no subscription, and lapsed paid plans (canceled /
  // past_due) who have effectively reverted to free functionality.
  const sub = subscription.data;
  const onActivePaidPlan =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.plan?.tier !== "starter";
  const showUpgradeNudge = !!sub && !onActivePaidPlan;

  return (
    <DashboardPageShell
      eyebrow="Your gig money, at a glance"
      title={`Good ${greeting()}, ${user?.name ?? "driver"}`}
      description="Track what you earned, the miles you can deduct, and the taxes to set aside — then jump straight into your next shift."
      meta={
        <>
          <Badge
            variant="outline"
            className={cn(
              "border-white/10 bg-white/5",
              activeShift.data ? "text-emerald-300" : "text-slate-300"
            )}
          >
            <span
              className={cn(
                "mr-1.5 inline-block h-2 w-2 rounded-full",
                activeShift.data
                  ? "animate-pulse bg-emerald-400"
                  : "bg-slate-500"
              )}
            />
            {activeShift.data
              ? `${activeShift.data.platform} shift in progress`
              : "No active shift"}
          </Badge>
          {subscription.data?.plan ? (
            <Badge variant="outline" className="border-white/10 bg-white/5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {subscription.data.plan.name}
            </Badge>
          ) : null}
        </>
      }
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => navigate("/money-manager")}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Money Manager
          </Button>
          <Button
            onClick={() => navigate("/gig-command")}
            className="bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
          >
            {activeShift.data ? "Open active shift" : "Start a shift"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      }
      stats={[
        {
          label: "This week's earnings",
          value: weekStats.isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : weekStats.isError ? (
            "—"
          ) : (
            formatCurrencyCents(week?.totalEarnings ?? 0)
          ),
          helper:
            week && week.totalShifts > 0
              ? `${week.totalShifts} shift${week.totalShifts === 1 ? "" : "s"} · ${formatCurrencyCents(week.avgPerHour)}/hr`
              : "No shifts logged this week yet",
          icon: DollarSign,
          tone: "emerald",
        },
        {
          label: "This week's hours",
          value: weekStats.isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : weekStats.isError ? (
            "—"
          ) : (
            `${(week?.totalHours ?? 0).toFixed(1)}h`
          ),
          helper:
            week && week.totalMiles > 0
              ? `${formatMiles(week.totalMiles)} driven`
              : "Tracked automatically per shift",
          icon: Clock,
          tone: "cyan",
        },
        {
          label: "YTD deductible mileage",
          value: ytdDeduction.isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : ytdDeduction.isError ? (
            "—"
          ) : (
            formatMiles(ytd?.ytdMiles ?? 0)
          ),
          helper: ytd
            ? `${formatCurrency(ytd.ytdDeduction)} deduction @ $${IRS_RATE.toFixed(2)}/mi`
            : "IRS standard mileage rate",
          icon: Route,
          tone: "violet",
        },
        {
          label: "Est. tax to set aside",
          value: ytdDeduction.isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : ytdDeduction.isError ? (
            "—"
          ) : (
            formatCurrency(ytdSetAside)
          ),
          helper: "Quarterly estimate (Form 1040-ES)",
          icon: Receipt,
          tone: "amber",
        },
      ]}
    >
      {/* Shift snapshot + tax autopilot */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white">Shift snapshot</CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Your last 7 days across every platform you drive for.
              </p>
            </div>
            <Button
              variant="ghost"
              className="px-0 text-[#00D9FF] hover:text-[#00D9FF]/80"
              onClick={() => navigate("/gig-command")}
            >
              Go to Gig Command <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {weekStats.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : weekStats.isError ? (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-slate-400">
                <p>We could not load your shift snapshot right now.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void weekStats.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : week && week.totalShifts > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SnapshotStat
                  icon={DollarSign}
                  iconClassName="text-emerald-300"
                  label="Earned"
                  value={formatCurrencyCents(week.totalEarnings)}
                />
                <SnapshotStat
                  icon={TrendingUp}
                  iconClassName="text-cyan-300"
                  label="Per hour"
                  value={formatCurrencyCents(week.avgPerHour)}
                />
                <SnapshotStat
                  icon={Route}
                  iconClassName="text-violet-300"
                  label="Miles"
                  value={formatMiles(week.totalMiles)}
                />
                <SnapshotStat
                  icon={Car}
                  iconClassName="text-amber-300"
                  label="Shifts"
                  value={String(week.totalShifts)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-background/30 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D9FF]/10 text-[#00D9FF]">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">No shifts yet</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Track your first GPS shift to see real $/hour, mileage, and
                    your tax deduction add up automatically.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/gig-command")}
                  className="bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
                >
                  Track your first shift <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="h-4 w-4 text-amber-300" />
              Tax Autopilot
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              IRS mileage and quarterly estimated taxes, tracked for you.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ytdDeduction.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : ytdDeduction.isError ? (
              <div className="flex flex-col items-start gap-3 text-sm text-slate-400">
                <p>We could not load your tax estimate right now.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void ytdDeduction.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-xs text-slate-300">
                    YTD mileage deduction
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatCurrency(ytd?.ytdDeduction ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatMiles(ytd?.ytdMiles ?? 0)} @ ${IRS_RATE.toFixed(2)}
                    /mi (IRS standard rate)
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs text-slate-300">
                    Estimated tax to set aside
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatCurrency(ytdSetAside)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Quarterly estimate for Form 1040-ES
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => navigate("/tools/quarterly-tax-estimator")}
                >
                  Open quarterly tax estimator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-white">Jump back in</CardTitle>
          <p className="mt-1 text-sm text-slate-400">
            Everything you need to drive smarter and keep more of what you earn.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-border bg-background/40 p-4 text-left transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5"
              >
                <div
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
                    link.iconClassName
                  )}
                >
                  <link.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium text-white">{link.title}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {link.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-[#00D9FF]">
                  {link.cta}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade nudge — only for workers not on an active paid plan */}
      {showUpgradeNudge ? (
        <Card className="border-violet-500/30 bg-violet-900/20">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-white">Go Pro for $4.99/mo</p>
                <p className="mt-1 text-sm text-violet-100/80">
                  Unlock tax export, the route optimizer, and more — plus AI
                  features included the moment they ship.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="shrink-0 bg-violet-600 text-white hover:bg-violet-700"
            >
              <Link href="/gig-worker-plans">See plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </DashboardPageShell>
  );
}

function SnapshotStat({
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  icon: typeof DollarSign;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
