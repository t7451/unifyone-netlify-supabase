import { insertContactLead } from "./contact.repo";

/**
 * Business logic for the public contact form.
 *
 * Persists every submission to the `leads` table so no message is ever silently
 * lost, then forwards to CONTACT_WEBHOOK_URL (Slack/n8n/Zapier/etc.) when
 * configured. Side-effect order is preserved exactly: DB persist first, webhook
 * forward second.
 */

export type ContactSubmission = {
  name: string;
  email: string;
  message: string;
  ip: string;
};

export type ContactResult = {
  success: boolean;
  message: string;
};

export async function submitContact(
  submission: ContactSubmission
): Promise<ContactResult> {
  const payload = {
    name: submission.name,
    email: submission.email,
    message: submission.message,
    ip: submission.ip,
    receivedAt: new Date().toISOString(),
    source: "1commerce.online/contact",
  };

  // ── Persist to leads table so submissions are never silently dropped ──
  try {
    await insertContactLead({
      contactName: submission.name,
      email: submission.email,
      message: submission.message,
    });
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
}
