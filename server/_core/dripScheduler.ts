import { Resend } from "resend";
import { getDb } from "../db";
import { emailSubscribers } from "../../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { emailTemplates } from "./emailTemplates";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function getMissingApiKeyError(scope: "Drip" | "Welcome") {
  return `${scope} email disabled: RESEND_API_KEY is not configured`;
}

/**
 * Drip sequence schedule
 *
 * Each entry: [dripNumber, hoursAfterSubscription, templateKey]
 * Example: [1, 0, "welcome"] = send drip #1 (welcome) immediately (0 hours)
 */
const DRIP_SCHEDULE = [
  [1, 0, "welcome"] as const,
  [2, 48, "platformOverview"] as const,
  [3, 96, "gettingStarted"] as const,
  [4, 168, "successStories"] as const,
  [5, 336, "limitedOffer"] as const,
];

/**
 * Send a single drip email
 *
 * Called by the scheduler job. Validates the subscriber, fetches the template,
 * sends via Resend, and updates the dripsCompleted counter.
 */
async function sendDripEmail(
  subscriberId: number,
  dripNumber: number,
  templateKey: keyof typeof emailTemplates
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      const error = getMissingApiKeyError("Drip");
      console.warn(`[Drip] ${error}`);
      return { success: false, error };
    }

    const db = await getDb();
    if (!db) return { success: false, error: "Database connection failed" };

    // Fetch subscriber
    const subscriber = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.id, subscriberId))
      .limit(1);

    if (!subscriber.length) {
      return { success: false, error: "Subscriber not found" };
    }

    const sub = subscriber[0];

    // Check if already sent (dripsCompleted >= dripNumber)
    if (sub.dripsCompleted >= dripNumber) {
      return { success: false, error: "Drip already sent" };
    }

    // Check if unsubscribed
    if (sub.status !== "subscribed") {
      return { success: false, error: "Subscriber unsubscribed" };
    }

    // Get template
    const template = emailTemplates[templateKey];
    if (!template) {
      return { success: false, error: `Template not found: ${templateKey}` };
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: "UnifyOne <hello@unifyonecommerce.com>",
      to: sub.email,
      subject: template.subject,
      html: template.html,
    });

    if (result.error) {
      console.error(
        `[Drip] Failed to send drip ${dripNumber} to ${sub.email}:`,
        result.error
      );
      return { success: false, error: result.error.message };
    }

    // Update dripsCompleted
    await db
      .update(emailSubscribers)
      .set({
        dripsCompleted: dripNumber,
        lastDripSentAt: new Date(),
      })
      .where(eq(emailSubscribers.id, subscriberId));

    console.log(
      `[Drip] Sent drip ${dripNumber} to ${sub.email} (ID: ${result.data?.id})`
    );
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Drip] Error sending drip ${dripNumber}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Process all pending drip emails
 *
 * Called by a cron job (e.g., every hour). Checks all subscribers and sends
 * any drips that are due based on their createdAt timestamp.
 */
export async function processPendingDrips(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Drip] Database connection failed");
      return { processed: 0, sent: 0, errors: 0 };
    }

    let sent = 0;
    let errors = 0;

    // For each drip in the schedule
    for (const [dripNumber, hoursAfter, templateKey] of DRIP_SCHEDULE) {
      // Calculate the cutoff time (now - hoursAfter)
      const cutoffTime = new Date(Date.now() - hoursAfter * 60 * 60 * 1000);

      // Find subscribers who:
      // 1. Have createdAt before the cutoff (enough time has passed)
      // 2. Have dripsCompleted < dripNumber (haven't received this drip yet)
      // 3. Are subscribed
      const dueSubscribers = await db
        .select()
        .from(emailSubscribers)
        .where(
          and(
            lt(emailSubscribers.createdAt, cutoffTime),
            lt(emailSubscribers.dripsCompleted, dripNumber),
            eq(emailSubscribers.status, "subscribed")
          )
        );

      // Send drip to each due subscriber
      for (const subscriber of dueSubscribers) {
        const result = await sendDripEmail(
          subscriber.id,
          dripNumber,
          templateKey
        );
        if (result.success) {
          sent++;
        } else {
          errors++;
        }
      }
    }

    console.log(`[Drip] Processed: sent ${sent}, errors ${errors}`);
    return { processed: DRIP_SCHEDULE.length, sent, errors };
  } catch (error) {
    console.error("[Drip] Fatal error in processPendingDrips:", error);
    return { processed: 0, sent: 0, errors: 1 };
  }
}

/**
 * Send welcome email immediately when subscriber is captured
 *
 * Called directly from the emailCapture mutation.
 */
export async function sendWelcomeEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      const error = getMissingApiKeyError("Welcome");
      console.warn(`[Welcome] ${error}`);
      return { success: false, error };
    }

    const template = emailTemplates.welcome;

    const result = await resend.emails.send({
      from: "UnifyOne <hello@unifyonecommerce.com>",
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.error) {
      console.error(`[Welcome] Failed to send to ${email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Welcome] Sent to ${email} (ID: ${result.data?.id})`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Welcome] Error:`, msg);
    return { success: false, error: msg };
  }
}
