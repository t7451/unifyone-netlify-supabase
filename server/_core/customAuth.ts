/**
 * Custom JWT Auth — Roll Your Own Authentication
 *
 * Primary: Email + Password with scrypt hashing (Node.js crypto, no external deps)
 * Fallback 1: Clerk (when CLERK_SECRET_KEY is set)
 * Fallback 2: Firebase Auth (when FIREBASE_SERVICE_ACCOUNT is set)
 * OAuth: Google and Auth0 issue the same local JWT session cookies
 *
 * All methods produce the same session token format for downstream compatibility.
 */

import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { eq, or, and, isNull, lt } from "drizzle-orm";
import { users, refreshTokens } from "../../drizzle/schema";
import { sdk } from "./sdk";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_LIFETIME_MS,
  REFRESH_TOKEN_LIFETIME_MS,
} from "@shared/const";
import { getAppUrl } from "./env";
import { logger } from "./logger";
import { resolveDatabaseUrl } from "../lib/databaseUrl";

const scryptAsync = promisify(scrypt);

// ── Password Hashing (scrypt) ────────────────────────────────────────────────

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;

function normalizeUsername(username?: string | null): string | null {
  const normalized = username?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  }
  for (const character of username) {
    const isLowercaseLetter = character >= "a" && character <= "z";
    const isDigit = character >= "0" && character <= "9";
    const isAllowedSymbol =
      character === "." || character === "-" || character === "_";
    if (!isLowercaseLetter && !isDigit && !isAllowedSymbol) {
      return "Username can only contain lowercase letters, numbers, dots, hyphens, and underscores";
    }
  }
  const firstCharacter = username[0];
  const lastCharacter = username[username.length - 1];
  const startsOrEndsWithSymbol =
    firstCharacter === "." ||
    firstCharacter === "-" ||
    firstCharacter === "_" ||
    lastCharacter === "." ||
    lastCharacter === "-" ||
    lastCharacter === "_";
  if (startsOrEndsWithSymbol) {
    return "Username can only contain lowercase letters, numbers, dots, hyphens, and underscores";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  // Format: salt$derivedKey (both hex-encoded)
  return `${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, keyHex] = storedHash.split("$");
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return timingSafeEqual(derivedKey, storedKey);
}

// ── Database Connection (use Neon PostgreSQL) ───────────────────────────────

let _db: ReturnType<typeof import("drizzle-orm/neon-http").drizzle> | null =
  null;

async function getDb() {
  if (!_db) {
    const connectionString = resolveDatabaseUrl();
    if (!connectionString) {
      logger.error(
        "customAuth: no database URL configured (set DATABASE_URL or NETLIFY_DATABASE_URL)"
      );
      return null;
    }
    try {
      const { neon } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-http");
      const sql = neon(connectionString);
      _db = drizzle(sql);
    } catch (error) {
      logger.error("customAuth: database connection failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
  return _db;
}

// ── Generate User OpenID ─────────────────────────────────────────────────────

function generateOpenId(): string {
  return randomBytes(16).toString("hex");
}

// ── Auth Result Type ─────────────────────────────────────────────────────────

export type AuthResult = {
  success: boolean;
  error?: string;
  /** Machine-readable code — lets clients branch without parsing error strings. */
  code?: "email_not_verified";
  sessionToken?: string;
  /** Raw refresh token — caller embeds this in the HttpOnly refresh cookie. */
  refreshToken?: string;
  /**
   * True when this auth call created a brand-new local user row (signup),
   * false when it linked / signed-in an existing user. Used by OAuth callbacks
   * to fire `CompleteRegistration` (Pixel + CAPI) for new accounts.
   */
  isNewUser?: boolean;
  user?: {
    openId: string;
    email: string;
    name: string;
    username?: string | null;
    emailVerified?: boolean;
  };
};

// ── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name?: string,
  username?: string,
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const emailLower = email.toLowerCase().trim();
  const usernameLower = normalizeUsername(username);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { success: false, error: "Invalid email format" };
  }
  if (usernameLower) {
    const usernameError = validateUsername(usernameLower);
    if (usernameError) {
      return { success: false, error: usernameError };
    }
  }

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    if (usernameLower) {
      const existingUsername = await db
        .select({ openId: users.openId })
        .from(users)
        .where(eq(users.username, usernameLower))
        .limit(1);

      if (existingUsername.length > 0) {
        return {
          success: false,
          error: "That username is already in use",
        };
      }
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const openId = generateOpenId();
    const displayName =
      name?.trim() || usernameLower || emailLower.split("@")[0];

    // Auto-verify when no email service is configured — we cannot deliver verification links without one.
    const emailVerified = !process.env.RESEND_API_KEY;

    if (emailVerified) {
      logger.warn(
        "customAuth: RESEND_API_KEY not set — new users will be auto-verified. Set RESEND_API_KEY to enable email verification."
      );
    }

    const [insertedUser] = await db
      .insert(users)
      .values({
        openId,
        email: emailLower,
        username: usernameLower,
        passwordHash,
        name: displayName,
        loginMethod: "password",
        emailVerified,
        role: "user",
      })
      .returning({ id: users.id });

    // Create session token
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      email: emailLower,
      loginMethod: "password",
      expiresInMs: ACCESS_TOKEN_LIFETIME_MS,
    });

    // Issue refresh token — non-blocking; don't fail signup if this errors
    const refreshToken = insertedUser
      ? (await issueRefreshToken(insertedUser.id, opts).catch(() => null))
          ?.rawToken
      : undefined;

    return {
      success: true,
      sessionToken,
      refreshToken,
      user: {
        openId,
        email: emailLower,
        name: displayName,
        username: usernameLower,
        emailVerified,
      },
    };
  } catch (err: unknown) {
    logger.error("customAuth: signUp failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: "Failed to create account. Please try again.",
    };
  }
}

// ── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  identifier: string,
  password: string,
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult> {
  if (!identifier || !password) {
    return {
      success: false,
      error: "Email or username and password are required",
    };
  }

  const identifierLower = identifier.toLowerCase().trim();

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const result = await db
      .select()
      .from(users)
      .where(
        and(
          or(
            eq(users.email, identifierLower),
            eq(users.username, identifierLower)
          ),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    const user = result[0];

    if (!user) {
      // Timing-safe: still do a hash comparison to prevent timing attacks.
      // This branch also covers soft-deleted accounts (deletedAt IS NOT NULL).
      await hashPassword(password);
      return { success: false, error: "Invalid email, username, or password" };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        error:
          "This account uses a different sign-in method (magic link or social)",
      };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Invalid email, username, or password" };
    }

    // Require email verification only when an email service is configured.
    // Without RESEND_API_KEY we cannot deliver verification links, so enforcing
    // the gate would lock everyone out. The gate auto-enables the moment
    // RESEND_API_KEY is set.
    // The client should check for code === "email_not_verified" and offer
    // a "Resend verification email" button.
    const shouldEnforceVerification = Boolean(process.env.RESEND_API_KEY);

    if (user.emailVerified === false && shouldEnforceVerification) {
      return {
        success: false,
        code: "email_not_verified",
        error:
          "Please verify your email address before signing in. Check your inbox for a verification link.",
      };
    }

    if (user.emailVerified === false && !shouldEnforceVerification) {
      logger.warn(
        "customAuth: Allowing sign-in for unverified user (RESEND_API_KEY not set — email verification disabled)",
        { identifier: identifierLower }
      );
    }

    // Update last signed in
    await db
      .update(users)
      .set({ lastSignedIn: new Date(), loginMethod: "password" })
      .where(eq(users.openId, user.openId));

    // Create session token
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || user.username || user.email?.split("@")[0] || "User",
      email: user.email,
      loginMethod: "password",
      expiresInMs: ACCESS_TOKEN_LIFETIME_MS,
    });

    // Issue refresh token — non-blocking; don't fail signin if this errors
    const refreshToken = (
      await issueRefreshToken(user.id, opts).catch(() => null)
    )?.rawToken;

    return {
      success: true,
      sessionToken,
      refreshToken,
      user: {
        openId: user.openId,
        email: user.email || identifierLower,
        name: user.name || user.username || user.email?.split("@")[0] || "User",
        username: user.username,
      },
    };
  } catch (err: unknown) {
    logger.error("customAuth: signIn failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: "Sign in failed. Please try again." };
  }
}

// ── Social OAuth Sign In ────────────────────────────────────────────────────

type ExternalOAuthProvider = "google" | "auth0";

async function signInWithExternalOAuthProfile(
  provider: ExternalOAuthProvider,
  profile: {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string | null;
    tenantId?: number | null;
  },
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult> {
  const emailLower = profile.email.toLowerCase().trim();
  if (!profile.sub || !emailLower) {
    return {
      success: false,
      error: `${provider === "google" ? "Google" : "Auth0"} profile is missing required fields`,
    };
  }
  if (!profile.emailVerified) {
    return {
      success: false,
      error: `${provider === "google" ? "Google" : "Auth0"} account email is not verified`,
    };
  }

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const providerOpenId = `${provider}_${createHash("sha256")
      .update(profile.sub)
      .digest("hex")
      .slice(0, 32)}`;
    const displayName =
      profile.name?.trim() || emailLower.split("@")[0] || "UnifyOne User";

    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          or(eq(users.openId, providerOpenId), eq(users.email, emailLower)),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    let userId = existingUser?.id;
    let openId = existingUser?.openId ?? providerOpenId;
    let username = existingUser?.username ?? null;
    let sessionName = displayName;
    const isNewUser = !existingUser;

    if (existingUser) {
      if (
        profile.tenantId &&
        existingUser.tenantId &&
        existingUser.tenantId !== profile.tenantId
      ) {
        return {
          success: false,
          error: `This ${provider === "google" ? "Google" : "Auth0"} account belongs to a different workspace.`,
        };
      }

      sessionName = existingUser.name || displayName;

      await db
        .update(users)
        .set({
          name: sessionName,
          email: existingUser.email || emailLower,
          emailVerified: true,
          loginMethod: provider,
          lastSignedIn: new Date(),
          tenantId: existingUser.tenantId ?? profile.tenantId ?? null,
        })
        .where(eq(users.id, existingUser.id));
    } else {
      const [insertedUser] = await db
        .insert(users)
        .values({
          openId: providerOpenId,
          email: emailLower,
          name: displayName,
          passwordHash: null,
          loginMethod: provider,
          emailVerified: true,
          role: "user",
          tenantId: profile.tenantId ?? null,
        })
        .returning({ id: users.id });

      userId = insertedUser?.id;
      openId = providerOpenId;
      username = null;
    }

    const sessionToken = await sdk.createSessionToken(openId, {
      name: sessionName,
      email: emailLower,
      loginMethod: provider,
      expiresInMs: ACCESS_TOKEN_LIFETIME_MS,
    });

    const refreshToken = userId
      ? (await issueRefreshToken(userId, opts).catch(() => null))?.rawToken
      : undefined;

    return {
      success: true,
      sessionToken,
      refreshToken,
      isNewUser,
      user: {
        openId,
        email: emailLower,
        name: sessionName,
        username,
        emailVerified: true,
      },
    };
  } catch (err: unknown) {
    logger.error(`customAuth: ${provider} sign-in failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: `${provider === "google" ? "Google" : "Auth0"} sign-in failed. Please try again.`,
    };
  }
}

