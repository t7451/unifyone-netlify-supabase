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
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  signUp,
  signIn,
  signInWithGoogleProfile,
  verifyClerkSession,
  verifyFirebaseIdToken,
  buildSessionCookie,
  buildRefreshCookie,
  buildLogoutCookie,
  buildRefreshLogoutCookie,
  rotateRefreshToken,
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
import { REFRESH_COOKIE_NAME } from "@shared/const";
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
  tenantId?: number | null;
  tenantSlug?: string;
  source: "tenant" | "env";
};

type GoogleOAuthState = {
  exp: number;
  nonce: string;
  returnTo: string;
  tenantSlug?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  name?: string;
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
  const appOrigin = new URL(appUrl).origin;
  const requestOrigin = req.headers.get("origin") ?? "";
  // Allow the exact origin only if it matches our app domain
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).origin === appOrigin) {
        return requestOrigin;
      }
    } catch {
      // Fall through to canonical app origin for malformed Origin headers.
    }
  }
  // For same-origin requests (no Origin header) or non-matching origins,
  // return our canonical URL — keeps the header valid.
  return appOrigin;
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
    source: "tenant",
  };
}

function readGlobalGoogleOAuthSettings(): GoogleOAuthSettings {
  return {
    enabled:
      process.env.GOOGLE_OAUTH_ENABLED !== "false" &&
      Boolean(
        process.env.GOOGLE_OAUTH_CLIENT_ID &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET
      ),
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || undefined,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
    scopes: process.env.GOOGLE_OAUTH_SCOPES || DEFAULT_GOOGLE_SCOPES,
    source: "env",
  };
}

function sanitizeReturnTo(returnTo: unknown): string {
  if (typeof returnTo !== "string") return "/dashboard";
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }
  return trimmed;
}

function buildLoginRedirect(error: string, returnTo = "/dashboard"): string {
  const redirectUrl = new URL("/login", getAppUrl());
  redirectUrl.searchParams.set("error", error);
  if (returnTo && returnTo !== "/dashboard") {
    redirectUrl.searchParams.set("returnTo", returnTo);
  }
  return redirectUrl.toString();
}

function getStateSecret(): Buffer {
  return Buffer.from(ENV.cookieSecret || process.env.JWT_SECRET || "", "utf8");
}

function signStatePayload(payload: string): string {
  return createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");
}

function createGoogleOAuthState(input: {
  tenantSlug?: string;
  returnTo?: string;
}): string {
  const state: GoogleOAuthState = {
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomBytes(16).toString("base64url"),
    returnTo: sanitizeReturnTo(input.returnTo),
    ...(input.tenantSlug ? { tenantSlug: input.tenantSlug } : {}),
  };
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
    "base64url"
  );
  return `${payload}.${signStatePayload(payload)}`;
}

function verifyGoogleOAuthState(
  rawState: string | null
): GoogleOAuthState | null {
  if (!rawState) return null;
  const [payload, signature] = rawState.split(".");
  if (!payload || !signature) return null;

  const expected = signStatePayload(payload);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<GoogleOAuthState>;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    if (typeof parsed.nonce !== "string" || parsed.nonce.length === 0) {
      return null;
    }
    return {
      exp: parsed.exp,
      nonce: parsed.nonce,
      returnTo: sanitizeReturnTo(parsed.returnTo),
      tenantSlug:
        typeof parsed.tenantSlug === "string" && parsed.tenantSlug.length > 0
          ? parsed.tenantSlug
          : undefined,
    };
  } catch {
    return null;
  }
}

function withDefaultRedirectUri(
  settings: GoogleOAuthSettings
): GoogleOAuthSettings {
  return {
    ...settings,
    redirectUri:
      settings.redirectUri || `${getAppUrl()}/api/auth/google/callback`,
  };
}

async function resolveGoogleOAuthSettings(
  tenantSlug?: string
): Promise<
  | { success: true; settings: GoogleOAuthSettings }
  | { success: false; status: number; error: string }
