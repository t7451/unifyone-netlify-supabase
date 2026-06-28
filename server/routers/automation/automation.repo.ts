import { getDb } from "../../db";
import {
  n8nWorkflows,
  zapierHooks,
  mailchimpConfig,
} from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Data access for automation integrations (n8n workflows, Zapier hooks,
 * Mailchimp config). Wraps the shared `getDb()` helper; queries are relocated
 * verbatim from the original router.
 */

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

// ── n8n Workflows ─────────────────────────────────────────────────────────────

export async function listN8nWorkflows(tenantId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(n8nWorkflows)
    .where(eq(n8nWorkflows.tenantId, tenantId))
    .orderBy(desc(n8nWorkflows.createdAt));
}

export async function insertN8nWorkflow(values: {
  name: string;
  description?: string;
  triggerEvent: string;
  webhookUrl: string;
  enabled: boolean;
  tenantId: number;
}) {
  const db = await requireDb();
  await db.insert(n8nWorkflows).values(values);
}

export async function updateN8nWorkflow(
  id: number,
  tenantId: number,
  data: {
    name?: string;
    description?: string;
    triggerEvent?: string;
    webhookUrl?: string;
    enabled?: boolean;
  }
) {
  const db = await requireDb();
  await db
    .update(n8nWorkflows)
    .set(data)
    .where(and(eq(n8nWorkflows.id, id), eq(n8nWorkflows.tenantId, tenantId)));
}

export async function deleteN8nWorkflow(id: number, tenantId: number) {
  const db = await requireDb();
  await db
    .delete(n8nWorkflows)
    .where(and(eq(n8nWorkflows.id, id), eq(n8nWorkflows.tenantId, tenantId)));
}

export async function getN8nWorkflow(id: number, tenantId: number) {
  const db = await requireDb();
  const [wf] = await db
    .select()
    .from(n8nWorkflows)
    .where(and(eq(n8nWorkflows.id, id), eq(n8nWorkflows.tenantId, tenantId)));
  return wf;
}

export async function markN8nWorkflowTriggered(
  id: number,
  triggerCount: number
) {
  const db = await requireDb();
  await db
    .update(n8nWorkflows)
    .set({ lastTriggeredAt: new Date(), triggerCount, lastError: null })
    .where(eq(n8nWorkflows.id, id));
}

export async function markN8nWorkflowError(id: number, lastError: string) {
  const db = await requireDb();
  await db
    .update(n8nWorkflows)
    .set({ lastError })
    .where(eq(n8nWorkflows.id, id));
}

// ── Zapier Hooks ──────────────────────────────────────────────────────────────

export async function listZapierHooks(tenantId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(zapierHooks)
    .where(eq(zapierHooks.tenantId, tenantId))
    .orderBy(desc(zapierHooks.createdAt));
}

export async function insertZapierHook(values: {
  name: string;
  triggerEvent: string;
  webhookUrl: string;
  enabled: boolean;
  tenantId: number;
}) {
  const db = await requireDb();
  await db.insert(zapierHooks).values(values);
}

export async function updateZapierHook(
  id: number,
  tenantId: number,
  data: {
    name?: string;
    triggerEvent?: string;
    webhookUrl?: string;
    enabled?: boolean;
  }
) {
  const db = await requireDb();
  await db
    .update(zapierHooks)
    .set(data)
    .where(and(eq(zapierHooks.id, id), eq(zapierHooks.tenantId, tenantId)));
}

export async function deleteZapierHook(id: number, tenantId: number) {
  const db = await requireDb();
  await db
    .delete(zapierHooks)
    .where(and(eq(zapierHooks.id, id), eq(zapierHooks.tenantId, tenantId)));
}

// ── Mailchimp Config ──────────────────────────────────────────────────────────

export async function getMailchimpConfig(tenantId: number) {
  const db = await requireDb();
  const [config] = await db
    .select()
    .from(mailchimpConfig)
    .where(eq(mailchimpConfig.tenantId, tenantId));
  return config;
}

export async function getMailchimpConfigId(tenantId: number) {
  const db = await requireDb();
  const [existing] = await db
    .select({ id: mailchimpConfig.id })
    .from(mailchimpConfig)
    .where(eq(mailchimpConfig.tenantId, tenantId));
  return existing;
}

export async function updateMailchimpConfig(
  tenantId: number,
  values: {
    apiKey: string;
    serverPrefix: string;
    listId: string;
    tagPrefix?: string;
    enabled: boolean;
  }
) {
  const db = await requireDb();
  await db
    .update(mailchimpConfig)
    .set({ ...values })
    .where(eq(mailchimpConfig.tenantId, tenantId));
}

export async function insertMailchimpConfig(values: {
  apiKey: string;
  serverPrefix: string;
  listId: string;
  tagPrefix?: string;
  enabled: boolean;
  tenantId: number;
}) {
  const db = await requireDb();
  await db.insert(mailchimpConfig).values(values);
}
