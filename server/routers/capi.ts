import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { metaCapiEvents } from "../../drizzle/schema";
import { sendCAPIEvent, type CAPIUserData } from "../meta/capi";
import { desc } from "drizzle-orm";

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

async function saveCapiEvent(opts: {
  tenantId: number | null;
  userId: number | null;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData?: CAPIUserData;
  customData?: Record<string, unknown>;
  responseCode?: number;
  responseBody?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(metaCapiEvents).values({
      tenantId: opts.tenantId,
      userId: opts.userId,
      eventName: opts.eventName,
      eventId: opts.eventId,
      eventSourceUrl: opts.eventSourceUrl,
      userData: opts.userData as Record<string, unknown> | undefined,
      customData: opts.customData,
      responseCode: opts.responseCode,
      responseBody: opts.responseBody,
    });
  } catch (err) {
    console.error("[CAPI] Failed to save event record:", err);
  }
}

export const capiRouter = router({
  fireLead: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        contentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventId = crypto.randomUUID();
      try {
        const result = await sendCAPIEvent({
          eventName: "Lead",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData: input.contentName
            ? { content_name: input.contentName }
            : undefined,
        });
        void saveCapiEvent({
          tenantId: ctx.user.tenantId ?? null,
          userId: ctx.user.id,
          eventName: "Lead",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData: input.contentName
            ? { content_name: input.contentName }
            : undefined,
          responseCode: result.events_received,
          responseBody: JSON.stringify(result),
        });
        return { success: true, eventId };
      } catch (err) {
        console.error("[CAPI] fireLead error:", err);
        return { success: false, eventId };
      }
    }),

  firePurchase: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        value: z.number(),
        currency: z.string().default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventId = crypto.randomUUID();
      try {
        const customData = { value: input.value, currency: input.currency };
        const result = await sendCAPIEvent({
          eventName: "Purchase",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData,
        });
        void saveCapiEvent({
          tenantId: ctx.user.tenantId ?? null,
          userId: ctx.user.id,
          eventName: "Purchase",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData,
          responseCode: result.events_received,
          responseBody: JSON.stringify(result),
        });
        return { success: true, eventId };
      } catch (err) {
        console.error("[CAPI] firePurchase error:", err);
        return { success: false, eventId };
      }
    }),

  fireCompleteRegistration: protectedProcedure
    .input(
      z.object({
        eventSourceUrl: z.string(),
        userData: userDataSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventId = crypto.randomUUID();
      try {
        const customData = { status: "registered" };
        const result = await sendCAPIEvent({
          eventName: "CompleteRegistration",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData,
        });
        void saveCapiEvent({
          tenantId: ctx.user.tenantId ?? null,
          userId: ctx.user.id,
          eventName: "CompleteRegistration",
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData,
          responseCode: result.events_received,
          responseBody: JSON.stringify(result),
        });
        return { success: true, eventId };
      } catch (err) {
        console.error("[CAPI] fireCompleteRegistration error:", err);
        return { success: false, eventId };
      }
    }),

  fireCustomEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.string(),
        eventSourceUrl: z.string(),
        userData: userDataSchema,
        customData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventId = crypto.randomUUID();
      try {
        const result = await sendCAPIEvent({
          eventName: input.eventName,
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData: input.customData,
        });
        void saveCapiEvent({
          tenantId: ctx.user.tenantId ?? null,
          userId: ctx.user.id,
          eventName: input.eventName,
          eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData: input.userData,
          customData: input.customData,
          responseCode: result.events_received,
          responseBody: JSON.stringify(result),
        });
        return { success: true, eventId };
      } catch (err) {
        console.error("[CAPI] fireCustomEvent error:", err);
        return { success: false, eventId };
      }
    }),

  listEvents: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(metaCapiEvents)
      .orderBy(desc(metaCapiEvents.sentAt))
      .limit(100);
  }),
});
