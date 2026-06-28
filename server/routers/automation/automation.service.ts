import { TRPCError } from "@trpc/server";
import * as repo from "./automation.repo";

/**
 * Automation use-cases: CRUD for n8n workflows / Zapier hooks / Mailchimp config
 * plus the outbound webhook + Mailchimp ping side effects. The order of DB
 * writes and outbound calls is preserved exactly from the original router.
 */

// ── n8n Workflows ─────────────────────────────────────────────────────────────

export async function listN8nWorkflows(tenantId: number | null) {
  // Preserve original order: ensure DB is available (throws if not) before the
  // tenant short-circuit.
  await repo.requireDb();
  if (!tenantId) return [];
  return repo.listN8nWorkflows(tenantId);
}

export async function createN8nWorkflow(
  tenantId: number,
  input: {
    name: string;
    description?: string;
    triggerEvent: string;
    webhookUrl: string;
    enabled: boolean;
  }
) {
  await repo.insertN8nWorkflow({ ...input, tenantId });
  return { success: true };
}

export async function updateN8nWorkflow(
  tenantId: number,
  input: {
    id: number;
    name?: string;
    description?: string;
    triggerEvent?: string;
    webhookUrl?: string;
    enabled?: boolean;
  }
) {
  const { id, ...data } = input;
  await repo.updateN8nWorkflow(id, tenantId, data);
  return { success: true };
}

export async function deleteN8nWorkflow(tenantId: number, id: number) {
  await repo.deleteN8nWorkflow(id, tenantId);
  return { success: true };
}

export async function testN8nWorkflow(tenantId: number, id: number) {
  const wf = await repo.getN8nWorkflow(id, tenantId);
  if (!wf)
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });

  try {
    const resp = await fetch(wf.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: wf.triggerEvent,
        test: true,
        timestamp: new Date().toISOString(),
        source: "unifyone_test",
      }),
      signal: AbortSignal.timeout(8000),
    });
    await repo.markN8nWorkflowTriggered(wf.id, (wf.triggerCount ?? 0) + 1);
    return { success: true, status: resp.status };
  } catch (err) {
    await repo.markN8nWorkflowError(wf.id, String(err));
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Webhook failed: ${String(err)}`,
    });
  }
}

// ── Zapier Hooks ──────────────────────────────────────────────────────────────

export async function listZapierHooks(tenantId: number | null) {
  // Preserve original order: ensure DB is available (throws if not) before the
  // tenant short-circuit.
  await repo.requireDb();
  if (!tenantId) return [];
  return repo.listZapierHooks(tenantId);
}

export async function createZapierHook(
  tenantId: number,
  input: {
    name: string;
    triggerEvent: string;
    webhookUrl: string;
    enabled: boolean;
  }
) {
  await repo.insertZapierHook({ ...input, tenantId });
  return { success: true };
}

export async function updateZapierHook(
  tenantId: number,
  input: {
    id: number;
    name?: string;
    triggerEvent?: string;
    webhookUrl?: string;
    enabled?: boolean;
  }
) {
  const { id, ...data } = input;
  await repo.updateZapierHook(id, tenantId, data);
  return { success: true };
}

export async function deleteZapierHook(tenantId: number, id: number) {
  await repo.deleteZapierHook(id, tenantId);
  return { success: true };
}

// ── Mailchimp Config ──────────────────────────────────────────────────────────

export async function getMailchimpConfig(tenantId: number | null) {
  // Preserve original order: ensure DB is available (throws if not) before the
  // tenant short-circuit.
  await repo.requireDb();
  if (!tenantId) return null;
  const config = await repo.getMailchimpConfig(tenantId);
  // Mask API key for security
  if (config?.apiKey) {
    return { ...config, apiKey: `****${config.apiKey.slice(-4)}` };
  }
  return config ?? null;
}

export async function saveMailchimpConfig(
  tenantId: number,
  input: {
    apiKey: string;
    serverPrefix: string;
    listId: string;
    tagPrefix?: string;
    enabled: boolean;
  }
) {
  const existing = await repo.getMailchimpConfigId(tenantId);

  if (existing) {
    await repo.updateMailchimpConfig(tenantId, input);
  } else {
    await repo.insertMailchimpConfig({ ...input, tenantId });
  }
  return { success: true };
}

export async function testMailchimpConnection(tenantId: number | null) {
  // Preserve original order: ensure DB is available (throws INTERNAL_SERVER_ERROR
  // if not) before the tenant check, then load config.
  await repo.requireDb();
  if (!tenantId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant",
    });
  const config = await repo.getMailchimpConfig(tenantId);
  if (!config?.apiKey || !config.serverPrefix) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Mailchimp not configured",
    });
  }
  try {
    const resp = await fetch(
      `https://${config.serverPrefix}.api.mailchimp.com/3.0/ping`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `anystring:${config.apiKey}`
          ).toString("base64")}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = (await resp.json()) as { health_status?: string };
    return { success: resp.ok, status: data?.health_status ?? "unknown" };
  } catch (err) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Mailchimp ping failed: ${String(err)}`,
    });
  }
}
