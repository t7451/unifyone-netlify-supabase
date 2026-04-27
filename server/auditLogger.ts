import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";

export async function logAudit(opts: {
  userId?: number;
  tenantId?: number;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  severity?: "low" | "medium" | "high" | "critical";
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: opts.userId ?? null,
      action: opts.action,
      entityType: opts.resource,
      entityId: opts.resourceId
        ? parseInt(opts.resourceId, 10) || undefined
        : undefined,
      newValue: opts.metadata ?? null,
      decisionAuthority: opts.severity ?? "low",
      escalationTriggered: opts.severity === "critical",
      escalationReason:
        opts.severity === "critical"
          ? `Critical action: ${opts.action}`
          : undefined,
    });
  } catch {
    // fire-and-forget — swallow errors silently
  }
}
