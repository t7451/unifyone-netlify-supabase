import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { discounts } from "../../drizzle/schema";
import { logAudit } from "../auditLogger";

function requireTenant(tenantId: number | null | undefined): number {
  if (!tenantId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "User has no tenant.",
    });
  }
  return tenantId;
}

const codeSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, _, or -")
  .transform(s => s.toUpperCase());

const createInput = z.object({
  code: codeSchema,
  description: z.string().max(500).optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.union([z.string(), z.number()]).transform(v => String(v)),
  currency: z.string().length(3).optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const discountsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    return db
      .select()
      .from(discounts)
      .where(eq(discounts.tenantId, tenantId))
      .orderBy(desc(discounts.createdAt));
  }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

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
        const inserted = await db
          .insert(discounts)
          .values({
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
          })
          .returning();

        logAudit({
          userId: ctx.user.id,
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
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().max(500).optional(),
        value: z
          .union([z.string(), z.number()])
          .transform(v => String(v))
          .optional(),
        validFrom: z.string().datetime().optional().nullable(),
        validUntil: z.string().datetime().optional().nullable(),
        usageLimit: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (input.description !== undefined)
        update.description = input.description;
      if (input.value !== undefined) update.value = input.value;
      if (input.validFrom !== undefined)
        update.validFrom = input.validFrom ? new Date(input.validFrom) : null;
      if (input.validUntil !== undefined)
        update.validUntil = input.validUntil
          ? new Date(input.validUntil)
          : null;
      if (input.usageLimit !== undefined) update.usageLimit = input.usageLimit;
      if (input.isActive !== undefined) update.isActive = input.isActive;

      await db
        .update(discounts)
        .set(update)
        .where(
          and(eq(discounts.id, input.id), eq(discounts.tenantId, tenantId))
        );
      return { success: true };
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .update(discounts)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(
          and(eq(discounts.id, input.id), eq(discounts.tenantId, tenantId))
        );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db
        .delete(discounts)
        .where(
          and(eq(discounts.id, input.id), eq(discounts.tenantId, tenantId))
        );

      logAudit({
        userId: ctx.user.id,
        tenantId,
        action: "discount.delete",
        resource: "discount",
        resourceId: String(input.id),
        severity: "low",
      }).catch(() => {});

      return { success: true };
    }),

  resolveCode: protectedProcedure
    .input(z.object({ code: codeSchema }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(discounts)
        .where(
          and(
            eq(discounts.tenantId, tenantId),
            eq(discounts.code, input.code),
            eq(discounts.isActive, true)
          )
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;

      const now = new Date();
      if (row.validFrom && row.validFrom > now) return null;
      if (row.validUntil && row.validUntil < now) return null;
      if (row.usageLimit > 0 && row.usageCount >= row.usageLimit) return null;

      return row;
    }),
});
