import { TRPCError } from "@trpc/server";
import { logAudit } from "../../auditLogger";
import { discountsRepo } from "./discounts.repo";

function requireDb() {
  return discountsRepo.getDb();
}

async function requireDbOrThrow() {
  const db = await requireDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return db;
}

export const discountsService = {
  async list(tenantId: number) {
    const db = await requireDbOrThrow();
    return discountsRepo.listByTenant(db, tenantId);
  },

  async create(
    tenantId: number,
    userId: number,
    input: {
      code: string;
      description?: string;
      type: "percentage" | "fixed";
      value: string;
      currency?: string;
      validFrom?: string | null;
      validUntil?: string | null;
      usageLimit: number;
      isActive: boolean;
    }
  ) {
    const db = await requireDbOrThrow();

    const numeric = Number(input.value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "value must be a non-negative number.",
      });
    }
    if (input.type === "percentage" && numeric > 100) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "percentage value cannot exceed 100.",
      });
    }

    try {
      const inserted = await discountsRepo.insert(db, {
        tenantId,
        code: input.code,
        description: input.description,
        type: input.type,
        value: input.value,
        currency: input.currency ?? "USD",
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        usageLimit: input.usageLimit ?? 0,
        isActive: input.isActive,
      });

      logAudit({
        userId,
        tenantId,
        action: "discount.create",
        resource: "discount",
        resourceId: String(inserted[0]?.id ?? ""),
        severity: "low",
        metadata: { code: input.code, type: input.type, value: input.value },
      }).catch(() => {});

      return inserted[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("discounts_tenant_code_uniq")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Discount code '${input.code}' already exists for this tenant.`,
        });
      }
      throw err;
    }
  },

  async update(
    tenantId: number,
    input: {
      id: number;
      description?: string;
      value?: string;
      validFrom?: string | null;
      validUntil?: string | null;
      usageLimit?: number;
      isActive?: boolean;
    }
  ) {
    const db = await requireDbOrThrow();

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (input.description !== undefined) update.description = input.description;
    if (input.value !== undefined) update.value = input.value;
    if (input.validFrom !== undefined)
      update.validFrom = input.validFrom ? new Date(input.validFrom) : null;
    if (input.validUntil !== undefined)
      update.validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (input.usageLimit !== undefined) update.usageLimit = input.usageLimit;
    if (input.isActive !== undefined) update.isActive = input.isActive;

    await discountsRepo.update(db, input.id, tenantId, update);
    return { success: true };
  },

  async toggleActive(tenantId: number, id: number, isActive: boolean) {
    const db = await requireDbOrThrow();
    await discountsRepo.update(db, id, tenantId, {
      isActive,
      updatedAt: new Date(),
    });
    return { success: true };
  },

  async delete(tenantId: number, userId: number, id: number) {
    const db = await requireDbOrThrow();

    await discountsRepo.delete(db, id, tenantId);

    logAudit({
      userId,
      tenantId,
      action: "discount.delete",
      resource: "discount",
      resourceId: String(id),
      severity: "low",
    }).catch(() => {});

    return { success: true };
  },

  async resolveCode(tenantId: number, code: string) {
    const db = await requireDb();
    if (!db) return null;

    const rows = await discountsRepo.findActiveByCode(db, tenantId, code);
    const row = rows[0];
    if (!row) return null;

    const now = new Date();
    if (row.validFrom && row.validFrom > now) return null;
    if (row.validUntil && row.validUntil < now) return null;
    if (row.usageLimit > 0 && row.usageCount >= row.usageLimit) return null;

    return row;
  },
};
