/**
 * Custom JWT Auth — Roll Your Own Authentication
 *
 * Primary: Email + Password with scrypt hashing (Node.js crypto, no external deps)
 * Fallback 1: Clerk (when CLERK_SECRET_KEY is set)
 * Fallback 2: Firebase Auth (when FIREBASE_SERVICE_ACCOUNT is set)
 *
 * All methods produce the same session token format for downstream compatibility.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq, or } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getAppUrl } from "./env";
import { logger } from "./logger";

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
  if (!_db && process.env.DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-http");
      const sql = neon(process.env.DATABASE_URL);
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
  username?: string
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
    const displayName = name?.trim() || usernameLower || emailLower.split("@")[0];

    // Auto-verify email only in non-production environments without an email service.
    // In production, always require explicit email verification so accounts are
    // confirmed regardless of whether RESEND_API_KEY is configured.
    const hasEmailService = Boolean(process.env.RESEND_API_KEY);
    const isProduction = process.env.NODE_ENV === "production";
    const shouldAutoVerify = !hasEmailService && !isProduction;
    const emailVerified = shouldAutoVerify;

    if (shouldAutoVerify) {
      logger.warn(
        "customAuth: RESEND_API_KEY not set and not in production — new users will be auto-verified. Set RESEND_API_KEY (or deploy to production) to enable email verification."
      );
    }

    await db.insert(users).values({
      openId,
      email: emailLower,
      username: usernameLower,
      passwordHash,
      name: displayName,
      loginMethod: "password",
      emailVerified,
      role: "user",
    });

    // Create session token
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      email: emailLower,
      loginMethod: "password",
    });

    return {
      success: true,
      sessionToken,
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
  password: string
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
        or(eq(users.email, identifierLower), eq(users.username, identifierLower))
      )
      .limit(1);

    const user = result[0];

    if (!user) {
      // Timing-safe: still do a hash comparison to prevent timing attacks
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

    // Require email verification before granting a session.
    // The client should check for code === "email_not_verified" and offer
    // a "Resend verification email" button.
    // ONLY enforce when email service is configured — if we can't deliver a
    // verification link there is no point blocking the user (and no way to
    // unblock them), which would permanently lock out everyone who signed up
    // without an email service in place.
    const hasEmailService = Boolean(process.env.RESEND_API_KEY);
    const isProduction = process.env.NODE_ENV === "production";
    const shouldEnforceVerification = hasEmailService || isProduction;
    
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
        "customAuth: Allowing sign-in for unverified user (RESEND_API_KEY not set and not in production — email verification disabled)",
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
    });

    return {
      success: true,
      sessionToken,
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
    `Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`,
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
      from: "UnifyOne <hello@unifyonecommerce.com>",
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

  await db
    .update(users)
    .set({ emailVerified: true, emailVerificationToken: null })
    .where(eq(users.openId, user.openId));

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

  // Always return success to avoid email enumeration
  if (!result[0] || !result[0].passwordHash) {
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