export async function signInWithGoogleProfile(
  profile: {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string | null;
    tenantId?: number | null;
  },
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult> {
  return signInWithExternalOAuthProfile("google", profile, opts);
}

export async function signInWithAuth0Profile(
  profile: {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string | null;
    tenantId?: number | null;
  },
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult> {
  return signInWithExternalOAuthProfile("auth0", profile, opts);
}

// ── Build Cookie Header ──────────────────────────────────────────────────────

export function buildSessionCookie(
  sessionToken: string,
  secure: boolean,
  domain?: string
): string {
  const flags = [
    `${COOKIE_NAME}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(ACCESS_TOKEN_LIFETIME_MS / 1000)}`,
  ];
  if (secure) flags.push("Secure");
  if (domain) flags.push(`Domain=${domain}`);
  return flags.join("; ");
}

export function buildRefreshCookie(
  rawToken: string,
  secure: boolean,
  domain?: string
): string {
  const flags = [
    `${REFRESH_COOKIE_NAME}=${rawToken}`,
    "Path=/api/auth/refresh",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(REFRESH_TOKEN_LIFETIME_MS / 1000)}`,
  ];
  if (secure) flags.push("Secure");
  if (domain) flags.push(`Domain=${domain}`);
  return flags.join("; ");
}

export function buildLogoutCookie(secure: boolean, domain?: string): string {
  const flags = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) flags.push("Secure");
  if (domain) flags.push(`Domain=${domain}`);
  return flags.join("; ");
}

export function buildRefreshLogoutCookie(
  secure: boolean,
  domain?: string
): string {
  const flags = [
    `${REFRESH_COOKIE_NAME}=`,
    "Path=/api/auth/refresh",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (secure) flags.push("Secure");
  if (domain) flags.push(`Domain=${domain}`);
  return flags.join("; ");
}

// ── Refresh Token Helpers ────────────────────────────────────────────────────

/** Raw token length in bytes → 32 bytes = 64 hex chars */
const REFRESH_TOKEN_BYTES = 32;

/**
 * Hash a raw refresh token for storage.
 *
 * We store only the SHA-256 digest — the raw token is never persisted.
 * This means a database compromise reveals hashes that cannot be reversed
 * into usable tokens (assuming the attacker doesn't have pre-images).
 * Lookup is O(1) via the unique index on tokenHash.
 */
function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issue a new refresh token for a user.
 * Stores the hash in the `refresh_tokens` table and returns the raw token
 * (which the caller embeds in the HttpOnly cookie — never stored server-side).
 */
export async function issueRefreshToken(
  userId: number,
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ rawToken: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // Prune expired tokens for this user to keep the table lean.
  // Fire-and-forget — cleanup failure is non-critical (tokens expire naturally
  // via expiresAt) and we don't want to block the login path. Errors here
  // are expected to be rare (transient DB hiccup), so log at warn level only.
  db.delete(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        lt(refreshTokens.expiresAt, new Date())
      )
    )
    .catch(err =>
      logger.warn("refreshTokens: cleanup failed", { error: String(err) })
    );

  const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
  });

  return { rawToken };
}

/**
 * Validate a raw refresh token, rotate it (revoke old, issue new), and
 * return a fresh access JWT + new raw refresh token.
 *
 * Returns null when the token is invalid, expired, or already revoked.
 */
export async function rotateRefreshToken(
  rawToken: string,
  opts: { ipAddress?: string; userAgent?: string } = {}
): Promise<AuthResult & { newRefreshToken?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const tokenHash = hashRefreshToken(rawToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    return { success: false, error: "Invalid refresh token" };
  }

  if (stored.revokedAt) {
    return { success: false, error: "Refresh token has been revoked" };
  }

  if (new Date() > stored.expiresAt) {
    return { success: false, error: "Refresh token has expired" };
  }

  // Revoke the used token immediately (rotation — prevent replay)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));

  // Load the user
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, stored.userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    return { success: false, error: "User not found or deleted" };
  }

  // Issue new access JWT
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.email?.split("@")[0] || "User",
    email: user.email,
    loginMethod: user.loginMethod ?? "password",
    expiresInMs: ACCESS_TOKEN_LIFETIME_MS,
  });

  // Issue new refresh token (rotation)
  const newRefreshResult = await issueRefreshToken(user.id, opts);

  return {
    success: true,
    sessionToken,
    newRefreshToken: newRefreshResult?.rawToken,
    user: {
      openId: user.openId,
      email: user.email || "",
      name: user.name || user.email?.split("@")[0] || "User",
      username: user.username,
    },
  };
}

// ── Clerk Fallback (when CLERK_SECRET_KEY is set) ────────────────────────────

export async function verifyClerkSession(
  sessionToken: string
): Promise<AuthResult> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    return { success: false, error: "Clerk is not configured" };
  }

  try {
    const { createClerkClient, verifyToken } = await import("@clerk/backend");

    // Verify the session token (JWT) using @clerk/backend
    const payload = await verifyToken(sessionToken, {
      secretKey: clerkSecretKey,
    });
    const userId = payload.sub;

    // Fetch user details using the typed Clerk client
    const clerk = createClerkClient({ secretKey: clerkSecretKey });
    const clerkUser = await clerk.users.getUser(userId);

    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.local`;
    const name =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      email.split("@")[0];

    // Create or update local user
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const openId = `clerk_${userId}`;

    await db
      .insert(users)
      .values({
        openId,
        email,
        name,
        loginMethod: "clerk",
        emailVerified: true,
        role: "user",
      })
      .onConflictDoUpdate({
        target: users.openId,
        set: { lastSignedIn: new Date(), loginMethod: "clerk" },
      });

    const appSessionToken = await sdk.createSessionToken(openId, {
      name,
      email,
      loginMethod: "clerk",
    });

    return {
      success: true,
      sessionToken: appSessionToken,
      user: { openId, email, name },
    };
  } catch (err: unknown) {
    logger.error("customAuth: Clerk verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: "Clerk authentication failed" };
  }
}

// ── Email Sending Helper ─────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("customAuth: RESEND_API_KEY not set, email send skipped");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "UnifyOne <hello@1commerce.online>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (result.error) {
      logger.error("customAuth: Resend API error", {
        error: result.error.message,
      });
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    logger.error("customAuth: email send exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: "Failed to send email" };
  }
}

// ── Email Verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const token = randomBytes(32).toString("hex");

  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  await db
    .update(users)
    .set({ emailVerificationToken: token })
    .where(eq(users.openId, userId));

  const appUrl = getAppUrl();
  const link = `${appUrl}/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Verify your UnifyOne email address",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0f1e;color:#f0e8d0;border-radius:8px;">
        <h2 style="color:#00d9ff;margin-top:0;">Verify your email</h2>
        <p>Thanks for signing up for UnifyOne. Please verify your email address by clicking the button below.</p>
        <p style="margin:32px 0;">
          <a href="${link}" style="background:#00d9ff;color:#020202;padding:12px 28px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#6b7280;">Or copy and paste this URL into your browser:<br>${link}</p>
      </div>
    `,
  });
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "Token is required" };

  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const result = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  const user = result[0];
  if (!user) return { success: false, error: "Invalid or expired token" };

  // Idempotent: a verification link is commonly hit more than once (mail-client
  // link prefetch/scan, a preview-then-tap, or the SPA remounting). The token
  // is the security boundary, so re-confirming an already-verified account is a
  // no-op success rather than an error. We intentionally do NOT null the token
  // here, so repeat hits keep resolving to the same user and succeed; the
  // `emailVerified` flag is what gates access.
  if (!user.emailVerified) {
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.openId, user.openId));
  }

  return { success: true };
}

