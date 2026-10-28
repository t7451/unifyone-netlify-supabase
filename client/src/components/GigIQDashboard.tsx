/** Recorded platform comparisons, mileage deduction estimates, and earning windows. */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Car,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, prefix = "$") {
  return `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMiles(n: number) {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="py-10 text-center space-y-4">
        <div
          className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20
                        flex items-center justify-center"
        >
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">
            No shifts logged yet
          </p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Log your first shift to see exactly what you earn per hour across
            platforms and times, plus a mileage deduction estimate from your
            recorded business miles.
          </p>
        </div>
        <Link href="/gig-command">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Start first shift
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function RecordOptions() {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Keep your work records together
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Basic shift and mileage tracking is free. Pro adds statement imports,
          saved history and accountant-ready records. These records support your
          review; they do not file your taxes.
        </p>
      </div>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="shrink-0 gap-1 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Link href="/pricing">
          Compare Pro <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GigIQDashboardProps {
  period?: "week" | "month" | "year" | "all";
  className?: string;
}

export default function GigIQDashboard({
  period = "month",
  className,
}: GigIQDashboardProps) {
  const [activePeriod, setActivePeriod] = useState<
    "week" | "month" | "year" | "all"
  >(period);

  const breakdown = trpc.moneyManager.getShiftBreakdown.useQuery({
    period: activePeriod,
  });
  const ytd = trpc.moneyManager.getYTDDeduction.useQuery();
  const stats = trpc.moneyManager.getShiftStats.useQuery({
    period: activePeriod,
  });

  const isLoading = breakdown.isLoading || ytd.isLoading || stats.isLoading;
  const hasShifts = (breakdown.data?.byPlatform?.length ?? 0) > 0;

  const topPlatform = breakdown.data?.byPlatform?.[0];
  const worstPlatform =
    breakdown.data?.byPlatform?.[breakdown.data.byPlatform.length - 1];
  const bestHour = breakdown.data?.byHour
    ? [...breakdown.data.byHour].sort((a, b) => b.avgPerHour - a.avgPerHour)[0]
    : null;
  const bestDay = breakdown.data?.byDayOfWeek
    ? [...breakdown.data.byDayOfWeek].sort(
        (a, b) => b.avgPerHour - a.avgPerHour
      )[0]
    : null;

  const platformGap =
    topPlatform &&
    worstPlatform &&
    topPlatform.platform !== worstPlatform.platform
      ? topPlatform.avgPerHour - worstPlatform.avgPerHour
      : 0;

  const PERIODS: Array<{ value: typeof activePeriod; label: string }> = [
    { value: "week", label: "7d" },
    { value: "month", label: "MTD" },
    { value: "year", label: "YTD" },
    { value: "all", label: "All" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Period selector + section label */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            GigIQ Intelligence
          </span>
          <Badge
            variant="outline"
            className="text-[10px] border-primary/20 text-primary px-1.5"
          >
            BETA
          </Badge>
        </div>
        <div className="flex max-w-full flex-wrap gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-all",
                activePeriod === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-28 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasShifts && <EmptyState />}

      {/* Intelligence cards */}
      {!isLoading && hasShifts && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Platform gap */}
            <Card className="border-border bg-card hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Platform ranking
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {breakdown.data!.byPlatform.slice(0, 3).map((p, i) => (
                  <div
                    key={p.platform}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                          i === 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : i === 1
                              ? "bg-muted text-muted-foreground"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">
                        {p.platform}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {fmt(p.avgPerHour)}/hr
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.totalShifts} shifts
                      </div>
                    </div>
                  </div>
                ))}
                {platformGap > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Shifting 2 hrs/wk from{" "}
                      <span className="text-red-400">
                        {worstPlatform?.platform}
                      </span>{" "}
                      to{" "}
                      <span className="text-emerald-400">
                        {topPlatform?.platform}
                      </span>{" "}
                      adds{" "}
                      <span className="text-foreground font-semibold">
                        ~{fmt(platformGap * 2 * 4)}/mo
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: YTD Deduction */}
            <Card className="border-border bg-card hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3 h-3" /> Mileage deduction estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-foreground">
                      {ytd.data && !ytd.isError
                        ? fmt(ytd.data.ytdDeduction)
                        : "Unavailable"}
                    </span>
                    <span className="text-xs text-muted-foreground">YTD</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ytd.data && !ytd.isError
                      ? `${fmtMiles(ytd.data.ytdMiles)} logged. `
                      : ""}
                    Deduction estimate from recorded mileage; rates vary by
                    date.
                  </p>
                </div>

                {(ytd.data?.projectedYearlyDeduction ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Projected year-end deduction
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {fmt(ytd.data!.projectedYearlyDeduction)}
                    </span>
                  </div>
                )}

                {(ytd.data?.quarterlyEstimate ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Quarterly deduction estimate
                    </span>
                    <span className="text-foreground font-medium">
                      {fmt(ytd.data!.quarterlyEstimate)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Best time slots */}
            <Card className="border-border bg-card hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Best earning windows
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {bestHour && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Best hour</p>
                      <p className="text-sm font-semibold text-foreground">
                        {bestHour.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {fmt(bestHour.avgPerHour)}/hr
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {bestHour.shiftCount} shifts
                      </p>
                    </div>
                  </div>
                )}

                {bestDay && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Best day</p>
                      <p className="text-sm font-semibold text-foreground">
                        {bestDay.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {fmt(bestDay.avgPerHour)}/hr
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {bestDay.shiftCount} shifts
                      </p>
                    </div>
                  </div>
                )}

                {/* Hour-of-day sparkline */}
                {breakdown.data!.byHour.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Earnings/hr by time of day
                    </p>
                    <div className="flex items-end gap-0.5 h-8">
                      {Array.from({ length: 24 }, (_, h) => {
                        const entry = breakdown.data!.byHour.find(
                          x => x.hour === h
                        );
                        const maxVal = Math.max(
                          ...breakdown.data!.byHour.map(x => x.avgPerHour),
                          1
                        );
                        const pct = entry
                          ? (entry.avgPerHour / maxVal) * 100
                          : 0;
                        const isBest = entry && entry.hour === bestHour?.hour;
                        return (
                          <div
                            key={h}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              background: isBest
                                ? "var(--primary)"
                                : pct > 0
                                  ? "color-mix(in oklab, var(--primary) 30%, transparent)"
                                  : "var(--muted)",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top insight from Kai */}
          {breakdown.data?.topInsight && (
            <div
              className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3
                            flex items-start gap-3"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">
                <span className="text-primary font-medium">Kai: </span>
                {breakdown.data.topInsight}
              </p>
              <Link href="/ai-assistant">
                <button className="text-[11px] text-muted-foreground hover:text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                  Ask Kai →
                </button>
              </Link>
            </div>
          )}

          {ytd.data?.shouldUpgradePrompt && <RecordOptions />}
        </>
      )}
    </div>
  );
}
