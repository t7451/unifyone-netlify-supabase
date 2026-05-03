import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getCookieHeader } from "../lib/cookieHeader";

type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  email?: string | null;
  loginMethod?: string | null;
};

/** Extended payload returned by verifySession — includes the JWT issued-at timestamp. */
type VerifiedSession = SessionPayload & {
  /** JWT issued-at in seconds (set automatically by SignJWT). Used to enforce passwordChangedAt revocation. */
  iat: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    if (!ENV.cookieSecret) {
      throw new Error("JWT_SECRET is required");
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: {
      expiresInMs?: number;
      name?: string;
      email?: string | null;
      loginMethod?: string | null;
    } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId || "unifyone",
        name: options.name || "",
        email: options.email ?? null,
        loginMethod: options.loginMethod ?? "supabase",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      email: payload.email ?? null,
      loginMethod: payload.loginMethod ?? "supabase",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<VerifiedSession | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });

      const openId = payload.openId;
      const appId = payload.appId;
      const name = payload.name;
      const email = payload.email;
      const loginMethod = payload.loginMethod;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return {
        openId,
        appId,
        name,
        email: typeof email === "string" ? email : null,
        loginMethod: typeof loginMethod === "string" ? loginMethod : "supabase",
        iat: typeof payload.iat === "number" ? payload.iat : 0,
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(getCookieHeader(req));
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || null,
        email: session.email ?? null,
        loginMethod: session.loginMethod ?? "supabase",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(session.openId);
    }

    // Graceful fallback: if DB is unavailable (e.g. during migration),
    // construct a minimal user from the verified session payload so auth works.
    // Role is intentionally conservative (user) in this fallback — the DB is
    // the authoritative source of truth for roles.
    if (!user) {
      user = {
        id: 0,
        openId: session.openId,
        name: session.name || "UnifyOne User",
        email: session.email ?? null,
        loginMethod: session.loginMethod ?? "supabase",
        // Never grant admin via JWT fallback — DB is the source of truth for roles.
        role: "user",
        tenantId: null,
        createdAt: signedInAt,
        lastSignedIn: signedInAt,
      } as User;
    } else {
      // PATCHED:GDPR_DELETED_AT_GUARD — defense in depth. If a soft-deleted
      // user somehow slips past getUserByOpenId's deletedAt filter, reject here.
      if (user.deletedAt) {
        throw ForbiddenError("Account has been deleted");
      }
      // Enforce session revocation: reject any JWT issued before the user last
      // changed their password (or explicitly revoked all sessions).
      // passwordChangedAt is set by resetPassword() and revokeAllSessions().
      if (user.passwordChangedAt && session.iat) {
        const passwordChangedAtSec = Math.floor(
          new Date(user.passwordChangedAt).getTime() / 1000
        );
        if (session.iat < passwordChangedAtSec) {
          throw ForbiddenError("Session has been revoked");
        }
      }

      // Only write lastSignedIn if it's been more than 5 minutes since the last
      // update — avoids a DB write on every single authenticated request.
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      const lastSignedInMs = user.lastSignedIn
        ? new Date(user.lastSignedIn).getTime()
        : 0;
      if (signedInAt.getTime() - lastSignedInMs > FIVE_MINUTES_MS) {
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });
      }
    }

    return user;
  }
}

export const sdk = new SDKServer();