// ── Password Reset ───────────────────────────────────────────────────────────

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const emailLower = email.toLowerCase().trim();

  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, emailLower))
    .limit(1);

  // Always return success to avoid email enumeration.
  if (!result[0]) {
    return { success: true };
  }
  // OAuth account (no password): send a helpful "use your provider" email
  // instead of a silent dead-end, while keeping the response uniform.
  if (!result[0].passwordHash) {
    const oauthUser = result[0];
    const providerLabel =
      oauthUser.loginMethod && oauthUser.loginMethod !== "password"
        ? oauthUser.loginMethod.charAt(0).toUpperCase() +
          oauthUser.loginMethod.slice(1)
        : "a social login";
    const loginUrl = `${getAppUrl()}/login`;
    await sendEmail({
      to: emailLower,
      subject: "Signing in to UnifyOne",
      html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0f1e;color:#f0e8d0;border-radius:8px;">
        <h2 style="color:#00d9ff;margin-top:0;">Use ${providerLabel} to sign in</h2>
        <p>We received a password reset request for your UnifyOne account, but this account was created with ${providerLabel} and has no password set.</p>
        <p style="margin:32px 0;">
          <a href="${loginUrl}" style="background:#00d9ff;color:#020202;padding:12px 28px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Sign in</a>
        </p>
        <p style="font-size:12px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    }).catch(err =>
      logger.warn("customAuth: OAuth reset-guidance email failed", {
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return { success: true };
  }

  const user = result[0];
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  await db
    .update(users)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(users.openId, user.openId));

  const appUrl = getAppUrl();
  const link = `${appUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: emailLower,
    subject: "Reset your UnifyOne password",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0f1e;color:#f0e8d0;border-radius:8px;">
        <h2 style="color:#00d9ff;margin-top:0;">Reset your password</h2>
        <p>We received a request to reset the password for your UnifyOne account. Click the button below to choose a new password.</p>
        <p style="margin:32px 0;">
          <a href="${link}" style="background:#00d9ff;color:#020202;padding:12px 28px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#6b7280;">Or copy and paste this URL into your browser:<br>${link}</p>
      </div>
    `,
  });

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "Token is required" };
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const result = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, token))
    .limit(1);

  const user = result[0];
  if (!user) return { success: false, error: "Invalid or expired token" };

  // Check expiry
  if (
    !user.passwordResetExpiresAt ||
    new Date() > user.passwordResetExpiresAt
  ) {
    return {
      success: false,
      error: "Reset link has expired. Please request a new one.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  // Stamp passwordChangedAt so the SDK rejects any JWT issued before this moment.
  const passwordChangedAt = new Date();

  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      passwordChangedAt,
    })
    .where(eq(users.openId, user.openId));

  return { success: true };
}

