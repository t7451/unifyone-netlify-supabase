import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { customersService } from "./customers.service";

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
          tenantId: z.number().optional(),
          search: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(25),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      if (input?.tenantId !== undefined && input.tenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant mismatch.",
        });
      }
      return customersService.list(tenantId, input);
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
      return customersService.create(tenantId, ctx.user.id, input);
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
      return customersService.update(tenantId, input);
    }),
});
