/**
 * server/lib/automationDispatch.ts
 *
 * Shared dispatcher for the automation event surface advertised in
 * `server/routers/automation.ts`. Procedures elsewhere in the codebase
 * call `fireAutomations(tenantId, event, payload)` and the dispatcher
 * fans out to:
 *   - all enabled n8n workflows for that tenant whose `triggerEvent`
 *     matches `event` (or `"*"` catch-all),
 *   - all enabled Zapier hooks matching the same.
 *
 * Failures are isolated per integration and never blocking — the caller
 * should treat the return value as best-effort observability rather than
 * a delivery guarantee.
 *
 * Tenant safety: a `null` tenantId short-circuits the dispatcher to
 * prevent cross-tenant broadcast.
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { n8nWorkflows, zapierHooks } from "../../drizzle/schema";

export interface AutomationDispatchResult {
  n8n: boolean;
  zapier: boolean;
}

export async function fireAutomations(
  tenantId: number | null,
  event: string,
  payload: Record<string, unknown>
): Promise<AutomationDispatchResult> {
  if (tenantId === null) {
    console.warn(
      "[fireAutomations] tenantId is null — skipping automations to prevent cross-tenant broadcast"
    );
    return { n8n: false, zapier: false };
  }

  const db = await getDb();
  if (!db) return { n8n: false, zapier: false };

  const results: AutomationDispatchResult = { n8n: false, zapier: false };

  try {
    const workflows = await db
      .select()
      .from(n8nWorkflows)
      .where(
        and(eq(n8nWorkflows.enabled, true), eq(n8nWorkflows.tenantId, tenantId))
      );

    for (const wf of workflows) {
      if (wf.triggerEvent === event || wf.triggerEvent === "*") {
        try {
          await fetch(wf.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, ...payload, _workflow: wf.name }),
            signal: AbortSignal.timeout(5000),
          });
          await db
            .update(n8nWorkflows)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: (wf.triggerCount ?? 0) + 1,
              lastError: null,
            })
            .where(eq(n8nWorkflows.id, wf.id));
          results.n8n = true;
        } catch (err) {
          await db
            .update(n8nWorkflows)
            .set({ lastError: String(err) })
            .where(eq(n8nWorkflows.id, wf.id));
        }
      }
    }

    const hooks = await db
      .select()
      .from(zapierHooks)
      .where(
        and(eq(zapierHooks.enabled, true), eq(zapierHooks.tenantId, tenantId))
      );

    for (const hook of hooks) {
      if (hook.triggerEvent === event || hook.triggerEvent === "*") {
        try {
          await fetch(hook.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, ...payload, _hook: hook.name }),
            signal: AbortSignal.timeout(5000),
          });
          await db
            .update(zapierHooks)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: (hook.triggerCount ?? 0) + 1,
            })
            .where(eq(zapierHooks.id, hook.id));
          results.zapier = true;
        } catch {
          // Zapier hooks are best-effort
        }
      }
    }
  } catch {
    // Automation failures are non-blocking
  }

  return results;
}
