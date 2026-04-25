/**
 * Custom Auth Routes
 *
 * POST /api/auth/signup     - Create account with email/password
 * POST /api/auth/signin     - Sign in with email/password
 * POST /api/auth/logout     - Clear session cookie
 * POST /api/auth/clerk      - Verify Clerk session token (fallback)
 * POST /api/auth/firebase   - Verify Firebase ID token (fallback)
 */

import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
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
  verifyPassword,
} from "./customAuth";
import { sdk } from "./sdk";
import { authRateLimiter, passwordResetLimiter } from "./rateLimiter";
import { ENV, getAppUrl } from "./env";
import { getDb, getTenantBySlug } from "../db";
import {
  users as usersTable,
  auditLogs as auditLogsTable,
  notifications as notificationsTable,
  creditTransactions as creditTransactionsTable,
  analyticsEvents as analyticsEventsTable,
  referrals as referralsTable,
} from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";

const DEFAULT_GOOGLE_SCOPES =
  "openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

type GoogleOAuthSettings = {
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
};

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

function readGoogleOAuthSettings(
  settings: Record<string, unknown> | null | undefined
): GoogleOAuthSettings {
  const settingsObject =
    settings && typeof settings === "object" ? settings : undefined;
  const raw =
    settingsObject?.googleOAuth &&
    typeof settingsObject.googleOAuth === "object" &&
    !Array.isArray(settingsObject.googleOAuth)
      ? (settingsObject.googleOAuth as Record<string, unknown>)
      : {};

  return {
    enabled: raw.enabled === true,
    clientId: typeof raw.clientId === "string" ? raw.clientId : "",
    clientSecret:
      typeof raw.clientSecret === "string" ? raw.clientSecret : undefined,
    redirectUri: typeof raw.redirectUri === "string" ? raw.redirectUri : "",
    scopes:
      typeof raw.scopes === "string" && raw.scopes.trim().length > 0
        ? raw.scopes
        : DEFAULT_GOOGLE_SCOPES,
  };
}

async function buildGoogleOAuthScaffold(tenantSlug?: string): Promise<
  | {
      success: true;
      authorizationUrl: string;
      callbackUrl: string;
      message: string;
    }
  | {
      success: false;
      status: number;
      error: string;
    }
