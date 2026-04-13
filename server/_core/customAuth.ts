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
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const scryptAsync = promisify(scrypt);

// ── Password Hashing (scrypt) ────────────────────────────────────────────────

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

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

let _db: any = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-http");
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[customAuth] Database connection failed:", error);
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
  sessionToken?: string;
  user?: {
    openId: string;
    email: string;
    name: string;
  };
};

// ── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const emailLower = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { success: false, error: "Invalid email format" };
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

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const openId = generateOpenId();
    const displayName = name?.trim() || emailLower.split("@")[0];

    await db.insert(users).values({
      openId,
      email: emailLower,
      passwordHash,
      name: displayName,
      loginMethod: "password",
      emailVerified: false,
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
      user: { openId, email: emailLower, name: displayName },
    };
  } catch (err: any) {
    console.error("[customAuth] signUp error:", err);
    return {
      success: false,
      error: "Failed to create account. Please try again.",
    };
  }
}

// ── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database unavailable" };
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1);

    const user = result[0];

    if (!user) {
      // Timing-safe: still do a hash comparison to prevent timing attacks
      await hashPassword(password);
      return { success: false, error: "Invalid email or password" };
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
      return { success: false, error: "Invalid email or password" };
    }

    // Update last signed in
    await db
      .update(users)
      .set({ lastSignedIn: new Date(), loginMethod: "password" })
      .where(eq(users.openId, user.openId));

    // Create session token
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || emailLower.split("@")[0],
      email: emailLower,
      loginMethod: "password",
    });

    return {
      success: true,
      sessionToken,
      user: {
        openId: user.openId,
        email: emailLower,
        name: user.name || emailLower.split("@")[0],
      },
    };
  } catch (err: any) {
    console.error("[customAuth] signIn error:", err);
    return { success: false, error: "Sign in failed. Please try again." };
  }
}

// ── Build Cookie Header ──────────────────────────────────────────────────────

export function buildSessionCookie(
  sessionToken: string,
  secure: boolean
): string {
  const flags = [
    `${COOKIE_NAME}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`,
  ];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export function buildLogoutCookie(secure: boolean): string {
  const flags = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) flags.push("Secure");
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
    // Verify Clerk session token
    const response = await fetch("https://api.clerk.com/v1/sessions/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: sessionToken }),
    });

    if (!response.ok) {
      return { success: false, error: "Invalid Clerk session" };
    }

    const session = await response.json();
    const userId = session.user_id;

    // Fetch user details
    const userResponse = await fetch(
      `https://api.clerk.com/v1/users/${userId}`,
      {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      }
    );

    if (!userResponse.ok) {
      return { success: false, error: "Failed to fetch Clerk user" };
    }

    const clerkUser = await userResponse.json();
    const email =
      clerkUser.email_addresses?.[0]?.email_address || `${userId}@clerk.local`;
    const name =
      `${clerkUser.first_name || ""} ${clerkUser.last_name || ""}`.trim() ||
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
  } catch (err: any) {
    console.error("[customAuth] Clerk verification error:", err);
    return { success: false, error: "Clerk authentication failed" };
  }
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
  } catch (err: any) {
    console.error("[customAuth] Firebase verification error:", err);
    return { success: false, error: "Firebase authentication failed" };
  }
}
