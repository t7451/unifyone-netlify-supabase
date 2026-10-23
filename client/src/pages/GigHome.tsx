import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Calculator,
  Clock,
  DollarSign,
  FileUp,
  Navigation,
  Receipt,
  Route,
  Sparkles,
  Wallet,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { TaxExportButton } from "@/components/TaxExportButton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

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
    title: "What your work pays",
    description:
      "Compare recorded work after estimated business costs. Set an hourly goal and plan a tax reserve.",
    href: "/work-insights",
    icon: TrendingUp,
    iconClassName: "bg-emerald-500/15 text-emerald-300",
    cta: "Review work profitability",
  },
  {
    title: "Earnings & mileage",
    description:
      "Review logged earnings, import platform statements, and keep your mileage records together.",
    href: "/money-manager",
    icon: Wallet,
    iconClassName: "bg-emerald-500/15 text-emerald-300",
    cta: "Review your records",
  },
  {
    title: "Connected accounts",
    description:
      "Manage read-only bank and gig connections when available. Provider imports stay separate from manually logged earnings.",
    href: "/connected-money",
    icon: Wallet,
    iconClassName: "bg-violet-500/15 text-violet-300",
    cta: "View account connections",
  },
  {
    title: "Business expenses",
    description:
      "Log work-related spending and review the costs you have recorded for your business.",
    href: "/work-expenses",
    icon: Receipt,
    iconClassName: "bg-amber-500/15 text-amber-300",
    cta: "Record a business expense",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMiles(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
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
  const hasWeekRecords =
    !!week &&
    (week.totalShifts > 0 || week.totalEarnings > 0 || week.totalMiles > 0);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const shiftStatus = activeShift.isLoading
    ? "Checking your work session…"
    : activeShift.isError
      ? "Work session status unavailable"
      : activeShift.data
        ? `${activeShift.data.platform} session in progress`
        : "Ready for your next session";

  return (
    <DashboardPageShell
      eyebrow="Your work. Your money."
      title={`Good ${greeting()}, ${firstName}`}
      description="See what your work brought in, keep your records in order, and choose your next step. For deliveries, rides and freelance projects."
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
                activeShift.data ? "bg-emerald-400" : "bg-slate-500"
              )}
            />
            {shiftStatus}
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
            onClick={() => navigate("/money-manager?add=work")}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Add past work
          </Button>
          <Button
            disabled={activeShift.isLoading}
            onClick={() =>
              activeShift.isError
                ? void activeShift.refetch()
                : navigate("/gig-command")
            }
            className="bg-[#D4A843] font-semibold text-[#020202] hover:bg-[#D4A843]/90"
          >
            {activeShift.isLoading
              ? "Checking session…"
              : activeShift.isError
                ? "Check session status"
                : activeShift.data
                  ? "Continue your session"
                  : "Start a work session"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      }
      stats={[
        {
          label: "Last 7 days · gross earnings",
          value: weekStats.isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : weekStats.isError ? (
            "—"
          ) : (
            formatCurrency(week?.totalEarnings ?? 0)
          ),
          helper: weekStats.isError
            ? "Earnings could not load"
            : "Logged sessions + statement imports; before costs and tax",
          icon: DollarSign,
          tone: "emerald",
        },
        {
          label: "Recorded earnings per hour",
          value: weekStats.isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : weekStats.isError || !week?.totalHours ? (
            "—"
          ) : (
            `${formatCurrency(week.avgPerHour)}/hr`
          ),
          helper: "Timed and manual work with hours; before costs and tax",
          icon: Clock,
          tone: "cyan",
        },
        {
          label: "Last 7 days · recorded hours",
          value: weekStats.isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : weekStats.isError ? (
            "—"
          ) : (
            `${(week?.totalHours ?? 0).toFixed(1)}h`
          ),
          helper: "Statement imports do not add working time",
          icon: Route,
          tone: "violet",
        },
        {
          label: "Year to date · mileage deduction",
          value: ytdDeduction.isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : ytdDeduction.isError ? (
            "—"
          ) : (
            formatCurrency(ytd?.ytdDeduction ?? 0)
          ),
          helper: "Recorded deduction estimate; not a tax bill or refund",
          icon: Receipt,
          tone: "amber",
        },
      ]}
    >
      {!weekStats.isLoading &&
      !weekStats.isError &&
      !hasWeekRecords &&
      !activeShift.isLoading &&
      !activeShift.isError &&
      !activeShift.data ? (
        <section
          className="rounded-2xl border border-[#D4A843]/30 bg-[#D4A843]/5 p-5 sm:p-6"
          aria-labelledby="first-steps-heading"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E8C25A]">
            Start with the work you already do
          </p>
          <h2
            id="first-steps-heading"
            className="mt-2 text-xl font-semibold text-white"
          >
            Start building this week’s picture
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            You can start tracking now while account linking is being prepared.
            Choose one way to add real records—no bank connection required.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/gig-command"
              className="group rounded-xl border border-white/10 bg-background/50 p-4 transition-colors hover:border-[#D4A843]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]"
            >
              <Navigation className="h-5 w-5 text-[#E8C25A]" />
              <h3 className="mt-3 font-semibold text-white">Working today?</h3>
              <p className="mt-1 text-sm text-slate-400">
                Track one session, then add earnings and any business miles when
                you finish.
              </p>
              <span className="mt-3 inline-flex items-center text-sm font-medium text-[#E8C25A]">
                Track a work session <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              href="/money-manager?add=work"
              className="group rounded-xl border border-white/10 bg-background/50 p-4 transition-colors hover:border-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Receipt className="h-5 w-5 text-emerald-300" />
              <h3 className="mt-3 font-semibold text-white">
                Already finished work?
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Add a delivery shift, rideshare session or client project you
                have not recorded yet. Include the full working time.
              </p>
              <span className="mt-3 inline-flex items-center text-sm font-medium text-emerald-300">
                Add a completed work session{" "}
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
          <Link
            href="/money-manager?tab=import"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-300 underline underline-offset-4 hover:text-white"
          >
            <FileUp className="h-4 w-4" />
            Have a platform statement? Preview an earnings import
          </Link>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Add each session once. If its earnings are already in an imported
            statement, do not add the same income again as a manual record.
          </p>
        </section>
      ) : null}

      {!activeShift.isLoading && !activeShift.isError && activeShift.data ? (
        <section
          aria-labelledby="active-next-heading"
          className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5 sm:p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
            Work in progress
          </p>
          <h2
            id="active-next-heading"
            className="mt-2 text-xl font-semibold text-white"
          >
            Finish the session you started
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Your {activeShift.data.platform} session is still active. Return to
            it to check the timer, then add earnings and business miles when you
            finish. Completed results appear in your records afterward.
          </p>
          <Button
            asChild
            className="mt-4 min-h-11 bg-[#D4A843] font-semibold text-black hover:bg-[#D4A843]/90"
          >
            <Link href="/gig-command">
              Return to your active session{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      ) : !weekStats.isLoading && !weekStats.isError && hasWeekRecords ? (
        <section
          aria-labelledby="recorded-next-heading"
          className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E8C25A]">
            Your next useful step
          </p>
          <h2
            id="recorded-next-heading"
            className="mt-2 text-xl font-semibold text-white"
          >
            {week!.totalHours > 0
              ? "See what your recorded hours returned"
              : "Your earnings are in. Working time gives them context."}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            {week!.totalHours > 0
              ? "Review profit after your estimated costs and chosen tax reserve. Compare sources using the working time you actually recorded, then check how they measure up to your hourly goal."
              : "Imported statements add earnings, but not reliable working hours. Use your own hours in the calculator for a scenario, or track your next work session. Re-entering imported income would count it twice."}
          </p>
          <Button asChild variant="outline" className="mt-4 min-h-11">
            <Link
              href={
                week!.totalHours > 0
                  ? "/work-insights"
                  : "/tools/gig-hourly-rate"
              }
            >
              {week!.totalHours > 0
                ? "Review recorded work profitability"
                : "Calculate a work scenario"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-white">Your last 7 days</CardTitle>
            <p className="text-sm text-slate-400">
              A clear view of the records you have added.
            </p>
          </CardHeader>
          <CardContent>
            {weekStats.isLoading ? (
              <div
                className="space-y-3"
                role="status"
                aria-label="Loading weekly records"
              >
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            ) : weekStats.isError ? (
              <div
                role="alert"
                className="rounded-xl border border-dashed border-border p-5"
              >
                <p className="text-sm text-slate-300">
                  Your weekly records could not load. Your recorded work has not
                  been reset.
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => void weekStats.refetch()}
                >
                  Retry weekly records
                </Button>
              </div>
            ) : hasWeekRecords ? (
              <>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-background/30 p-4">
                  <div>
                    <p className="text-xs text-slate-400">Completed sessions</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {week!.totalShifts}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Recorded business miles
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {formatMiles(week!.totalMiles)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Earnings include logged sessions and imported statements. The
                  hourly figure uses recorded work with hours. Bank activity and
                  provider-linked earnings are shown separately in Connected
                  accounts.
                </p>
                {!week!.totalHours && week!.totalEarnings > 0 ? (
                  <p className="mt-3 text-sm text-amber-300">
                    You have earnings, but no recorded work hours this week.
                    Track your next session to start measuring earnings per
                    hour.
                  </p>
                ) : null}
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/money-manager">
                    Review earnings &amp; records{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-5">
                <p className="font-medium text-white">
                  No completed records in the last 7 days
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {activeShift.data
                    ? "Your current session will appear here after you finish it."
                    : "Earlier records are still available in your earnings history. Start a session or import a statement to add this week's work."}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/money-manager">View earnings history</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="h-4 w-4 text-amber-300" />
              Tax planning, without the guesswork
            </CardTitle>
            <p className="text-sm text-slate-400">
              Keep deductions separate from what you may owe.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ytdDeduction.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : ytdDeduction.isError ? (
              <div role="alert" className="space-y-3 text-sm text-slate-300">
                <p>Your mileage deduction records could not load.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void ytdDeduction.refetch()}
                >
                  Retry mileage records
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-background/30 p-4">
                <p className="text-xs text-slate-400">
                  Recorded YTD mileage deduction estimate
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {formatCurrency(ytd?.ytdDeduction ?? 0)}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  From {formatMiles(ytd?.ytdMiles ?? 0)} in your records.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  A deduction reduces taxable income. It is not money set aside,
                  a refund, or your estimated tax bill. Review mileage
                  eligibility and the applicable tax-year rate before filing.
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-300">
                Your tax reserve depends on your income, expenses and filing
                situation. Use the estimator to plan a reserve with your own
                inputs.
              </p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href="/tools/quarterly-tax-estimator">
                  Estimate quarterly taxes{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-slate-400">
                Export your logged work and mileage records.
              </p>
              <TaxExportButton />
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="next-step-heading">
        <h2 id="next-step-heading" className="text-lg font-semibold text-white">
          What do you need to do next?
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#D4A843]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]"
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
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {link.description}
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-[#D4A843]">
                {link.cta}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </DashboardPageShell>
  );
}