> {
  const globalSettings = readGlobalGoogleOAuthSettings();

  if (tenantSlug) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return {
        success: false,
        status: 404,
        error: "Workspace not found for that tenant slug.",
      };
    }

    const tenantGoogle = readGoogleOAuthSettings(
      (tenant.settings as Record<string, unknown> | null | undefined) ?? null
    );
    if (tenantGoogle.enabled && tenantGoogle.clientId) {
      if (!tenantGoogle.clientSecret) {
        return {
          success: false,
          status: 400,
          error: "Google OAuth is missing a client secret for this workspace.",
        };
      }
      return {
        success: true,
        settings: withDefaultRedirectUri({
          ...tenantGoogle,
          tenantId: tenant.id,
          tenantSlug,
          source: "tenant",
        }),
      };
    }

    if (globalSettings.enabled) {
      return {
        success: true,
        settings: withDefaultRedirectUri({
          ...globalSettings,
          tenantId: tenant.id,
          tenantSlug,
        }),
      };
    }

    return {
      success: false,
      status: 400,
      error:
        "Google OAuth is not configured for this workspace yet. Add workspace settings or configure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
    };
  }

  if (!globalSettings.enabled) {
    return {
      success: false,
      status: 400,
      error:
        "Google OAuth is not configured globally. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET, or use a login URL with ?tenant=your-store-slug for workspace-specific settings.",
    };
  }

  return {
    success: true,
    settings: withDefaultRedirectUri(globalSettings),
  };
}

async function buildGoogleOAuthScaffold(
  tenantSlug?: string,
  returnTo?: string
): Promise<
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
  const resolved = await resolveGoogleOAuthSettings(tenantSlug);
  if (!resolved.success) return resolved;

  const google = resolved.settings;
  const callbackUrl = google.redirectUri;
  const state = createGoogleOAuthState({
    tenantSlug: google.tenantSlug,
    returnTo,
  });
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
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("prompt", "select_account");
  authorizationUrl.searchParams.set("state", state);

  return {
    success: true,
    authorizationUrl: authorizationUrl.toString(),
    callbackUrl,
    message: "Redirecting to Google for sign-in.",
  };
}

async function exchangeGoogleCode(
  google: GoogleOAuthSettings,
  code: string
): Promise<{ accessToken: string }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret ?? "",
      redirect_uri: google.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Google token exchange failed"
    );
  }

  return { accessToken: data.access_token };
}

async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = (await response
    .json()
    .catch(() => ({}))) as Partial<GoogleUserInfo>;

  if (!response.ok || !data.sub || !data.email) {
    throw new Error("Google userinfo request failed");
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified: data.email_verified,
    name: data.name,
  };
}

async function completeGoogleOAuthCallback(params: {
  code: string | null;
  state: string | null;
  providerError?: string | null;
  clientIp: string;
  userAgent?: string;
}): Promise<{
  redirectTo: string;
  sessionToken?: string;
  refreshToken?: string;
}> {
  const verifiedState = verifyGoogleOAuthState(params.state);
  const returnTo = verifiedState?.returnTo ?? "/dashboard";

  if (params.providerError) {
    return { redirectTo: buildLoginRedirect("google_oauth_denied", returnTo) };
  }
  if (!params.code || !verifiedState) {
    return { redirectTo: buildLoginRedirect("google_oauth_invalid", returnTo) };
  }

  const resolved = await resolveGoogleOAuthSettings(verifiedState.tenantSlug);
  if (!resolved.success) {
    return { redirectTo: buildLoginRedirect("google_oauth_config", returnTo) };
  }

  try {
    const { accessToken } = await exchangeGoogleCode(
      resolved.settings,
      params.code
    );
    const profile = await fetchGoogleUserInfo(accessToken);
    const emailVerified =
      profile.email_verified === true || profile.email_verified === "true";
    const result = await signInWithGoogleProfile(
      {
        sub: profile.sub,
        email: profile.email,
        emailVerified,
        name: profile.name,
        tenantId: resolved.settings.tenantId ?? null,
      },
      { ipAddress: params.clientIp, userAgent: params.userAgent }
    );

    if (!result.success) {
      return {
        redirectTo: buildLoginRedirect(
          emailVerified ? "google_oauth_failed" : "google_oauth_unverified",
          returnTo
        ),
      };
    }

    await authRateLimiter.reset(params.clientIp);
    void import("./../auditLogger").then(({ logAudit }) =>
      logAudit({
        action: "auth.login",
        resource: "user",
        resourceId: result.user?.openId ?? "",
        severity: "low",
        metadata: {
          method: "google",
          providerSource: resolved.settings.source,
          tenantSlug: resolved.settings.tenantSlug,
        },
        ip: params.clientIp,
        userAgent: params.userAgent,
      }).catch(() => {})
    );

    return {
      redirectTo: returnTo,
      sessionToken: result.sessionToken,
      refreshToken: result.refreshToken,
    };
  } catch (err) {
    console.error("[Google OAuth] callback failed:", err);
    return { redirectTo: buildLoginRedirect("google_oauth_failed", returnTo) };
  }
}

