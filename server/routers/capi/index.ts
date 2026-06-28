import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../../_core/trpc";
import {
  fireCompleteRegistration,
  fireCustomEvent,
  fireLead,
  firePurchase,
  listEvents,
} from "./capi.service";

const userDataSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    externalId: z.string().optional(),
    clientIp: z.string().optional(),
    userAgent: z.string().optional(),
    fbp: z.string().optional(),
    fbc: z.string().optional(),
  })
  .optional();

export const capiRouter = router({
  fireLead: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        contentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      fireLead({ tenantId: ctx.user.tenantId ?? null, id: ctx.user.id }, input)
    ),

  firePurchase: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        value: z.number(),
        currency: z.string().default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) =>
      firePurchase(
        { tenantId: ctx.user.tenantId ?? null, id: ctx.user.id },
        input
      )
    ),

  fireCompleteRegistration: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
      })
    )
    .mutation(async ({ ctx, input }) =>
      fireCompleteRegistration(
        { tenantId: ctx.user.tenantId ?? null, id: ctx.user.id },
        input
      )
    ),

  fireCustomEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.string(),
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        customData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      fireCustomEvent(
        { tenantId: ctx.user.tenantId ?? null, id: ctx.user.id },
        input
      )
    ),

  listEvents: adminProcedure.query(async () => listEvents()),
});
