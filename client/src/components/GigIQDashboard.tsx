/**
 * client/src/components/GigIQDashboard.tsx
 *
 * GigIQ Intelligence Dashboard — the "aha moment" component.
 *
 * Surfaces the three numbers that hook a gig worker in the first session:
 *   1. Your best vs worst platform (dollar-specific gap)
 *   2. YTD deduction you've accumulated (IRS $0.70/mile)
 *   3. Your best earning hour of the day
 *
 * Wired directly to moneyManager.getShiftBreakdown + getYTDDeduction.
 * Empty state prompts the user to log their first shift.
 * Upgrade prompt fires when projected deductions < $1,000 with 5+ shifts.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, Car, Clock, Zap, ArrowRight,
  AlertTriangle, Sparkles,
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
    <Card className="border-[#242424] bg-[#0A0A0A]">
      <CardContent className="py-10 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F0D080]/10 border border-[#F0D080]/20
                        flex items-center justify-center">
          <Zap className="w-5 h-5 text-[#F0D080]" />
        </div>
        <div>
          <p className="text-white font-semibold mb-1">No shifts logged yet</p>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Log your first shift to see exactly what you earn per hour across platforms,
            zones, and times — and your running IRS deduction total.
          </p>
        </div>
        <Link href="/gig-command">
          <Button size="sm"
            className="bg-[#F0D080] hover:bg-[#D4A843] text-black font-semibold gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Start first shift
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function UpgradeBanner({ missedDeduction }: { missedDeduction: number }) {
  return (
    <div className="rounded-xl border border-[#F0D080]/25 bg-[#F0D080]/5 p-4
                    flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-[#F0D080] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-0.5">
          You may be leaving {fmt(missedDeduction)} in deductions unclaimed this year
        </p>
        <p className="text-xs text-gray-500">
          The average gig worker claims $3,200/yr. Pro tier unlocks full mileage tracking,
          quarterly estimates, and 1099 prep.
        </p>
      </div>
      <Link href="/billing">
        <Button size="sm" variant="outline"
          className="border-[#F0D080]/30 text-[#F0D080] hover:bg-[#F0D080]/10
                     text-xs shrink-0 gap-1">
          Go Pro <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
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
  const [activePeriod, setActivePeriod] = useState<"week" | "month" | "year" | "all">(period);

  const breakdown = trpc.moneyManager.getShiftBreakdown.useQuery({ period: activePeriod });
  const ytd = trpc.moneyManager.getYTDDeduction.useQuery();
  const stats = trpc.moneyManager.getShiftStats.useQuery({ period: activePeriod });

  const isLoading = breakdown.isLoading || ytd.isLoading || stats.isLoading;
  const hasShifts = (breakdown.data?.byPlatform?.length ?? 0) > 0;

  const topPlatform = breakdown.data?.byPlatform?.[0];
  const worstPlatform = breakdown.data?.byPlatform?.[breakdown.data.byPlatform.length - 1];
  const bestHour = breakdown.data?.byHour
    ? [...breakdown.data.byHour].sort((a, b) => b.avgPerHour - a.avgPerHour)[0]
    : null;
  const bestDay = breakdown.data?.byDayOfWeek
    ? [...breakdown.data.byDayOfWeek].sort((a, b) => b.avgPerHour - a.avgPerHour)[0]
    : null;

  const platformGap =
    topPlatform && worstPlatform && topPlatform.platform !== worstPlatform.platform
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F0D080]" />
          <span className="text-sm font-semibold text-white">GigIQ Intelligence</span>
          <Badge variant="outline"
            className="text-[10px] border-[#F0D080]/20 text-[#F0D080] px-1.5">
            BETA
          </Badge>
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-all",
                activePeriod === p.value
                  ? "bg-[#F0D080] text-black"
                  : "text-gray-500 hover:text-gray-300"
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
            <div key={i} className="h-28 rounded-xl bg-[#0A0A0A] border border-[#161616] animate-pulse" />
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
            <Card className="border-[#242424] bg-[#0A0A0A] hover:border-[#F0D080]/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Platform ranking
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {breakdown.data!.byPlatform.slice(0, 3).map((p, i) => (
                  <div key={p.platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                        i === 0 ? "bg-emerald-500/20 text-emerald-400" :
                        i === 1 ? "bg-blue-500/20 text-blue-400" :
                        "bg-gray-500/20 text-gray-400")}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-white">{p.platform}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {fmt(p.avgPerHour)}/hr
                      </div>
                      <div className="text-[10px] text-gray-600">{p.totalShifts} shifts</div>
                    </div>
                  </div>
                ))}
                {platformGap > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#161616]">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Shifting 2 hrs/wk from{" "}
                      <span className="text-red-400">{worstPlatform?.platform}</span> to{" "}
                      <span className="text-emerald-400">{topPlatform?.platform}</span> adds{" "}
                      <span className="text-white font-semibold">
                        ~{fmt(platformGap * 2 * 4)}/mo
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: YTD Deduction */}
            <Card className="border-[#242424] bg-[#0A0A0A] hover:border-[#6EE7B7]/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3 h-3" /> IRS deduction tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">
                      {fmt(ytd.data?.ytdDeduction ?? 0)}
                    </span>
                    <span className="text-xs text-gray-600">YTD</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {fmtMiles(ytd.data?.ytdMiles ?? 0)} logged @ $0.70/mi (IRS 2025)
                  </p>
                </div>

                {(ytd.data?.projectedYearlyDeduction ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Projected year-end</span>
                    <span className="text-emerald-400 font-semibold">
                      {fmt(ytd.data!.projectedYearlyDeduction)}
                    </span>
                  </div>
                )}

                {(ytd.data?.quarterlyEstimate ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Quarterly estimate</span>
                    <span className="text-white font-medium">
                      {fmt(ytd.data!.quarterlyEstimate)}
                    </span>
                  </div>
                )}

                {/* Progress bar toward $3,200 avg */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                    <span>vs $3,200 avg</span>
                    <span>{Math.min(100, Math.round(((ytd.data?.projectedYearlyDeduction ?? 0) / 3200) * 100))}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-[#161616] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, ((ytd.data?.projectedYearlyDeduction ?? 0) / 3200) * 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Best time slots */}
            <Card className="border-[#242424] bg-[#0A0A0A] hover:border-[#93C5FD]/20 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Best earning windows
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {bestHour && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Best hour</p>
                      <p className="text-sm font-semibold text-white">{bestHour.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#93C5FD]">
                        {fmt(bestHour.avgPerHour)}/hr
                      </p>
                      <p className="text-[10px] text-gray-600">{bestHour.shiftCount} shifts</p>
                    </div>
                  </div>
                )}

                {bestDay && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Best day</p>
                      <p className="text-sm font-semibold text-white">{bestDay.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#93C5FD]">
                        {fmt(bestDay.avgPerHour)}/hr
                      </p>
                      <p className="text-[10px] text-gray-600">{bestDay.shiftCount} shifts</p>
                    </div>
                  </div>
                )}

                {/* Hour-of-day sparkline */}
                {breakdown.data!.byHour.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#161616]">
                    <p className="text-[10px] text-gray-600 mb-2">Earnings/hr by time of day</p>
                    <div className="flex items-end gap-0.5 h-8">
                      {Array.from({ length: 24 }, (_, h) => {
                        const entry = breakdown.data!.byHour.find(x => x.hour === h);
                        const maxVal = Math.max(...breakdown.data!.byHour.map(x => x.avgPerHour), 1);
                        const pct = entry ? (entry.avgPerHour / maxVal) * 100 : 0;
                        const isBest = entry && entry.hour === bestHour?.hour;
                        return (
                          <div
                            key={h}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              background: isBest
                                ? "#93C5FD"
                                : pct > 0 ? "#1E3A5F" : "#161616",
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
            <div className="rounded-xl border border-[#F0D080]/15 bg-[#F0D080]/5 px-4 py-3
                            flex items-start gap-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F0D080] mt-0.5 shrink-0" />
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-[#F0D080] font-medium">Kai: </span>
                {breakdown.data.topInsight}
              </p>
              <Link href="/ai-assistant">
                <button className="text-[11px] text-gray-600 hover:text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                  Ask Kai →
                </button>
              </Link>
            </div>
          )}

          {/* Upgrade prompt */}
          {ytd.data?.shouldUpgradePrompt && ytd.data.missedDeduction > 500 && (
            <UpgradeBanner missedDeduction={ytd.data.missedDeduction} />
          )}
        </>
      )}
    </div>
  );
}
