import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

/**
 * Public contact form router.
 *
 * Forwards submissions to CONTACT_WEBHOOK_URL (Slack/n8n/Zapier/etc.)
 * if configured. Falls back to logging the submission server-side so
 * it isn't lost when the webhook env var is missing.
 *
 * Lightweight in-memory IP rate limit (5/min) to deter form spam.
 * For production scale, replace with a Redis-backed limiter.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(
    t => now - t < RATE_LIMIT_WINDOW_MS
  );
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

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

      if (isRateLimited(ip)) {
        return {
          success: false,
          message: "Too many submissions. Please try again in a minute.",
        };
      }

      // Honeypot triggered — silently succeed.
      if (input.company) {
        return { success: true, message: "Thanks — we'll be in touch." };
      }

      const payload = {
        name: input.name,
        email: input.email,
        message: input.message,
        ip,
        receivedAt: new Date().toISOString(),
        source: "1commerce.online/contact",
      };

      const webhook = process.env.CONTACT_WEBHOOK_URL;
      if (webhook) {
        try {
          const res = await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            console.error("[contact] webhook returned", res.status);
          }
        } catch (err) {
          console.error("[contact] webhook error:", err);
        }
      } else {
        console.warn(
          "[contact] CONTACT_WEBHOOK_URL not set — submission logged only:",
          payload
        );
      }

      return {
        success: true,
        message: "Thanks — we received your message and will be in touch.",
      };
    }),
});
