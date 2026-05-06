/**
 * server/lib/earningsAnomaly.ts
 *
 * Per-platform earnings anomaly detection.
 * Computes baseline mean & std-dev of $/hour for each platform,
 * compares the most recent N shifts to that baseline, and flags
 * deviations exceeding a configurable threshold.
 */

import { eq, and, gte, desc } from "drizzle-orm";
import { getDb } from "../db";
import { gigShifts } from "../../drizzle/schema";

export interface AnomalyResult {
  platform: string;
  baselinePerHour: number;
  recentPerHour: number;
  deltaPct: number;
  severity: "info" | "warn" | "critical";
  direction: "up" | "down" | "flat";
  message: string;
  recentShiftCount: number;
  baselineShiftCount: number;
}

export interface DetectAnomaliesInput {
  userId: number;
  /** Window for baseline computation, in days (default 30) */
  lookbackDays?: number;
  /** Number of most-recent shifts treated as "recent" sample (default 3) */
  recentSampleSize?: number;
  /** Minimum baseline shifts required to compute an anomaly (default 5) */
  minBaselineShifts?: number;
  /** Std-dev multiplier for "warn" threshold (default 1.5) */
  warnStdMultiplier?: number;
  /** Std-dev multiplier for "critical" threshold (default 2.5) */
  criticalStdMultiplier?: number;
}

interface ShiftRow {
  platform: string;
  grossEarnings: string | number;
  tips: string | number;
  bonuses: string | number;
  durationMinutes: number | null;
  startTime: Date;
}

function shiftPerHour(s: ShiftRow): number | null {
  const minutes = s.durationMinutes ?? 0;
  if (minutes <= 0) return null;
  const earnings = Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
  return earnings / (minutes / 60);
}

function meanAndStdDev(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export async function detectAnomalies(
  input: DetectAnomaliesInput
): Promise<AnomalyResult[]> {
  const db = await getDb();
  if (!db) return [];

  const lookbackDays = input.lookbackDays ?? 30;
  const recentSampleSize = input.recentSampleSize ?? 3;
  const minBaselineShifts = input.minBaselineShifts ?? 5;
  const warnMul = input.warnStdMultiplier ?? 1.5;
  const critMul = input.criticalStdMultiplier ?? 2.5;

  const since = new Date(Date.now() - lookbackDays * 86400000);

  const shifts = (await db
    .select({
      platform: gigShifts.platform,
      grossEarnings: gigShifts.grossEarnings,
      tips: gigShifts.tips,
      bonuses: gigShifts.bonuses,
      durationMinutes: gigShifts.durationMinutes,
      startTime: gigShifts.startTime,
    })
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.userId, input.userId),
        eq(gigShifts.status, "completed"),
        gte(gigShifts.startTime, since)
      )
    )
    .orderBy(desc(gigShifts.startTime))) as ShiftRow[];

  // Group per platform
  const byPlatform = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    const arr = byPlatform.get(s.platform) ?? [];
    arr.push(s);
    byPlatform.set(s.platform, arr);
  }

  const results: AnomalyResult[] = [];

  for (const [platform, list] of Array.from(byPlatform.entries())) {
    if (list.length < minBaselineShifts + recentSampleSize) continue;

    // list is sorted DESC by startTime, so first N are "recent"
    const recent = list.slice(0, recentSampleSize);
    const baseline = list.slice(recentSampleSize);

    const recentRates = recent
      .map(shiftPerHour)
      .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);
    const baselineRates = baseline
      .map(shiftPerHour)
      .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);

    if (recentRates.length === 0 || baselineRates.length < minBaselineShifts)
      continue;

    const { mean: baselineMean, std: baselineStd } =
      meanAndStdDev(baselineRates);
    const recentMean =
      recentRates.reduce((a, b) => a + b, 0) / recentRates.length;

    if (baselineMean <= 0) continue;

    const delta = recentMean - baselineMean;
    const deltaPct = (delta / baselineMean) * 100;
    const z = baselineStd > 0 ? Math.abs(delta) / baselineStd : 0;

    let severity: AnomalyResult["severity"] = "info";
    if (z >= critMul) severity = "critical";
    else if (z >= warnMul) severity = "warn";
    else continue; // not anomalous enough to report

    const direction: AnomalyResult["direction"] =
      delta > 0 ? "up" : delta < 0 ? "down" : "flat";

    const dollarsPerHourBaseline = baselineMean.toFixed(2);
    const dollarsPerHourRecent = recentMean.toFixed(2);
    const message =
      direction === "down"
        ? `Your ${platform} $/hr dropped from $${dollarsPerHourBaseline} (last ${lookbackDays}d) to $${dollarsPerHourRecent} in your last ${recentSampleSize} shifts (${deltaPct.toFixed(1)}%).`
        : `Your ${platform} $/hr jumped from $${dollarsPerHourBaseline} to $${dollarsPerHourRecent} in your last ${recentSampleSize} shifts (+${deltaPct.toFixed(1)}%).`;

    results.push({
      platform,
      baselinePerHour: Math.round(baselineMean * 100) / 100,
      recentPerHour: Math.round(recentMean * 100) / 100,
      deltaPct: Math.round(deltaPct * 10) / 10,
      severity,
      direction,
      message,
      recentShiftCount: recentRates.length,
      baselineShiftCount: baselineRates.length,
    });
  }

  // Sort: critical first, then by absolute delta
  return results.sort((a, b) => {
    const order = { critical: 0, warn: 1, info: 2 };
    if (order[a.severity] !== order[b.severity])
      return order[a.severity] - order[b.severity];
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });
}