> {
  if (!tenantSlug) {
    return {
      success: false,
      status: 400,
      error:
        "A tenant slug is required. Add ?tenant=your-store-slug to the login URL after configuring Google OAuth.",
    };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return {
      success: false,
      status: 404,
      error: "Workspace not found for that tenant slug.",
    };
  }

  const google = readGoogleOAuthSettings(
    (tenant.settings as Record<string, unknown> | null | undefined) ?? null
  );

  if (!google.enabled || !google.clientId) {
    return {
      success: false,
      status: 400,
      error:
        "Google OAuth is not configured for this workspace yet. Sign in with email/password and add the provider settings first.",
    };
  }

  const callbackUrl =
    google.redirectUri || `${getAppUrl()}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ tenantSlug })).toString(
    "base64url"
  );
  const authorizationUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );
  authorizationUrl.searchParams.set("client_id", google.clientId);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set(
    "scope",
    google.scopes || DEFAULT_GOOGLE_SCOPES
  );
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("state", state);

  return {
    success: true,
    authorizationUrl: authorizationUrl.toString(),
    callbackUrl,
    message:
      "Google OAuth authorize URL created. The callback exchange still needs to be finished later.",
  };
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    if (path === "/api/auth/google/callback" && method === "GET") {
      const redirectUrl = new URL(
        "/login?error=google_oauth_not_ready",
        getAppUrl()
      );
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Only handle POST requests for all other custom auth endpoints
    if (method !== "POST") {
      return null;
    }

    if (path === "/api/auth/google/start") {
      const rateCheck = await authRateLimiter.check(clientIp);
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
      const { tenantSlug } = body as { tenantSlug?: string };
      const result = await buildGoogleOAuthScaffold(tenantSlug);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: result.status, headers: corsHeaders }
        );
      }

      return Response.json(result, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // ── Sign Up ────────────────────────────────────────────────────────────
    if (path === "/api/auth/signup") {
      const rateCheck = await authRateLimiter.check(clientIp);
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
      const { email, password, name, username } = body as {
        email?: string;
        password?: string;
        name?: string;
        username?: string;
      };

      const result = await signUp(email || "", password || "", name, username);

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      // Send verification email only if user is not already verified
      // (non-blocking — don't fail signup if email fails)
      if (result.user?.email && result.user.emailVerified === false) {
        sendVerificationEmail(result.user.openId, result.user.email).catch(
          err => console.error("[auth] Failed to send verification email:", err)
        );
      }

      const message = result.user?.emailVerified
        ? "Account created successfully. You can now sign in."
        : "Account created. Please check your email to verify your address.";

      const response = Response.json(
        {
          success: true,
          user: result.user,
          message,
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
      const rateCheck = await authRateLimiter.check(clientIp);
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
      const { email, identifier, password } = body as {
        email?: string;
        identifier?: string;
        password?: string;
      };

      const result = await signIn(identifier || email || "", password || "");

      if (!result.success) {
        // Pass through the machine-readable code so the client can branch
        // (e.g. show "Resend verification" when code === "email_not_verified")
        return Response.json(
          { success: false, error: result.error, code: result.code },
          { status: 401, headers: corsHeaders }
        );
      }

      // On successful login reset the rate limit for this IP
      await authRateLimiter.reset(clientIp);

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
      const rateCheck = await passwordResetLimiter.check(clientIp);
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
      const rateCheck = await passwordResetLimiter.check(clientIp);
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
      const rateCheck = await passwordResetLimiter.check(clientIp);
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
      const rateCheck = await passwordResetLimiter.check(clientIp); // reuse same bucket
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

    // ── GDPR / CCPA: data export ────────────────────────────────────────────
    if (path === "/api/auth/data-export") {
      let user;
      try {
        user = await sdk.authenticateRequest(req as any);
      } catch {
        return Response.json(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: corsHeaders }
        );
      }
      const db = await getDb();
      if (!db) {
        return Response.json(
          { success: false, error: "Database unavailable" },
          { status: 503, headers: corsHeaders }
        );
      }
      const [
        accountRows,
        auditRows,
        notificationRows,
        creditTxnRows,
        analyticsRows,
        referralRows,
      ] = await Promise.all([
        db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1),
        db
          .select()
          .from(auditLogsTable)
          .where(eq(auditLogsTable.userId, user.id))
          .limit(5000),
        db
          .select()
          .from(notificationsTable)
          .where(eq(notificationsTable.userId, user.id))
          .limit(5000),
        db
          .select()
          .from(creditTransactionsTable)
          .where(eq(creditTransactionsTable.userId, user.id))
          .limit(5000),
        db
          .select()
          .from(analyticsEventsTable)
          .where(eq(analyticsEventsTable.userId, user.id))
          .limit(5000),
        db
          .select()
          .from(referralsTable)
          .where(
            or(
              eq(referralsTable.referrerId, user.id),
              eq(referralsTable.referredUserId, user.id)
            )
          )
          .limit(5000),
      ]);
      const account = accountRows[0]
        ? {
            ...accountRows[0],
            passwordHash: undefined,
            passwordResetToken: undefined,
            passwordResetExpiresAt: undefined,
            emailVerificationToken: undefined,
          }
        : null;
      return Response.json(
        {
          success: true,
          exportedAt: new Date().toISOString(),
          account,
          auditLogs: auditRows,
          notifications: notificationRows,
          creditTransactions: creditTxnRows,
          analyticsEvents: analyticsRows,
          referrals: referralRows,
          _note:
            "Covers primary user-scoped tables. For tenant-scoped data (orders, products, social posts) email support@1commerce.online; we will extract within 30 days as required by law.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── GDPR / CCPA: delete account ─────────────────────────────────────────
    if (path === "/api/auth/delete-account") {
      let user;
      try {
        user = await sdk.authenticateRequest(req as any);
      } catch {
        return Response.json(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: corsHeaders }
        );
      }
      const body = await req.json().catch(() => ({}));
      const { password, confirm } = body as {
        password?: string;
        confirm?: string;
      };
      if (confirm !== "DELETE MY ACCOUNT") {
        return Response.json(
          {
            success: false,
            error:
              'You must include {"confirm":"DELETE MY ACCOUNT"} in the request body.',
          },
          { status: 400, headers: corsHeaders }
        );
      }
      if (!password) {
        return Response.json(
          {
            success: false,
            error: "Password is required to confirm account deletion",
          },
          { status: 400, headers: corsHeaders }
        );
      }
      if (!user.passwordHash) {
        return Response.json(
          {
            success: false,
            error:
              "This account uses social sign-in. Email support@1commerce.online to request deletion.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return Response.json(
          { success: false, error: "Password is incorrect" },
          { status: 401, headers: corsHeaders }
        );
      }
      const db = await getDb();
      if (!db) {
        return Response.json(
          { success: false, error: "Database unavailable" },
          { status: 503, headers: corsHeaders }
        );
      }
      const anonymizedEmail = `deleted-${user.openId}@deleted.1commerce.online`;
      const anonymizedUsername = `deleted_${user.openId.slice(0, 16)}`;
      const now = new Date();
      await db
        .update(usersTable)
        .set({
          email: anonymizedEmail,
          username: anonymizedUsername,
          name: "Deleted User",
          passwordHash: null,
          emailVerificationToken: null,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          passwordChangedAt: now,
          referralCode: null,
          deletedAt: now,
        })
        .where(eq(usersTable.openId, user.openId));
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Your account has been deleted. Personal data is anonymized and will be hard-deleted after 30 days.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Set-Cookie": buildLogoutCookie(isSecure, cookieDomain),
          },
        }
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

function getExpressClientIp(req: ExpressRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0];
  return req.ip || "unknown";
}

function isExpressRequestSecure(req: ExpressRequest): boolean {
  const forwardedProto = req.headers["x-forwarded-proto"];
  return req.secure || forwardedProto === "https";
}

export function registerCustomAuthExpressRoutes(app: Express) {
  app.get(
    "/api/auth/google/callback",
    (_req: ExpressRequest, res: ExpressResponse) => {
      res.redirect(302, "/login?error=google_oauth_not_ready");
    }
  );

  app.post(
    "/api/auth/google/start",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await authRateLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { tenantSlug } = (req.body ?? {}) as { tenantSlug?: string };
        const result = await buildGoogleOAuthScaffold(tenantSlug);
        if (!result.success) {
          res
            .status(result.status)
            .json({ success: false, error: result.error });
          return;
        }
        res.json(result);
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/auth/signup",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await authRateLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { email, password, name, username } = (req.body ?? {}) as {
          email?: string;
          password?: string;
          name?: string;
          username?: string;
        };

        const result = await signUp(
          email || "",
          password || "",
          name,
          username
        );
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error });
          return;
        }

        if (result.user?.email && result.user.emailVerified === false) {
          sendVerificationEmail(result.user.openId, result.user.email).catch(
            err =>
              console.error("[auth] Failed to send verification email:", err)
          );
        }

        res.append(
          "Set-Cookie",
          buildSessionCookie(
            result.sessionToken ?? "",
            isExpressRequestSecure(req),
            ENV.cookieDomain || undefined
          )
        );
        res.status(201).json({
          success: true,
          user: result.user,
          message: result.user?.emailVerified
            ? "Account created successfully. You can now sign in."
            : "Account created. Please check your email to verify your address.",
        });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/auth/signin",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await authRateLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { email, identifier, password } = (req.body ?? {}) as {
          email?: string;
          identifier?: string;
          password?: string;
        };

        const result = await signIn(identifier || email || "", password || "");
        if (!result.success) {
          res
            .status(401)
            .json({ success: false, error: result.error, code: result.code });
          return;
        }

        await authRateLimiter.reset(clientIp);
        res.append(
          "Set-Cookie",
          buildSessionCookie(
            result.sessionToken ?? "",
            isExpressRequestSecure(req),
            ENV.cookieDomain || undefined
          )
        );
        res.status(200).json({ success: true, user: result.user });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post("/api/auth/logout", (req: ExpressRequest, res: ExpressResponse) => {
    res.append(
      "Set-Cookie",
      buildLogoutCookie(
        isExpressRequestSecure(req),
        ENV.cookieDomain || undefined
      )
    );
    res.status(200).json({ success: true });
  });

  app.post(
    "/api/auth/forgot-password",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await passwordResetLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { email } = (req.body ?? {}) as { email?: string };
        if (!email) {
          res.status(400).json({ success: false, error: "Email is required" });
          return;
        }

        await requestPasswordReset(email);
        res.status(200).json({
          success: true,
          message:
            "If an account with that email exists, a reset link has been sent.",
        });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/auth/reset-password",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await passwordResetLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { token, password } = (req.body ?? {}) as {
          token?: string;
          password?: string;
        };
        if (!token || !password) {
          res.status(400).json({
            success: false,
            error: "Token and new password are required",
          });
          return;
        }

        const result = await resetPassword(token, password);
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error });
          return;
        }

        res.status(200).json({
          success: true,
          message: "Password updated successfully. You can now sign in.",
        });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/auth/verify-email",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await passwordResetLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { token } = (req.body ?? {}) as { token?: string };
        if (!token) {
          res.status(400).json({ success: false, error: "Token is required" });
          return;
        }

        const result = await verifyEmailToken(token);
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error });
          return;
        }

        res
          .status(200)
          .json({ success: true, message: "Email verified successfully." });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/auth/resend-verification",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const rateCheck = await passwordResetLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res
            .status(429)
            .setHeader(
              "Retry-After",
              String(Math.ceil(rateCheck.retryAfterMs / 1000))
            )
            .json({
              success: false,
              error: "Too many attempts. Please try again later.",
            });
          return;
        }

        const { email } = (req.body ?? {}) as { email?: string };
        if (!email) {
          res.status(400).json({ success: false, error: "Email is required" });
          return;
        }

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
            await sendVerificationEmail(
              user.openId,
              email.toLowerCase().trim()
            );
          }
        }

        res.status(200).json({
          success: true,
          message:
            "If an unverified account with that email exists, a new verification link has been sent.",
        });
      } catch (err) {
        console.error("[customAuthRoutes] Error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  // ── GDPR / CCPA ───────────────────────────────────────────────────────────────

  // POST /api/auth/data-export
  // Auth required. Returns the user's data as JSON. GDPR Article 15 / CCPA right-to-know.
  app.post(
    "/api/auth/data-export",
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const user = await sdk.authenticateRequest(req);
        const db = await getDb();
        if (!db) {
          res
            .status(503)
            .json({ success: false, error: "Database unavailable" });
          return;
        }

        const [
          accountRows,
          auditRows,
          notificationRows,
          creditTxnRows,
          analyticsRows,
          referralRows,
        ] = await Promise.all([
          db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .limit(1),
          db
            .select()
            .from(auditLogsTable)
            .where(eq(auditLogsTable.userId, user.id))
            .limit(5000),
          db
            .select()
            .from(notificationsTable)
            .where(eq(notificationsTable.userId, user.id))
            .limit(5000),
          db
            .select()
            .from(creditTransactionsTable)
            .where(eq(creditTransactionsTable.userId, user.id))
            .limit(5000),
          db
            .select()
            .from(analyticsEventsTable)
            .where(eq(analyticsEventsTable.userId, user.id))
            .limit(5000),
          db
            .select()
            .from(referralsTable)
            .where(
              or(
                eq(referralsTable.referrerId, user.id),
                eq(referralsTable.referredUserId, user.id)
              )
            )
            .limit(5000),
        ]);

        const account = accountRows[0]
          ? {
              ...accountRows[0],
              passwordHash: undefined,
              passwordResetToken: undefined,
              passwordResetExpiresAt: undefined,
              emailVerificationToken: undefined,
            }
          : null;

        res.status(200).json({
          success: true,
          exportedAt: new Date().toISOString(),
          account,
          auditLogs: auditRows,
          notifications: notificationRows,
          creditTransactions: creditTxnRows,
          analyticsEvents: analyticsRows,
          referrals: referralRows,
          _note:
            "Covers primary user-scoped tables. For tenant-scoped data (orders, products, social posts) email support@1commerce.online; we'll extract within 30 days as required by law.",
        });
      } catch (err) {
        if (
          err instanceof Error &&
          /forbidden|invalid session/i.test(err.message)
        ) {
          res.status(401).json({ success: false, error: "Unauthorized" });
          return;
        }
        console.error("[customAuthRoutes] data-export error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

  // POST /api/auth/delete-account
  // Auth + password reconfirm + typed confirmation. Soft-deletes (anonymizes PII,
  // sets deletedAt). GDPR Article 17 / CCPA right-to-delete.
  app.post(
    "/api/auth/delete-account",
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const user = await sdk.authenticateRequest(req);
        const { password, confirm } = (req.body ?? {}) as {
          password?: string;
          confirm?: string;
        };

        if (confirm !== "DELETE MY ACCOUNT") {
          res.status(400).json({
            success: false,
            error:
              'You must include {"confirm":"DELETE MY ACCOUNT"} in the request body.',
          });
          return;
        }
        if (!password) {
          res.status(400).json({
            success: false,
            error: "Password is required to confirm account deletion",
          });
          return;
        }
        if (!user.passwordHash) {
          res.status(400).json({
            success: false,
            error:
              "This account uses social sign-in. Email support@1commerce.online to request deletion.",
          });
          return;
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          res
            .status(401)
            .json({ success: false, error: "Password is incorrect" });
          return;
        }

        const db = await getDb();
        if (!db) {
          res
            .status(503)
            .json({ success: false, error: "Database unavailable" });
          return;
        }

        const anonymizedEmail = `deleted-${user.openId}@deleted.1commerce.online`;
        const anonymizedUsername = `deleted_${user.openId.slice(0, 16)}`;
        const now = new Date();

        await db
          .update(usersTable)
          .set({
            email: anonymizedEmail,
            username: anonymizedUsername,
            name: "Deleted User",
            passwordHash: null,
            emailVerificationToken: null,
            passwordResetToken: null,
            passwordResetExpiresAt: null,
            passwordChangedAt: now,
            referralCode: null,
            deletedAt: now,
          })
          .where(eq(usersTable.openId, user.openId));

        const isProduction = ENV.isProduction;
        res.setHeader(
          "Set-Cookie",
          buildLogoutCookie(isProduction, ENV.cookieDomain || undefined)
        );

        res.status(200).json({
          success: true,
          message:
            "Your account has been deleted. Personal data is anonymized and will be hard-deleted after 30 days.",
        });
      } catch (err) {
        if (
          err instanceof Error &&
          /forbidden|invalid session/i.test(err.message)
        ) {
          res.status(401).json({ success: false, error: "Unauthorized" });
          return;
        }
        console.error("[customAuthRoutes] delete-account error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );
}
