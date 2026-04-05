import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  email?: string | null;
  loginMethod?: string | null;
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
  ): Promise<SessionPayload | null> {
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
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
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

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
