import { TRPCError } from "@trpc/server";
import * as repo from "./mobileAutomation.repo";

/**
 * Mobile-automation use-cases: n8n schedule CRUD + manual trigger (outbound
 * webhook), deep-link attribution tracking/stats, CAPI event log summaries, and
 * mobile push schedule CRUD + send. Side effects (the schedule webhook POST) and
 * DB write ordering are preserved exactly from the original router.
 */

const dbUnavailable = () =>
  new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "DB unavailable",
  });

// ─── Cron helpers ─────────────────────────────────────────────────────────────

export function nextCronDate(cronExpr: string): Date | null {
  // Simple next-run estimator for common patterns — not a full cron parser
  try {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minute, hour] = parts;
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Number(minute) || 0);
    next.setHours(Number(hour) || 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  } catch {
    return null;
  }
}

// ── n8n Schedules ─────────────────────────────────────────────────────────────

export async function listSchedules(tenantId: number) {
  const rows = await repo.listSchedules(tenantId);
  if (rows === null) return [];
  return rows;
}

export async function createSchedule(
  tenantId: number,
  input: {
    name: string;
    description?: string;
    workflowId?: string;
    webhookUrl?: string;
    cronExpression: string;
    payload?: Record<string, unknown>;
  }
) {
  const nextRunAt = nextCronDate(input.cronExpression);
  const ok = await repo.insertSchedule({
    tenantId,
    name: input.name,
    cronExpression: input.cronExpression,
    enabled: true,
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.workflowId !== undefined ? { workflowId: input.workflowId } : {}),
    ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
    ...(input.payload !== undefined ? { payload: input.payload } : {}),
    ...(nextRunAt ? { nextRunAt } : {}),
  });
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function updateSchedule(
  tenantId: number,
  input: {
    id: number;
    name?: string;
    description?: string;
    webhookUrl?: string;
    cronExpression?: string;
    payload?: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  const { id, ...updates } = input;
  const nextRunAt = updates.cronExpression
    ? nextCronDate(updates.cronExpression)
    : undefined;
  const ok = await repo.updateSchedule(id, tenantId, {
    ...updates,
    ...(nextRunAt ? { nextRunAt } : {}),
    updatedAt: new Date(),
  });
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function deleteSchedule(tenantId: number, id: number) {
  const ok = await repo.deleteSchedule(id, tenantId);
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function triggerSchedule(tenantId: number, id: number) {
  const { db, schedule } = await repo.getSchedule(id, tenantId);
  if (!db) throw dbUnavailable();
  if (!schedule)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Schedule not found",
    });
  if (!schedule.webhookUrl)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No webhook URL configured",
    });

  let status: "success" | "failed" = "failed";
  let lastError: string | null = null;

  try {
    const res = await fetch(schedule.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(schedule.payload ?? {}),
        _trigger: "manual",
        _schedule: schedule.name,
        _triggeredAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });
    status = res.ok ? "success" : "failed";
    if (!res.ok) lastError = `HTTP ${res.status}`;
  } catch (err) {
    lastError = String(err);
  }

  await repo.recordScheduleRun(id, {
    lastRunAt: new Date(),
    lastRunStatus: status,
    lastRunError: lastError,
    triggerCount: (schedule.triggerCount ?? 0) + 1,
    updatedAt: new Date(),
  });

  return { success: status === "success", status, error: lastError };
}

// ── Deep Link Attributions ────────────────────────────────────────────────────

