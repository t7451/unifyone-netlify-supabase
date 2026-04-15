/**
 * governance-metrics-scheduled.mts
 *
 * Netlify Scheduled Function — runs daily at 01:00 UTC to snapshot
 * governance metrics for the previous day.
 *
 * Computes a daily summary from the audit_logs and escalation_queue tables
 * and inserts a row into governance_metrics. This powers the compliance
 * dashboard and long-term trend reports.
 *
 * Schedule: daily at 01:00 UTC
 * Timeout:  30 seconds (scheduled function limit)
 */
import type { Config } from "@netlify/functions";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { getDb } from "../../server/db";
import {
  auditLogs,
  escalationQueue,
  killSwitches,
  governanceMetrics,
} from "../../drizzle/schema";

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[governance-metrics] Starting daily snapshot. Next run: ${next_run}`);

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[governance-metrics] Database unavailable — skipping snapshot.");
      return;
    }

    // Yesterday's date bounds (UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dayStart = new Date(
      Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const metricDateStr = dayStart.toISOString().slice(0, 10); // YYYY-MM-DD

    // Count total audit log operations for the day
    const [{ totalOps }] = await db
      .select({ totalOps: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(gte(auditLogs.createdAt, dayStart), lt(auditLogs.createdAt, dayEnd)));

    // Count escalations triggered
    const [{ escalationsTriggered }] = await db
      .select({ escalationsTriggered: sql<number>`count(*)` })
      .from(escalationQueue)
      .where(and(gte(escalationQueue.createdAt, dayStart), lt(escalationQueue.createdAt, dayEnd)));

    // Count approved and rejected escalations resolved that day
    const [{ escalationsApproved }] = await db
      .select({ escalationsApproved: sql<number>`count(*)` })
      .from(escalationQueue)
      .where(
        and(
          eq(escalationQueue.status, "approved"),
          gte(escalationQueue.createdAt, dayStart),
          lt(escalationQueue.createdAt, dayEnd)
        )
      );

    const [{ escalationsRejected }] = await db
      .select({ escalationsRejected: sql<number>`count(*)` })
      .from(escalationQueue)
      .where(
        and(
          eq(escalationQueue.status, "rejected"),
          gte(escalationQueue.createdAt, dayStart),
          lt(escalationQueue.createdAt, dayEnd)
        )
      );

    // Count currently active kill switches
    const [{ killSwitchesActivated }] = await db
      .select({ killSwitchesActivated: sql<number>`count(*)` })
      .from(killSwitches)
      .where(eq(killSwitches.isActive, true));

    // Simple compliance score: 100 − (escalations / max(totalOps,1)) * 100, capped 0–100
    const total = Number(totalOps) || 0;
    const escalated = Number(escalationsTriggered) || 0;
    const complianceScore =
      total > 0
        ? Math.max(0, Math.min(100, 100 - (escalated / total) * 100)).toFixed(2)
        : "100.00";

    const metricsValues = {
      metricDate: metricDateStr,
      totalOperations: total,
      escalationsTriggered: escalated,
      escalationsApproved: Number(escalationsApproved) || 0,
      escalationsRejected: Number(escalationsRejected) || 0,
      killSwitchesActivated: Number(killSwitchesActivated) || 0,
      complianceScore,
    };

    // Check if a row already exists for this date, then insert or update.
    // (The migration adds UNIQUE on metric_date; this explicit check avoids
    //  relying on Drizzle's onConflictDoUpdate which requires a unique index
    //  to be reflected in the Drizzle schema object.)
    const existing = await db
      .select({ id: governanceMetrics.id })
      .from(governanceMetrics)
      .where(eq(governanceMetrics.metricDate, metricDateStr))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(governanceMetrics)
        .set(metricsValues)
        .where(eq(governanceMetrics.id, existing[0].id));
    } else {
      await db.insert(governanceMetrics).values(metricsValues);
    }

    console.log(
      `[governance-metrics] Snapshot for ${metricDateStr}: ops=${total}, escalated=${escalated}, score=${complianceScore}`
    );
  } catch (err) {
    console.error("[governance-metrics] Fatal error:", err);
  }
};

export const config: Config = {
  schedule: "0 1 * * *", // 01:00 UTC daily
};
