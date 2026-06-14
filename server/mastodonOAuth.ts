/**
 * Mastodon per-instance OAuth connect.
 *
 * Mastodon has no central app: each instance issues its own client credentials.
 * Flow:
 *   1. /api/social/mastodon/start?instance=… — register an app on the instance
 *      (POST /api/v1/apps), persist a pending state row (client secret encrypted),
 *      redirect the browser to the instance's /oauth/authorize.
 *   2. /api/social/mastodon/callback?code=&state= — verify the state, exchange the
 *      code for an access token (/oauth/token), read the account
 *      (/api/v1/accounts/verify_credentials), and store the connection.
 *
 * Implemented for BOTH route surfaces (Express for local/Docker, Fetch for
 * Netlify), mirroring the Shopify OAuth integration. The HTTP helpers are pure
 * and unit-tested; the route wiring needs a live instance to verify end-to-end.
 */
import {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "./db";
import { socialOauthStates, users } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { encryptToken, decryptToken } from "./_core/socialTokenCrypto";
import { storeConnection } from "./lib/socialAccountStore";

const STATE_TTL_MS = 10 * 60 * 1000;
const SCOPES = "read write";
const STATE_COOKIE = "social_oauth_state";
const APP_NAME = "UnifyOne";
const SUCCESS_REDIRECT = "/social?connected=mastodon";

// ── Pure HTTP helpers (unit-tested) ─────────────────────────────────────────

/** Normalize user input to an https origin, or null if invalid. */
export function normalizeInstanceUrl(input: string): string | null {
  let v = (input || "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export async function registerMastodonApp(
  instance: string,
  redirectUri: string
): Promise<{ clientId: string; clientSecret: string }> {
  const res = await fetch(`${instance}/api/v1/apps`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: APP_NAME,
      redirect_uris: redirectUri,
      scopes: SCOPES,
    }),
  });
  if (!res.ok) {
    throw new Error(`Mastodon app registration failed: ${res.status}`);
  }
  const d = (await res.json()) as {
    client_id?: string;
    client_secret?: string;
  };
  if (!d.client_id || !d.client_secret) {
    throw new Error("Mastodon app registration returned no credentials");
  }
  return { clientId: d.client_id, clientSecret: d.client_secret };
}

