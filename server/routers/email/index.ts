import { z } from "zod";
import {
  publicProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import {
  captureSubscriber,
  findSubscriberByEmail,
  unsubscribe,
} from "./email.service";

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
    .mutation(async ({ input }) => captureSubscriber(input)),

  /**
   * Get subscriber by email (for testing/admin purposes)
   */
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => findSubscriberByEmail(input.email)),

  /**
   * Unsubscribe an email
   */
  unsubscribe: publicRateLimitedProcedure(publicFormLimiter, "email:unsub")
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => unsubscribe(input.email)),
});
