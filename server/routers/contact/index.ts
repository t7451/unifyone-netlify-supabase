import { z } from "zod";
import { publicProcedure, router } from "../../_core/trpc";
import { createRateLimiter } from "../../_core/rateLimiter";
import { submitContact } from "./contact.service";
/**
 * Public contact form router.
 *
 * Persists every submission to the `leads` table (source="contact_form") so
 * no message is ever silently lost. Also forwards to CONTACT_WEBHOOK_URL
 * (Slack/n8n/Zapier/etc.) when configured.
 *
 * Uses the shared createRateLimiter (Upstash Redis in production,
 * in-memory fallback for local dev) — 5 submissions per minute per IP.
 */

const contactLimiter = createRateLimiter({
  name: "contact",
  maxAttempts: 5,
  windowMs: 60_000,
});

export const contactRouter = router({
  send: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Name is required").max(120),
        email: z.string().trim().email("Valid email is required").max(254),
        message: z.string().trim().min(10, "Message is too short").max(5000),
        // Honeypot — real users leave this empty.
        company: z.string().max(0).optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ip = (
        ctx.req?.headers?.["x-forwarded-for"]?.toString().split(",")[0] ??
        ctx.req?.socket?.remoteAddress ??
        "unknown"
      ).trim();

      const result = await contactLimiter.check(ip);
      if (!result.allowed) {
        return {
          success: false,
          message: "Too many submissions. Please try again in a minute.",
        };
      }

      // Honeypot triggered — silently succeed.
      if (input.company) {
        return { success: true, message: "Thanks — we'll be in touch." };
      }

      return submitContact({
        name: input.name,
        email: input.email,
        message: input.message,
        ip,
      });
    }),
});
