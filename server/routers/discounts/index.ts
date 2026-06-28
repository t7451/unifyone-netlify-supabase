import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { discountsService } from "./discounts.service";

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
    return discountsService.list(tenantId);
  }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return discountsService.create(tenantId, ctx.user.id, input);
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
      return discountsService.update(tenantId, input);
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return discountsService.toggleActive(tenantId, input.id, input.isActive);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return discountsService.delete(tenantId, ctx.user.id, input.id);
    }),

  resolveCode: protectedProcedure
    .input(z.object({ code: codeSchema }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return discountsService.resolveCode(tenantId, input.code);
    }),
});
