/**
 * Cloudflare Turnstile server-side verification.
 *
 * Verification is skipped entirely when TURNSTILE_SECRET_KEY is unset, so
 * local dev and deployments that haven't configured Turnstile keep working
 * unmodified — the client-side widget also only renders when
 * VITE_TURNSTILE_SITE_KEY is set, so an unconfigured deployment never
 * produces a token to send in the first place.
 *
 * Once TURNSTILE_SECRET_KEY is set, a missing/invalid/expired token fails
 * closed (matches this codebase's posture for other signature/token
 * verification, e.g. webhook signatures).
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

export type TurnstileVerifyResult =
  | { success: true }
  | { success: false; error: string };

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return { success: true };

  if (!token) {
    return {
      success: false,
      error: "Please complete the verification challenge and try again.",
    };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
    };
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: "Verification failed. Please try again.",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("[turnstile] Verification request failed:", err);
    return {
      success: false,
      error: "Verification is temporarily unavailable. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
