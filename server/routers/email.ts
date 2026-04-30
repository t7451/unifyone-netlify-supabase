import { z } from "zod";
import {
  publicProcedure,
  publicRateLimitedProcedure,
  router,
} from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { getDb } from "../db";
import { emailSubscribers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "../_core/dripScheduler";

/**
 * Email capture and drip sequence router
 *
 * Handles:
 * - Email subscription capture from landing page
 * - Duplicate email detection
 * - Drip sequence scheduling
 */

export const emailRouter = router({
  /**
   * Capture an email from the landing page
   *
   * - Validates email format
   * - Checks for duplicates
   * - Inserts subscriber record
   * - Schedules welcome email via Resend
   * - Returns success/error response
   */
  capture: publicRateLimitedProcedure(publicFormLimiter, "email:capture")
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        source: z
          .enum(["landing_page", "blog", "referral", "other"])
          .default("landing_page"),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const [insertedSubscriber] = await db
          .insert(emailSubscribers)
          .values({
            email: input.email,
            firstName: input.firstName || undefined,
            lastName: input.lastName || undefined,
            source: input.source,
            metadata: input.metadata || undefined,
            status: "subscribed",
            dripsCompleted: 0,
          })
          .onConflictDoNothing({ target: emailSubscribers.email })
          .returning({ id: emailSubscribers.id });

        if (!insertedSubscriber) {
          return {
            success: false,
            message: "Email already subscribed",
            alreadySubscribed: true,
          };
        }

        // Send welcome email immediately
        await sendWelcomeEmail(input.email);

        return {
          success: true,
          message:
            "Successfully subscribed! Check your email for a welcome message.",
          subscriberId: insertedSubscriber?.id ?? null,
        };
      } catch (error) {
        console.error("[Email] Capture error:", error);
        return {
          success: false,
          message: "An error occurred. Please try again.",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Get subscriber by email (for testing/admin purposes)
   */
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const subscriber = await db
        .select()
        .from(emailSubscribers)
        .where(eq(emailSubscribers.email, input.email))
        .limit(1);

      return subscriber[0] || null;
    }),

  /**
   * Unsubscribe an email
   */
  unsubscribe: publicRateLimitedProcedure(publicFormLimiter, "email:unsub")
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db
          .update(emailSubscribers)
          .set({ status: "unsubscribed" })
          .where(eq(emailSubscribers.email, input.email));

        return { success: true, message: "Unsubscribed successfully" };
      } catch (error) {
        console.error("[Email] Unsubscribe error:", error);
        return { success: false, message: "Failed to unsubscribe" };
      }
    }),
});
