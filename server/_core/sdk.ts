import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { createHash, randomBytes } from "crypto";
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

type OAuthUserInfo = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

export type OAuthStartState = {
  nonce: string;
  returnTo: string;
  codeVerifier: string;
};

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const stateStore = new Map<
  string,
  { value: OAuthStartState; expiresAt: number }
>();

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomUrlSafe(size = 32) {
  return base64Url(randomBytes(size));
}

function now() {
  return Date.now();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function normalizeReturnTo(returnTo: string | undefined): string {
  if (!returnTo || !returnTo.startsWith("/")) return "/dashboard";
  if (returnTo.startsWith("//")) return "/dashboard";
  return returnTo;
}

function buildRedirectUri(req: Request): string {
  const host = req.get("host");
  if (!host) {
    throw new Error("Missing host header for OAuth callback");
  }
  const protoHeader = req.header("x-forwarded-proto");
  const proto = protoHeader?.split(",")[0]?.trim() || req.protocol || "https";
  return `${proto}://${host}/api/oauth/callback`;
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

  private putState(stateKey: string, value: OAuthStartState) {
    stateStore.set(stateKey, { value, expiresAt: now() + OAUTH_STATE_TTL_MS });
  }

  private takeState(stateKey: string): OAuthStartState | null {
    const entry = stateStore.get(stateKey);
    stateStore.delete(stateKey);
    if (!entry) return null;
    if (entry.expiresAt < now()) return null;
    return entry.value;
  }

  private pruneStateStore() {
    const t = now();
    stateStore.forEach((entry, key) => {
      if (entry.expiresAt < t) stateStore.delete(key);
    });
  }

  private async exchangeCodeForToken(args: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) {
    if (!ENV.oauthTokenUrl || !ENV.oauthClientId) {
      throw new Error("OAuth token endpoint config missing");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
      client_id: ENV.oauthClientId,
      code_verifier: args.codeVerifier,
    });

    if (ENV.oauthClientSecret) {
      body.set("client_secret", ENV.oauthClientSecret);
    }

    const response = await axios.post(ENV.oauthTokenUrl, body.toString(), {
      timeout: AXIOS_TIMEOUT_MS,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = response.data?.access_token;
    if (!isNonEmptyString(accessToken)) {
      throw new Error("Token response missing access_token");
    }

    return { accessToken };
  }

  private async fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    if (!ENV.oauthUserInfoUrl) {
      throw new Error("OAuth userinfo endpoint is not configured");
    }

    const response = await axios.get(ENV.oauthUserInfoUrl, {
      timeout: AXIOS_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = response.data as OAuthUserInfo;
    if (!isNonEmptyString(data?.sub)) {
      throw new Error("userinfo response missing sub");
    }
    return data;
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
        appId: ENV.appId || ENV.oauthClientId || "unifyone",
        name: options.name || "",
        email: options.email ?? null,
        loginMethod: options.loginMethod ?? "oauth",
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
      loginMethod: payload.loginMethod ?? "oauth",
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
        loginMethod: typeof loginMethod === "string" ? loginMethod : "oauth",
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
        loginMethod: session.loginMethod ?? "oauth",
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

  createOAuthStartUrl(req: Request, returnTo: string | undefined): string {
    this.pruneStateStore();
    if (!ENV.oauthAuthorizeUrl || !ENV.oauthClientId) {
      throw new Error("OAuth authorize endpoint config missing");
    }

    const codeVerifier = randomUrlSafe(64);
    const codeChallenge = base64Url(
      createHash("sha256").update(codeVerifier).digest()
    );
    const nonce = randomUrlSafe(24);
    const state = randomUrlSafe(24);
    const redirectUri = buildRedirectUri(req);

    this.putState(state, {
      nonce,
      returnTo: normalizeReturnTo(returnTo),
      codeVerifier,
    });

    const url = new URL(ENV.oauthAuthorizeUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", ENV.oauthClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", ENV.oauthScope);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return url.toString();
  }

  async completeOAuthCallback(args: {
    req: Request;
    code: string;
    state: string;
  }) {
    const statePayload = this.takeState(args.state);
    if (!statePayload) {
      throw new Error("OAuth state is invalid or expired");
    }

    const redirectUri = buildRedirectUri(args.req);
    const token = await this.exchangeCodeForToken({
      code: args.code,
      codeVerifier: statePayload.codeVerifier,
      redirectUri,
    });
    const userInfo = await this.fetchUserInfo(token.accessToken);

    const openId = userInfo.sub;
    const name =
      userInfo.name ||
      userInfo.preferred_username ||
      userInfo.email ||
      "UnifyOne User";
    const email = userInfo.email ?? null;
    const loginMethod = "oauth";

    await db.upsertUser({
      openId,
      name,
      email,
      loginMethod,
      lastSignedIn: new Date(),
    });

    const sessionToken = await this.createSessionToken(openId, {
      name,
      email,
      loginMethod,
      expiresInMs: ONE_YEAR_MS,
    });

    return {
      sessionToken,
      returnTo: statePayload.returnTo,
    };
  }
}

export const sdk = new SDKServer();