export function buildMastodonAuthorizeUrl(args: {
  instance: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  return (
    `${args.instance}/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(args.clientId)}` +
    `&redirect_uri=${encodeURIComponent(args.redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(args.state)}`
  );
}

export async function exchangeMastodonCode(args: {
  instance: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  const res = await fetch(`${args.instance}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
      scope: SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Mastodon token exchange failed: ${res.status}`);
  const d = (await res.json()) as { access_token?: string };
  if (!d.access_token) throw new Error("Mastodon token exchange: no token");
  return d.access_token;
}

export async function verifyMastodonCredentials(
  instance: string,
  accessToken: string
): Promise<{
  id: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
}> {
  const res = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Mastodon verify_credentials failed: ${res.status}`);
  }
  const d = (await res.json()) as {
    id?: string | number;
    username?: string;
    acct?: string;
    display_name?: string;
    avatar?: string;
  };
  const host = new URL(instance).host;
  const handle = d.username ? `@${d.username}@${host}` : (d.acct ?? "");
  return {
    id: String(d.id ?? ""),
    handle,
    displayName: d.display_name ?? null,
    avatar: d.avatar ?? null,
  };
}

// ── State persistence ───────────────────────────────────────────────────────

async function storeState(params: {
  state: string;
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userId: number | null;
  tenantId: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(socialOauthStates).values({
    state: params.state,
    platform: "mastodon",
    instanceUrl: params.instanceUrl,
    clientId: params.clientId,
    clientSecret: encryptToken(params.clientSecret).ciphertext,
    redirectUri: params.redirectUri,
    userId: params.userId,
    tenantId: params.tenantId,
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });
}

async function consumeState(state: string): Promise<{
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userId: number | null;
  tenantId: number | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(socialOauthStates)
    .where(
      and(
        eq(socialOauthStates.state, state),
        gt(socialOauthStates.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!rows.length) return null;
  await db.delete(socialOauthStates).where(eq(socialOauthStates.state, state));
  const row = rows[0];
  return {
    instanceUrl: row.instanceUrl,
    clientId: row.clientId,
    clientSecret: decryptToken(row.clientSecret),
    redirectUri: row.redirectUri,
    userId: row.userId,
    tenantId: row.tenantId,
  };
}

async function resolveUserFromCookieHeader(
  cookieHeader: string | null
): Promise<{ id: number; tenantId: number | null } | null> {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const session = await sdk.verifySession(decodeURIComponent(m[1]));
  if (!session?.openId) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.openId, session.openId))
    .limit(1);
  return rows[0] ?? null;
}

/** Shared callback logic: exchange code, read account, store connection. */
async function completeConnection(args: {
  consumed: NonNullable<Awaited<ReturnType<typeof consumeState>>>;
  code: string;
  tenantId: number | null;
}): Promise<void> {
  const { consumed, code } = args;
  const accessToken = await exchangeMastodonCode({
    instance: consumed.instanceUrl,
    clientId: consumed.clientId,
    clientSecret: consumed.clientSecret,
    code,
    redirectUri: consumed.redirectUri,
  });
  const profile = await verifyMastodonCredentials(
    consumed.instanceUrl,
    accessToken
  );
  if (!args.tenantId) throw new Error("No tenant for Mastodon connection");
  await storeConnection(args.tenantId, "mastodon", {
    accessToken,
    instanceUrl: consumed.instanceUrl,
    handle: profile.handle,
    displayName: profile.displayName,
    platformUserId: profile.id,
    profileImageUrl: profile.avatar,
    scopes: SCOPES.split(" "),
  });
}

function stateCookie(value: string, maxAgeSec: number): string {
  return (
    `${STATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}` +
    (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
}

// ── Express routes (local / Docker) ─────────────────────────────────────────

export function registerMastodonRoutes(app: Express) {
  app.get(
    "/api/social/mastodon/start",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const instance = normalizeInstanceUrl(
        (req.query.instance as string) || ""
      );
      if (!instance) return res.status(400).send("Invalid Mastodon instance");

      const me = await resolveUserFromCookieHeader(req.headers.cookie ?? null);
      if (!me) return res.status(401).send("Sign in before connecting");
      if (!me.tenantId) return res.status(403).send("No active tenant");

      const redirectUri = `${req.protocol}://${req.get("host")}/api/social/mastodon/callback`;
      try {
        const { clientId, clientSecret } = await registerMastodonApp(
          instance,
          redirectUri
        );
        const state = crypto.randomBytes(16).toString("hex");
        await storeState({
          state,
          instanceUrl: instance,
          clientId,
          clientSecret,
          redirectUri,
          userId: me.id,
          tenantId: me.tenantId,
        });
        res.cookie(STATE_COOKIE, state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: STATE_TTL_MS,
        });
        return res.redirect(
          buildMastodonAuthorizeUrl({ instance, clientId, redirectUri, state })
        );
      } catch (e) {
        console.error("[Mastodon OAuth] start failed:", e);
        return res.status(502).send("Could not start Mastodon connect");
      }
    }
  );

  app.get(
    "/api/social/mastodon/callback",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const code = (req.query.code as string) || "";
      const state = (req.query.state as string) || "";
      const cookieState = (req.headers.cookie ?? "").match(
        new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`)
      )?.[1];
      if (!code || !state || !cookieState || cookieState !== state) {
        return res
          .status(403)
          .send("State mismatch or expired — possible CSRF");
      }

      const consumed = await consumeState(state);
      if (!consumed) return res.status(403).send("State expired");

      let tenantId = consumed.tenantId;
      if (!tenantId) {
        const fallback = await resolveUserFromCookieHeader(
          req.headers.cookie ?? null
        );
        tenantId = fallback?.tenantId ?? null;
      }

      try {
        await completeConnection({ consumed, code, tenantId });
        res.clearCookie(STATE_COOKIE);
        return res.redirect(SUCCESS_REDIRECT);
      } catch (e) {
        console.error("[Mastodon OAuth] callback failed:", e);
        return res.redirect("/social?error=mastodon");
      }
    }
  );
}

// ── Fetch routes (Netlify) ──────────────────────────────────────────────────

export async function registerMastodonFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/social/mastodon/start" && req.method === "GET") {
    const instance = normalizeInstanceUrl(
      url.searchParams.get("instance") || ""
    );
    if (!instance)
      return new Response("Invalid Mastodon instance", { status: 400 });

    const me = await resolveUserFromCookieHeader(req.headers.get("cookie"));
    if (!me) return new Response("Sign in before connecting", { status: 401 });
    if (!me.tenantId) return new Response("No active tenant", { status: 403 });

    const redirectUri = `${url.origin}/api/social/mastodon/callback`;
    try {
      const { clientId, clientSecret } = await registerMastodonApp(
        instance,
        redirectUri
      );
      const state = crypto.randomBytes(16).toString("hex");
      await storeState({
        state,
        instanceUrl: instance,
        clientId,
        clientSecret,
        redirectUri,
        userId: me.id,
        tenantId: me.tenantId,
      });
      const res = new Response(null, {
        status: 302,
        headers: {
          Location: buildMastodonAuthorizeUrl({
            instance,
            clientId,
            redirectUri,
            state,
          }),
        },
      });
      res.headers.append(
        "Set-Cookie",
        stateCookie(state, Math.floor(STATE_TTL_MS / 1000))
      );
      return res;
    } catch (e) {
      console.error("[Mastodon OAuth] start failed:", e);
      return new Response("Could not start Mastodon connect", { status: 502 });
    }
  }

  if (path === "/api/social/mastodon/callback" && req.method === "GET") {
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const cookieState = (req.headers.get("cookie") ?? "").match(
      new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`)
    )?.[1];
    if (!code || !state || !cookieState || cookieState !== state) {
      return new Response("State mismatch or expired — possible CSRF", {
        status: 403,
      });
    }

    const consumed = await consumeState(state);
    if (!consumed) return new Response("State expired", { status: 403 });

    let tenantId = consumed.tenantId;
    if (!tenantId) {
      const fallback = await resolveUserFromCookieHeader(
        req.headers.get("cookie")
      );
      tenantId = fallback?.tenantId ?? null;
    }

    try {
      await completeConnection({ consumed, code, tenantId });
      const res = new Response(null, {
        status: 302,
        headers: { Location: SUCCESS_REDIRECT },
      });
      res.headers.append("Set-Cookie", stateCookie("", 0));
      return res;
    } catch (e) {
      console.error("[Mastodon OAuth] callback failed:", e);
      return new Response(null, {
        status: 302,
        headers: { Location: "/social?error=mastodon" },
      });
    }
  }

  return null;
}
