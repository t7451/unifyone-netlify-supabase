import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers } from "../../drizzle/schema";
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

export const customersRouter = router({
  /** List customers for the user's tenant. */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().positive().max(500).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const where = input?.search
        ? and(
            eq(customers.tenantId, tenantId),
            sql`(${customers.email} ILIKE ${"%" + input.search + "%"} OR ${customers.firstName} ILIKE ${"%" + input.search + "%"} OR ${customers.lastName} ILIKE ${"%" + input.search + "%"})`
          )
        : eq(customers.tenantId, tenantId);

      const rows = await db
        .select()
        .from(customers)
        .where(where)
        .orderBy(desc(customers.createdAt))
        .limit(input?.limit ?? 100);
      return rows;
    }),

  /** Manually create a new customer. Audit-finding deliverable.
   *  Idempotent on (tenantId, email) — re-creating the same email returns
   *  the existing row instead of erroring. */
  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase(),
        firstName: z.string().max(255).optional(),
        lastName: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        notes: z.string().max(2000).optional(),
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

      // Already-exists path: return the existing row, don't error. Manual
      // create from the UI behaves identically to the upsertCustomer code
      // path that orders.create uses.
      const existing = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenantId),
            eq(customers.email, input.email)
          )
        )
        .limit(1);

      if (existing[0]) {
        // Update with any newly-supplied fields
        const update: Record<string, unknown> = { updatedAt: new Date() };
        if (input.firstName !== undefined) update.firstName = input.firstName;
        if (input.lastName !== undefined) update.lastName = input.lastName;
        if (input.phone !== undefined) update.phone = input.phone;
        if (input.notes !== undefined) update.notes = input.notes;
        await db
          .update(customers)
          .set(update)
          .where(eq(customers.id, existing[0].id));
        return { ...existing[0], ...update, alreadyExisted: true as const };
      }

      const inserted = await db
        .insert(customers)
        .values({
          tenantId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          notes: input.notes,
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        tenantId,
        action: "customer.create",
        resource: "customer",
        resourceId: String(inserted[0]?.id ?? ""),
        severity: "low",
        metadata: { email: input.email },
      }).catch(() => {});

      return { ...inserted[0], alreadyExisted: false as const };
    }),

  /** Update a customer. Tenant-scoped. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().max(255).optional(),
        lastName: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        notes: z.string().max(2000).optional(),
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
      if (input.firstName !== undefined) update.firstName = input.firstName;
      if (input.lastName !== undefined) update.lastName = input.lastName;
      if (input.phone !== undefined) update.phone = input.phone;
      if (input.notes !== undefined) update.notes = input.notes;

      await db
        .update(customers)
        .set(update)
        .where(
          and(eq(customers.id, input.id), eq(customers.tenantId, tenantId))
        );
      return { success: true };
    }),
});
