import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as service from "./automation.service";

// Available trigger events for the UI selector
const TRIGGER_EVENTS = [
  { value: "lead.submitted", label: "New Lead Submitted" },
  { value: "lead.status.contacted", label: "Lead Marked Contacted" },
  { value: "lead.status.qualified", label: "Lead Qualified" },
  { value: "lead.status.converted", label: "Lead Converted" },
  { value: "lead.status.lost", label: "Lead Lost" },
  { value: "order.created", label: "New Order Created" },
  { value: "order.status.shipped", label: "Order Shipped" },
  { value: "order.status.delivered", label: "Order Delivered" },
  { value: "order.status.cancelled", label: "Order Cancelled" },
  { value: "payment.succeeded", label: "Payment Succeeded" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "subscription.activated", label: "Subscription Activated" },
  { value: "subscription.cancelled", label: "Subscription Cancelled" },
  { value: "social.post.published", label: "Social Post Published" },
  { value: "referral.converted", label: "Referral Converted" },
  { value: "*", label: "All Events (Catch-All)" },
];

export const automationRouter = router({
  // Get available trigger events
  getTriggerEvents: protectedProcedure.query(() => TRIGGER_EVENTS),

  // ── n8n Workflows ─────────────────────────────────────────────────────────────
  n8n: router({
    list: protectedProcedure.query(async ({ ctx }) =>
      service.listN8nWorkflows(ctx.user.tenantId)
    ),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          triggerEvent: z.string().min(1),
          webhookUrl: z.string().url(),
          enabled: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.createN8nWorkflow(tenantId, input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          triggerEvent: z.string().optional(),
          webhookUrl: z.string().url().optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.updateN8nWorkflow(tenantId, input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.deleteN8nWorkflow(tenantId, input.id);
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.testN8nWorkflow(tenantId, input.id);
      }),
  }),

  // ── Zapier Hooks ──────────────────────────────────────────────────────────────
  zapier: router({
    list: protectedProcedure.query(async ({ ctx }) =>
      service.listZapierHooks(ctx.user.tenantId)
    ),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          triggerEvent: z.string().min(1),
          webhookUrl: z.string().url(),
          enabled: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.createZapierHook(tenantId, input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          triggerEvent: z.string().optional(),
          webhookUrl: z.string().url().optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.updateZapierHook(tenantId, input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.deleteZapierHook(tenantId, input.id);
      }),
  }),

  // ── Mailchimp Config ──────────────────────────────────────────────────────────
  mailchimp: router({
    getConfig: protectedProcedure.query(async ({ ctx }) =>
      service.getMailchimpConfig(ctx.user.tenantId)
    ),

    saveConfig: protectedProcedure
      .input(
        z.object({
          apiKey: z.string().min(1),
          serverPrefix: z.string().min(1).max(10),
          listId: z.string().min(1),
          tagPrefix: z.string().optional(),
          enabled: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No active tenant",
          });
        return service.saveMailchimpConfig(tenantId, input);
      }),

    testConnection: protectedProcedure.mutation(async ({ ctx }) =>
      service.testMailchimpConnection(ctx.user.tenantId)
    ),
  }),
});
