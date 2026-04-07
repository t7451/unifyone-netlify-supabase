/**
 * flush-user-overages-background.mts
 *
 * Background Function — fires after a credit metering event to flush
 * any queued overages for that user to Stripe as invoice items.
 *
 * Called by: server/creditMeter.ts after meterCredits() detects overage
 * Method:    POST /api/flush-overages   (body: { userId: string })
 * Returns:   202 immediately (background — response body is ignored)
 *
 * 15-minute wall-clock timeout — more than enough for Stripe API calls.
 */
import type { Context } from "@netlify/functions";
import { flushUserOverages } from "../../server/creditMeter";

export default async (req: Request, _context: Context) => {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId as string | undefined;

    if (!userId) {
      console.warn("[flush-user-overages] No userId in request body — skipping");
      return;
    }

    console.log(`[flush-user-overages] Flushing overages for user ${userId}`);
    await flushUserOverages(userId);
    console.log(`[flush-user-overages] Done for user ${userId}`);
  } catch (err) {
    // Log but never throw — background functions should not retry on user errors
    console.error("[flush-user-overages] Error:", err);
  }
};

export const config = {
  path: "/api/flush-overages",
};