// ── Firebase Fallback (when FIREBASE_PROJECT_ID is set) ──────────────────────

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<AuthResult> {
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebaseApiKey = process.env.FIREBASE_API_KEY;

  if (!firebaseProjectId || !firebaseApiKey) {
    return { success: false, error: "Firebase is not configured" };
  }

  try {
    // Verify Firebase ID token using Google's tokeninfo endpoint
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      return { success: false, error: "Invalid Firebase token" };
    }

    const data = await response.json();
    const firebaseUser = data.users?.[0];

    if (!firebaseUser) {
      return { success: false, error: "Firebase user not found" };
    }

    const email =
      firebaseUser.email || `${firebaseUser.localId}@firebase.local`;
    const name = firebaseUser.displayName || email.split("@")[0];
    const openId = `firebase_${firebaseUser.localId}`;

    // Create or update local user
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    await db
      .insert(users)
      .values({
        openId,
        email,
        name,
        loginMethod: "firebase",
        emailVerified: firebaseUser.emailVerified ?? false,
        role: "user",
      })
      .onConflictDoUpdate({
        target: users.openId,
        set: { lastSignedIn: new Date(), loginMethod: "firebase" },
      });

    const sessionToken = await sdk.createSessionToken(openId, {
      name,
      email,
      loginMethod: "firebase",
    });

    return {
      success: true,
      sessionToken,
      user: { openId, email, name },
    };
  } catch (err: unknown) {
    logger.error("customAuth: Firebase verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: "Firebase authentication failed" };
  }
}
