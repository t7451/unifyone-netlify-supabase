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
  /** Client IP address — included in metadata for security/forensic correlation. */
  ip?: string;
  /** User-Agent string — included in metadata to help identify automated attacks. */
  userAgent?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Merge ip/userAgent into metadata so they surface in the governance UI
    // without requiring a schema change. Use underscore-prefixed keys so they
    // sort to the top and are easy to spot in logs.
    const mergedMeta: Record<string, unknown> = { ...(opts.metadata ?? {}) };
    if (opts.ip) mergedMeta._ip = opts.ip;
    if (opts.userAgent) mergedMeta._userAgent = opts.userAgent;

    await db.insert(auditLogs).values({
      userId: opts.userId ?? null,
      action: opts.action,
      entityType: opts.resource,
      entityId: opts.resourceId
        ? parseInt(opts.resourceId, 10) || undefined
        : undefined,
      newValue: Object.keys(mergedMeta).length > 0 ? mergedMeta : null,
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
