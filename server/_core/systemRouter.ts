import { z } from "zod";
import { count } from "drizzle-orm";
import { getDb } from "../db";
import { orders, tenants } from "../../drizzle/schema";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  launchStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        tenants: 0,
        ordersProcessed: 0,
        integrations: 10,
      } as const;
    }

    const [tenantStats] = await db
      .select({ total: count(tenants.id) })
      .from(tenants);
    const [orderStats] = await db
      .select({ total: count(orders.id) })
      .from(orders);

    return {
      tenants: Number(tenantStats?.total ?? 0),
      ordersProcessed: Number(orderStats?.total ?? 0),
      integrations: 10,
    } as const;
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