export async function trackDeepLink(
  input: {
    userId?: number;
    email?: string;
    source: string;
    medium?: string;
    campaign?: string;
    deepLinkPath?: string;
    referralCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  },
  meta: { ipAddress?: string; userAgent?: string }
) {
  const ok = await repo.insertDeepLink({
    ...input,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return { success: ok };
}

export async function markDeepLinkConverted(id: number) {
  const ok = await repo.markDeepLinkConverted(id);
  return { success: ok };
}

export async function getAttributionStats(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await repo.listDeepLinksSince(since);
  if (rows === null)
    return { total: 0, converted: 0, conversionRate: 0, bySource: [] };

  const total = rows.length;
  const converted = rows.filter(r => r.converted).length;
  const conversionRate =
    total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;

  // Group by source
  const sourceMap: Record<string, { total: number; converted: number }> = {};
  for (const r of rows) {
    const src = r.source ?? "unknown";
    if (!sourceMap[src]) sourceMap[src] = { total: 0, converted: 0 };
    sourceMap[src].total++;
    if (r.converted) sourceMap[src].converted++;
  }
  const bySource = Object.entries(sourceMap)
    .map(([source, stats]) => ({
      source,
      ...stats,
      rate:
        stats.total > 0
          ? Math.round((stats.converted / stats.total) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { total, converted, conversionRate, bySource };
}

export async function listAttributions(limit: number, offset: number) {
  const result = await repo.listDeepLinks(limit, offset);
  if (result === null) return { rows: [], total: 0 };
  return result;
}

// ── CAPI Event Log ────────────────────────────────────────────────────────────

export async function listCapiEvents(
  userId: number,
  limit: number,
  offset: number
) {
  const result = await repo.listCapiEvents(userId, limit, offset);
  if (result === null) return { events: [], total: 0 };
  return result;
}

export async function getCapiSummary(userId: number) {
  const events = await repo.listCapiEventNames(userId);
  if (events === null) return { total: 0, byEvent: [] };
  const eventMap: Record<string, number> = {};
  for (const e of events) {
    eventMap[e.eventName] = (eventMap[e.eventName] ?? 0) + 1;
  }
  const byEvent = Object.entries(eventMap)
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((a, b) => b.count - a.count);
  return { total: events.length, byEvent };
}

// ── Mobile Push Schedules ──────────────────────────────────────────────────────

export async function listPushSchedules(tenantId: number) {
  const rows = await repo.listPushSchedules(tenantId);
  if (rows === null) return [];
  return rows;
}

export async function createPushSchedule(
  tenantId: number,
  input: {
    title: string;
    body: string;
    targetAudience:
      | "all"
      | "active_users"
      | "inactive_users"
      | "new_users"
      | "custom";
    scheduledAt?: string;
    cronExpression?: string;
    recurring: boolean;
    deepLinkPath?: string;
    imageUrl?: string;
  }
) {
  const status = input.recurring
    ? ("recurring" as const)
    : input.scheduledAt
      ? ("scheduled" as const)
      : ("draft" as const);
  const ok = await repo.insertPushSchedule({
    tenantId,
    title: input.title,
    body: input.body,
    targetAudience: input.targetAudience,
    ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
    ...(input.cronExpression ? { cronExpression: input.cronExpression } : {}),
    recurring: input.recurring,
    ...(input.deepLinkPath ? { deepLinkPath: input.deepLinkPath } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    status,
    enabled: true,
  });
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function updatePushSchedule(
  tenantId: number,
  input: {
    id: number;
    title?: string;
    body?: string;
    targetAudience?:
      | "all"
      | "active_users"
      | "inactive_users"
      | "new_users"
      | "custom";
    scheduledAt?: string;
    cronExpression?: string;
    recurring?: boolean;
    deepLinkPath?: string;
    enabled?: boolean;
  }
) {
  const { id, scheduledAt, ...updates } = input;
  const ok = await repo.updatePushSchedule(id, tenantId, {
    ...updates,
    ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    updatedAt: new Date(),
  });
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function deletePushSchedule(tenantId: number, id: number) {
  const ok = await repo.deletePushSchedule(id, tenantId);
  if (!ok) throw dbUnavailable();
  return { success: true };
}

export async function sendPushNow(tenantId: number, id: number) {
  const { db, schedule } = await repo.getPushSchedule(id, tenantId);
  if (!db) throw dbUnavailable();
  if (!schedule)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Push schedule not found",
    });

  // In production this would call FCM/APNs. For now, mark as sent.
  await repo.recordPushSent(id, {
    lastSentAt: new Date(),
    sentCount: (schedule.sentCount ?? 0) + 1,
    status: "sent",
    updatedAt: new Date(),
  });

  return { success: true, sentCount: (schedule.sentCount ?? 0) + 1 };
}
