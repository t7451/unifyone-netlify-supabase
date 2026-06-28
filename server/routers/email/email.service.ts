import { sendWelcomeEmail } from "../../_core/dripScheduler";
import {
  getSubscriberByEmail,
  insertSubscriber,
  unsubscribeByEmail,
  type CaptureSubscriberInput,
} from "./email.repo";

/**
 * Email capture and drip-sequence use-cases.
 *
 * Orchestrates subscriber persistence and the welcome-email side effect. The
 * side-effect order (insert → send welcome) is preserved exactly as in the
 * original router.
 */

export type CaptureResult =
  | { success: true; message: string; subscriberId: number | null }
  | {
      success: false;
      message: string;
      alreadySubscribed?: boolean;
      error?: string;
    };

/**
 * Capture an email subscriber: insert, dedupe, then send a welcome email.
 */
export async function captureSubscriber(
  input: CaptureSubscriberInput
): Promise<CaptureResult> {
  try {
    const insertedSubscriber = await insertSubscriber(input);

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
}

/** Look up a subscriber by email (admin/testing). */
export async function findSubscriberByEmail(email: string) {
  return getSubscriberByEmail(email);
}

/** Unsubscribe an email, swallowing errors into a standard response shape. */
export async function unsubscribe(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    await unsubscribeByEmail(email);
    return { success: true, message: "Unsubscribed successfully" };
  } catch (error) {
    console.error("[Email] Unsubscribe error:", error);
    return { success: false, message: "Failed to unsubscribe" };
  }
}
