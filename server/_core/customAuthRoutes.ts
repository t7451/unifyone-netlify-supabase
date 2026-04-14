/**
 * Custom Auth Fetch Routes
 *
 * POST /api/auth/signup     - Create account with email/password
 * POST /api/auth/signin     - Sign in with email/password
 * POST /api/auth/logout     - Clear session cookie
 * POST /api/auth/clerk      - Verify Clerk session token (fallback)
 * POST /api/auth/firebase   - Verify Firebase ID token (fallback)
 */

import {
  signUp,
  signIn,
  verifyClerkSession,
  verifyFirebaseIdToken,
  buildSessionCookie,
  buildLogoutCookie,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmailToken,
} from "./customAuth";
import { authRateLimiter, passwordResetLimiter } from "./rateLimiter";
import { ENV, getAppUrl } from "./env";
import { getDb } from "../db";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function getClientIp(req: Request): string {
  // Standard forwarded-for header (Netlify / proxies set this)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/**
 * Build a safe CORS origin value.
 *
 * Rules:
 *  - Never return "*" when credentials are involved (browsers block it anyway,
 *    but returning it leaks intent and is spec-non-compliant).
 *  - Echo the request Origin only if it matches our canonical app URL.
 *  - Fall back to the canonical app URL so responses are never credentialed
 *    against an arbitrary origin.
 */
function getAllowedOrigin(req: Request): string {
  const appUrl = getAppUrl();
  const requestOrigin = req.headers.get("origin") ?? "";
  // Allow the exact origin only if it matches our app domain
  if (requestOrigin && requestOrigin.startsWith(appUrl)) {
    return requestOrigin;
  }
  // For same-origin requests (no Origin header) or non-matching origins,
  // return our canonical URL — keeps the header valid.
  return appUrl;
}

export async function registerCustomAuthFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  const isSecure = url.protocol === "https:";
  const clientIp = getClientIp(req);
  const cookieDomain = ENV.cookieDomain || undefined;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": getAllowedOrigin(req),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  // Only handle POST requests
  if (method !== "POST") {
    return null;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    // ── Sign Up ────────────────────────────────────────────────────────────
    if (path === "/api/auth/signup") {
      const rateCheck = authRateLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        return Response.json(
          {
            success: false,
            error: "Too many attempts. Please try again later.",
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            },
          }
        );
      }

      const body = await req.json().catch(() => ({}));
      const { email, password, name } = body as {
        email?: string;
        password?: string;
        name?: string;
      };

      const result = await signUp(email || "", password || "", name);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      // Send verification email (non-blocking — don't fail signup if email fails)
      if (result.user?.email) {
        sendVerificationEmail(result.user.openId, result.user.email).catch(
          err => console.error("[auth] Failed to send verification email:", err)
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
          message:
            "Account created. Please check your email to verify your address.",
        },
        { status: 201, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken ?? "", isSecure, cookieDomain)
      );

      return response;
    }

    // ── Sign In ────────────────────────────────────────────────────────────
    if (path === "/api/auth/signin") {
      const rateCheck = authRateLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        return Response.json(
          {
            success: false,
            error: "Too many attempts. Please try again later.",
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            },
          }
        );
      }

      const body = await req.json().catch(() => ({}));
      const { email, password } = body as {
        email?: string;
        password?: string;
      };

      const result = await signIn(email || "", password || "");

      if (!result.success) {
        // Pass through the machine-readable code so the client can branch
        // (e.g. show "Resend verification" when code === "email_not_verified")
        return Response.json(
          { success: false, error: result.error, code: result.code },
          { status: 401, headers: corsHeaders }
        );
      }

      // On successful login reset the rate limit for this IP
      authRateLimiter.reset(clientIp);

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken ?? "", isSecure, cookieDomain)
      );

      return response;
    }

    // ── Logout ─────────────────────────────────────────────────────────────
    if (path === "/api/auth/logout") {
      const response = Response.json(
        { success: true },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildLogoutCookie(isSecure, cookieDomain)
      );

      return response;
    }

    // ── Clerk Fallback ─────────────────────────────────────────────────────
    if (path === "/api/auth/clerk") {
      const body = await req.json().catch(() => ({}));
      const { sessionToken } = body as { sessionToken?: string };

      if (!sessionToken) {
        return Response.json(
          { success: false, error: "Session token required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await verifyClerkSession(sessionToken);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken ?? "", isSecure, cookieDomain)
      );

      return response;
    }

    // ── Firebase Fallback ──────────────────────────────────────────────────
    if (path === "/api/auth/firebase") {
      const body = await req.json().catch(() => ({}));
      const { idToken } = body as { idToken?: string };

      if (!idToken) {
        return Response.json(
          { success: false, error: "ID token required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await verifyFirebaseIdToken(idToken);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }

      const response = Response.json(
        {
          success: true,
          user: result.user,
        },
        { status: 200, headers: corsHeaders }
      );

      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(result.sessionToken ?? "", isSecure, cookieDomain)
      );

      return response;
    }

    // ── Forgot Password ────────────────────────────────────────────────────
    if (path === "/api/auth/forgot-password") {
      const rateCheck = passwordResetLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        return Response.json(
          {
            success: false,
            error: "Too many attempts. Please try again later.",
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            },
          }
        );
      }

      const body = await req.json().catch(() => ({}));
      const { email } = body as { email?: string };

      if (!email) {
        return Response.json(
          { success: false, error: "Email is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Always succeed to avoid email enumeration
      await requestPasswordReset(email);

      return Response.json(
        {
          success: true,
          message:
            "If an account with that email exists, a reset link has been sent.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Reset Password ─────────────────────────────────────────────────────
    if (path === "/api/auth/reset-password") {
      const body = await req.json().catch(() => ({}));
      const { token, password } = body as { token?: string; password?: string };

      if (!token || !password) {
        return Response.json(
          { success: false, error: "Token and new password are required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await resetPassword(token, password);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      return Response.json(
        {
          success: true,
          message: "Password updated successfully. You can now sign in.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Verify Email ───────────────────────────────────────────────────────
    if (path === "/api/auth/verify-email") {
      const body = await req.json().catch(() => ({}));
      const { token } = body as { token?: string };

      if (!token) {
        return Response.json(
          { success: false, error: "Token is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await verifyEmailToken(token);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      return Response.json(
        { success: true, message: "Email verified successfully." },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Resend Verification Email ──────────────────────────────────────────
    if (path === "/api/auth/resend-verification") {
      const rateCheck = passwordResetLimiter.check(clientIp); // reuse same bucket
      if (!rateCheck.allowed) {
        return Response.json(
          {
            success: false,
            error: "Too many attempts. Please try again later.",
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            },
          }
        );
      }

      const body = await req.json().catch(() => ({}));
      const { email } = body as { email?: string };
      if (!email) {
        return Response.json(
          { success: false, error: "Email is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Look up user — always return success to prevent enumeration
      const db = await getDb();
      if (db) {
        const rows = await db
          .select({
            openId: usersTable.openId,
            emailVerified: usersTable.emailVerified,
          })
          .from(usersTable)
          .where(eq(usersTable.email, email.toLowerCase().trim()))
          .limit(1);
        const user = rows[0];
        if (user && user.emailVerified === false) {
          await sendVerificationEmail(user.openId, email.toLowerCase().trim());
        }
      }

      return Response.json(
        {
          success: true,
          message:
            "If an unverified account with that email exists, a new verification link has been sent.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return null; // Not a custom auth route
  } catch (err: unknown) {
    console.error("[customAuthRoutes] Error:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