export async function registerCustomAuthFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isSecure = forwardedProto === "https" || url.protocol === "https:";
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
      const callback = await completeGoogleOAuthCallback({
        code: url.searchParams.get("code"),
        state: url.searchParams.get("state"),
        providerError: url.searchParams.get("error"),
        clientIp,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
      const response = new Response(null, {
        status: 302,
        headers: { Location: callback.redirectTo },
      });
      if (callback.sessionToken) {
        response.headers.append(
          "Set-Cookie",
          buildSessionCookie(callback.sessionToken, isSecure, cookieDomain)
        );
      }
      if (callback.refreshToken) {
        response.headers.append(
          "Set-Cookie",
          buildRefreshCookie(callback.refreshToken, isSecure, cookieDomain)
        );
      }
      return response;
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
      const { tenantSlug, returnTo } = body as {
        tenantSlug?: string;
        returnTo?: string;
      };
      const result = await buildGoogleOAuthScaffold(tenantSlug, returnTo);

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

      const result = await signUp(email || "", password || "", name, username, {
        ipAddress: clientIp,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });

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
      if (result.refreshToken) {
        response.headers.append(
          "Set-Cookie",
          buildRefreshCookie(result.refreshToken, isSecure, cookieDomain)
        );
      }

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

      const result = await signIn(identifier || email || "", password || "", {
        ipAddress: clientIp,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });

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

      void import("./../auditLogger").then(({ logAudit }) =>
        logAudit({
          action: "auth.login",
          resource: "user",
          resourceId: result.user?.openId ?? "",
          severity: "low",
          metadata: { method: "password" },
          ip: clientIp,
          userAgent: req.headers.get("user-agent") ?? undefined,
        }).catch(() => {})
      );

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
      if (result.refreshToken) {
        response.headers.append(
          "Set-Cookie",
          buildRefreshCookie(result.refreshToken, isSecure, cookieDomain)
        );
      }

      return response;
    }

    // ── Token Refresh ──────────────────────────────────────────────────────
    if (path === "/api/auth/refresh") {
      // Read raw refresh token from the HttpOnly cookie
      const cookieHeader = req.headers.get("cookie") ?? "";
      const refreshTokenCookieMatch = cookieHeader
        .split(";")
        .map(c => c.trim())
        .find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      const rawRefreshToken = refreshTokenCookieMatch
        ? refreshTokenCookieMatch.slice(`${REFRESH_COOKIE_NAME}=`.length)
        : null;

      if (!rawRefreshToken) {
        return Response.json(
          { success: false, error: "No refresh token" },
          { status: 401, headers: corsHeaders }
        );
      }

      const rotateResult = await rotateRefreshToken(rawRefreshToken, {
        ipAddress: clientIp,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });

      if (!rotateResult.success) {
        // Rotation failed — clear both cookies so the client re-authenticates.
        // Return a generic message to avoid leaking token state (revoked vs expired
        // vs not found) which could assist token-enumeration attacks.
        const response = Response.json(
          {
            success: false,
            error: "Authentication expired. Please sign in again.",
          },
          { status: 401, headers: corsHeaders }
        );
        response.headers.append(
          "Set-Cookie",
          buildLogoutCookie(isSecure, cookieDomain)
        );
        response.headers.append(
          "Set-Cookie",
          buildRefreshLogoutCookie(isSecure, cookieDomain)
        );
        return response;
      }

      const response = Response.json(
        { success: true, user: rotateResult.user },
        { status: 200, headers: corsHeaders }
      );
      response.headers.append(
        "Set-Cookie",
        buildSessionCookie(
          rotateResult.sessionToken ?? "",
          isSecure,
          cookieDomain
        )
      );
      if (rotateResult.newRefreshToken) {
        response.headers.append(
          "Set-Cookie",
          buildRefreshCookie(
            rotateResult.newRefreshToken,
            isSecure,
            cookieDomain
          )
        );
      }
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
      response.headers.append(
        "Set-Cookie",
        buildRefreshLogoutCookie(isSecure, cookieDomain)
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
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      try {
        const callback = await completeGoogleOAuthCallback({
          code: typeof req.query.code === "string" ? req.query.code : null,
          state: typeof req.query.state === "string" ? req.query.state : null,
          providerError:
            typeof req.query.error === "string" ? req.query.error : null,
          clientIp,
          userAgent: req.headers["user-agent"] ?? undefined,
        });
        const isSecureExpress = isExpressRequestSecure(req);
        const cookieDomainExpress = ENV.cookieDomain || undefined;
        if (callback.sessionToken) {
          res.append(
            "Set-Cookie",
            buildSessionCookie(
              callback.sessionToken,
              isSecureExpress,
              cookieDomainExpress
            )
          );
        }
        if (callback.refreshToken) {
          res.append(
            "Set-Cookie",
            buildRefreshCookie(
              callback.refreshToken,
              isSecureExpress,
              cookieDomainExpress
            )
          );
        }
        res.redirect(302, callback.redirectTo);
      } catch (err) {
        console.error("[customAuthRoutes] Google callback error:", err);
        res.redirect(302, "/login?error=google_oauth_failed");
      }
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

        const { tenantSlug, returnTo } = (req.body ?? {}) as {
          tenantSlug?: string;
          returnTo?: string;
        };
        const result = await buildGoogleOAuthScaffold(tenantSlug, returnTo);
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
          username,
          {
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] ?? undefined,
          }
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

        const isSecureExpress = isExpressRequestSecure(req);
        const cookieDomainExpress = ENV.cookieDomain || undefined;
        res.append(
          "Set-Cookie",
          buildSessionCookie(
            result.sessionToken ?? "",
            isSecureExpress,
            cookieDomainExpress
          )
        );
        if (result.refreshToken) {
          res.append(
            "Set-Cookie",
            buildRefreshCookie(
              result.refreshToken,
              isSecureExpress,
              cookieDomainExpress
            )
          );
        }
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

        const result = await signIn(identifier || email || "", password || "", {
          ipAddress: clientIp,
          userAgent: req.headers["user-agent"] ?? undefined,
        });
        if (!result.success) {
          res
            .status(401)
            .json({ success: false, error: result.error, code: result.code });
          return;
        }

        await authRateLimiter.reset(clientIp);
        const isSecureExpress = isExpressRequestSecure(req);
        const cookieDomainExpress = ENV.cookieDomain || undefined;
        res.append(
          "Set-Cookie",
          buildSessionCookie(
            result.sessionToken ?? "",
            isSecureExpress,
            cookieDomainExpress
          )
        );
        if (result.refreshToken) {
          res.append(
            "Set-Cookie",
            buildRefreshCookie(
              result.refreshToken,
              isSecureExpress,
              cookieDomainExpress
            )
          );
        }
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
    const isSecureExpress = isExpressRequestSecure(req);
    const cookieDomainExpress = ENV.cookieDomain || undefined;
    res.append(
      "Set-Cookie",
      buildLogoutCookie(isSecureExpress, cookieDomainExpress)
    );
    res.append(
      "Set-Cookie",
      buildRefreshLogoutCookie(isSecureExpress, cookieDomainExpress)
    );
    res.status(200).json({ success: true });
  });

  // ── Token Refresh (Express) ───────────────────────────────────────────────
  app.post(
    "/api/auth/refresh",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const clientIp = getExpressClientIp(req);
      const cookieHeader = req.headers.cookie ?? "";
      const refreshTokenCookieMatch = cookieHeader
        .split(";")
        .map(c => c.trim())
        .find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      const rawRefreshToken = refreshTokenCookieMatch
        ? refreshTokenCookieMatch.slice(`${REFRESH_COOKIE_NAME}=`.length)
        : null;

      if (!rawRefreshToken) {
        res.status(401).json({ success: false, error: "No refresh token" });
        return;
      }

      try {
        const rotateResult = await rotateRefreshToken(rawRefreshToken, {
          ipAddress: clientIp,
          userAgent: req.headers["user-agent"] ?? undefined,
        });

        const isSecureExpress = isExpressRequestSecure(req);
        const cookieDomainExpress = ENV.cookieDomain || undefined;

        if (!rotateResult.success) {
          res.append(
            "Set-Cookie",
            buildLogoutCookie(isSecureExpress, cookieDomainExpress)
          );
          res.append(
            "Set-Cookie",
            buildRefreshLogoutCookie(isSecureExpress, cookieDomainExpress)
          );
          res.status(401).json({
            success: false,
            error: "Authentication expired. Please sign in again.",
          });
          return;
        }

        res.append(
          "Set-Cookie",
          buildSessionCookie(
            rotateResult.sessionToken ?? "",
            isSecureExpress,
            cookieDomainExpress
          )
        );
        if (rotateResult.newRefreshToken) {
          res.append(
            "Set-Cookie",
            buildRefreshCookie(
              rotateResult.newRefreshToken,
              isSecureExpress,
              cookieDomainExpress
            )
          );
        }
        res.status(200).json({ success: true, user: rotateResult.user });
      } catch (err) {
        console.error("[customAuthRoutes] Refresh error:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  );

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
