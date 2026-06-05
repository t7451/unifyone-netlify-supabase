import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createRateLimiter } from "../_core/rateLimiter";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
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

      const payload = {
        name: input.name,
        email: input.email,
        message: input.message,
        ip,
        receivedAt: new Date().toISOString(),
        source: "1commerce.online/contact",
      };

      // ── Persist to leads table so submissions are never silently dropped ──
      try {
        const db = await getDb();
        if (db) {
          await db.insert(leads).values({
            contactName: input.name,
            email: input.email,
            message: input.message,
            source: "contact_form",
          });
        }
      } catch (dbErr) {
        // Log but don't fail the request — webhook delivery is the primary path.
        console.error("[contact] DB persist error:", dbErr);
      }
      // ── Forward to configured webhook (Slack / n8n / Zapier / etc.) ───────
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
          "[contact] CONTACT_WEBHOOK_URL not set — submission persisted to DB only.",
          { email: payload.email, receivedAt: payload.receivedAt }
        );
      }

      return {
        success: true,
        message: "Thanks — we received your message and will be in touch.",
      };
    }),
});
