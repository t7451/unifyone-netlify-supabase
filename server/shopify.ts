import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "./db";
import {
  shopifyStores,
  shopifySyncLog,
  shopifyOauthStates,
  webhookEvents,
  users,
} from "../drizzle/schema";
import {
  verifyOAuthCallbackHmac,
  verifyWebhookHmac,
  isValidShopDomain,
} from "./_core/shopifyHmac";
import { encryptToken } from "./_core/shopifyTokenCrypto";
import { sdk } from "./_core/sdk";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const REQUIRED_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
  "read_fulfillments",
  "write_fulfillments",
].join(",");
const STATE_TTL_MS = 10 * 60 * 1000;

const MANDATORY_TOPICS = new Set([
  "app/uninstalled",
  "customers/data_request",
  "customers/redact",
  "shop/redact",
]);

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

async function storeOauthState(params: {
  state: string;
  shop: string;
  userId: number | null;
  tenantId: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(shopifyOauthStates).values({
    state: params.state,
    shop: params.shop,
    userId: params.userId,
    tenantId: params.tenantId,
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });
}

async function consumeOauthState(
  state: string,
  shop: string
): Promise<{ userId: number | null; tenantId: number | null } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(shopifyOauthStates)
    .where(
      and(
        eq(shopifyOauthStates.state, state),
        eq(shopifyOauthStates.shop, shop),
        gt(shopifyOauthStates.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!rows.length) return null;
  await db
    .delete(shopifyOauthStates)
    .where(eq(shopifyOauthStates.state, state));
  return { userId: rows[0].userId, tenantId: rows[0].tenantId };
}

async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!r.ok) throw new Error(`Token exchange failed: ${await r.text()}`);
  return (await r.json()) as { access_token: string; scope: string };
}

async function fetchShopProfile(shop: string, accessToken: string) {
  try {
    const r = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (!r.ok) return null;
    const json = (await r.json()) as {
      shop: {
        name: string;
        email: string;
        currency: string;
        plan_name: string;
      };
    };
    return json.shop;
  } catch {
    return null;
  }
}

async function upsertStore(params: {
  shopDomain: string;
  accessToken: string;
  scopes: string;
  shopProfile: {
    name: string;
    email: string;
    currency: string;
    plan_name: string;
  } | null;
  userId: number;
  tenantId: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const enc = encryptToken(params.accessToken);
  const existing = await db
    .select()
    .from(shopifyStores)
    .where(eq(shopifyStores.shopDomain, params.shopDomain))
    .limit(1);

  const baseFields = {
    accessToken: null,
    accessTokenEnc: enc.ciphertext,
    tokenCipherVersion: enc.version,
    scopes: params.scopes,
    shopName: params.shopProfile?.name,
    shopEmail: params.shopProfile?.email,
    shopCurrency: params.shopProfile?.currency ?? "USD",
    shopPlan: params.shopProfile?.plan_name,
    status: "active" as const,
  };

  if (existing.length > 0) {
    await db
      .update(shopifyStores)
      .set({
        ...baseFields,
        // Re-bind ownership only if row was an unbound (userId=0) placeholder.
        userId: existing[0].userId === 0 ? params.userId : existing[0].userId,
        tenantId: existing[0].tenantId ?? params.tenantId,
      })
      .where(eq(shopifyStores.shopDomain, params.shopDomain));
  } else {
    await db.insert(shopifyStores).values({
      userId: params.userId,
      tenantId: params.tenantId,
      shopDomain: params.shopDomain,
      ...baseFields,
    });
  }
}

function normalizePayloadForWebhookEvent(
  payload: unknown
): Record<string, unknown> | undefined {
  if (payload === undefined) return undefined;
  if (payload && typeof payload === "object" && !Array.isArray(payload))
    return payload as Record<string, unknown>;
  return { value: payload };
}

export async function logSyncEvent(params: {
  storeId: number;
  tenantId?: number;
  event: string;
  entity:
    | "product"
    | "order"
    | "customer"
    | "inventory"
    | "fulfillment"
    | "webhook";
  entityId?: string;
  direction?: "inbound" | "outbound";
  status: "success" | "failed" | "skipped" | "retrying";
  latencyMs?: number;
  errorMsg?: string;
  retryCount?: number;
  payload?: unknown;
  headers?: Record<string, string | string[]>;
  rawBody?: string;
  shopDomain?: string;
  receivedAt?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    const payload = normalizePayloadForWebhookEvent(params.payload);
    const webhookStatus =
      params.status === "success"
        ? "processed"
        : params.status === "failed"
          ? "failed"
          : params.status === "skipped"
            ? "skipped"
            : "pending";

    await db.insert(webhookEvents).values({
      tenantId: params.tenantId,
      source: "shopify",
      eventType: params.event,
      payload: {
        ...payload,
        shopDomain: params.shopDomain,
        entity: params.entity,
        entityId: params.entityId,
        direction: params.direction ?? "inbound",
        storeId: params.storeId,
        retryCount: params.retryCount ?? 0,
        headers: params.headers,
        rawBody: params.rawBody,
        receivedAt: params.receivedAt ?? new Date().toISOString(),
      },
      status: webhookStatus,
      error: params.errorMsg,
      processedAt: webhookStatus === "pending" ? undefined : new Date(),
    });

    await db.insert(shopifySyncLog).values({
      storeId: params.storeId,
      tenantId: params.tenantId,
      event: params.event,
      entity: params.entity,
      entityId: params.entityId,
      direction: params.direction ?? "inbound",
      status: params.status,
      latencyMs: params.latencyMs,
      errorMsg: params.errorMsg,
      retryCount: params.retryCount ?? 0,
      payload: params.payload as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[ShopifySync] Failed to log sync event:", err);
  }
}

async function applyMandatorySideEffects(
  topic: string,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (topic === "app/uninstalled") {
    await db
      .update(shopifyStores)
      .set({ status: "uninstalled" })
      .where(eq(shopifyStores.shopDomain, shopDomain));
    return;
  }
  // GDPR redacts: we don't persist customer PII directly; ACK + audit log is correct.
  void payload;
}

const ENTITY_MAP: Record<
  string,
  "product" | "order" | "customer" | "inventory" | "fulfillment" | "webhook"
> = {
  "products/create": "product",
  "products/update": "product",
  "products/delete": "product",
  "orders/create": "order",
  "orders/updated": "order",
  "orders/cancelled": "order",
  "orders/paid": "order",
  "orders/fulfilled": "order",
  "customers/create": "customer",
  "customers/update": "customer",
  "customers/delete": "customer",
  "customers/data_request": "customer",
  "customers/redact": "customer",
  "shop/redact": "webhook",
  "app/uninstalled": "webhook",
  "inventory_levels/update": "inventory",
  "fulfillments/create": "fulfillment",
  "fulfillments/update": "fulfillment",
};

export function registerShopifyRoutes(app: Express) {
  app.get(
    "/api/shopify/install",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const shop = ((req.query.shop as string) || "").trim().toLowerCase();
      if (!isValidShopDomain(shop))
        return res.status(400).json({
          error: "Invalid shop domain. Must end in .myshopify.com",
        });
      if (!SHOPIFY_API_KEY)
        return res
          .status(500)
          .json({ error: "SHOPIFY_API_KEY not configured" });
      const me = await resolveUserFromCookieHeader(req.headers.cookie ?? null);
      if (!me)
        return res
          .status(401)
          .json({ error: "Sign in before connecting a Shopify store" });

      const state = crypto.randomBytes(16).toString("hex");
      try {
        await storeOauthState({
          state,
          shop,
          userId: me.id,
          tenantId: me.tenantId,
        });
      } catch (e) {
        console.error("[Shopify OAuth] storeOauthState failed:", e);
        return res.status(500).json({ error: "Failed to initiate install" });
      }

      const redirectUri = `${req.protocol}://${req.get("host")}/api/shopify/callback`;
      const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${encodeURIComponent(REQUIRED_SCOPES)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

      res.cookie("shopify_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: STATE_TTL_MS,
      });
      return res.redirect(installUrl);
    }
  );

  app.get(
    "/api/shopify/callback",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const query = req.query as Record<string, string>;
      const shop = (query.shop || "").toLowerCase();
      const code = query.code || "";
      const state = query.state || "";

      if (!isValidShopDomain(shop))
        return res.status(400).send("Invalid shop domain");
      if (!verifyOAuthCallbackHmac(query))
        return res.status(403).send("Invalid HMAC signature");

      const consumed = await consumeOauthState(state, shop);
      if (!consumed)
        return res
          .status(403)
          .send("State mismatch or expired — possible CSRF");
      let userId = consumed.userId ?? 0;
      let tenantId = consumed.tenantId;
      if (!userId) {
        const fallback = await resolveUserFromCookieHeader(
          req.headers.cookie ?? null
        );
        if (!fallback)
          return res.status(401).send("Sign in to complete Shopify install");
        userId = fallback.id;
        tenantId = fallback.tenantId;
      }
      if (!shop || !code) return res.status(400).send("Missing shop or code");

      try {
        const tokenData = await exchangeCodeForToken(shop, code);
        const shopProfile = await fetchShopProfile(
          shop,
          tokenData.access_token
        );
        await upsertStore({
          shopDomain: shop,
          accessToken: tokenData.access_token,
          scopes: tokenData.scope,
          shopProfile,
          userId,
          tenantId,
        });
        res.clearCookie("shopify_oauth_state");
        return res.redirect(
          `/shopify/success?shop=${encodeURIComponent(shop)}`
        );
      } catch (err) {
        console.error("[Shopify OAuth] Callback error:", err);
        return res.status(500).send("OAuth callback failed");
      }
    }
  );

  app.post(
    "/api/shopify/webhook",
    express.raw({ type: "application/json" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      const startTime = Date.now();
      const rawBuffer = req.body as Buffer;
      const rawBody = rawBuffer.toString();
      const hmacHeader = (req.headers["x-shopify-hmac-sha256"] as string) || "";
      const topic = (req.headers["x-shopify-topic"] as string) || "";
      const shopDomain = (req.headers["x-shopify-shop-domain"] as string) || "";

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        /* keep {} */
      }

      const headers: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) headers[k] = v as string | string[];
      }

      const db = await getDb();
      let storeId = 0;
      let tenantId: number | undefined;
      if (db && shopDomain) {
        const stores = await db
          .select({ id: shopifyStores.id, tenantId: shopifyStores.tenantId })
          .from(shopifyStores)
          .where(eq(shopifyStores.shopDomain, shopDomain))
          .limit(1);
        if (stores.length) {
          storeId = stores[0].id;
          tenantId = stores[0].tenantId ?? undefined;
        }
      }

      if (!verifyWebhookHmac(rawBuffer, hmacHeader)) {
        await logSyncEvent({
          storeId,
          tenantId,
          event: topic || "webhook/unknown",
          entity: "webhook",
          entityId: (payload.id as string | number | undefined)?.toString(),
          direction: "inbound",
          status: "failed",
          latencyMs: Date.now() - startTime,
          errorMsg: "Invalid Shopify webhook signature",
          payload: { topic, shopDomain, id: payload.id, payload },
          headers,
          rawBody,
          shopDomain,
        });
        return res.status(401).send("Unauthorized");
      }

      const entity = ENTITY_MAP[topic] ?? "webhook";
      const entityId = (payload.id as string | number | undefined)?.toString();

      if (MANDATORY_TOPICS.has(topic)) {
        try {
          await applyMandatorySideEffects(topic, shopDomain, payload);
        } catch (e) {
          console.error(
            `[Shopify Webhook] mandatory side-effect failed (${topic}):`,
            e
          );
        }
      }

      await logSyncEvent({
        storeId,
        tenantId,
        event: topic,
        entity,
        entityId,
        direction: "inbound",
        status: "success",
        latencyMs: Date.now() - startTime,
        payload: { topic, shopDomain, id: payload.id, payload },
        headers,
        rawBody,
        shopDomain,
      });

      console.log(`[Shopify Webhook] ${topic} from ${shopDomain}`);
      return res.status(200).send("OK");
    }
  );
}

export async function registerShopifyFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/shopify/webhook" && req.method === "POST") {
    const startTime = Date.now();
    const rawBytes = new Uint8Array(await req.arrayBuffer());
    const rawBuffer = Buffer.from(rawBytes);
    const rawBody = rawBuffer.toString("utf-8");
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      /* keep {} */
    }

    const headersRecord: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headersRecord[k] = v;
    });

    const db = await getDb();
    let storeId = 0;
    let tenantId: number | undefined;
    if (db && shopDomain) {
      const stores = await db
        .select({ id: shopifyStores.id, tenantId: shopifyStores.tenantId })
        .from(shopifyStores)
        .where(eq(shopifyStores.shopDomain, shopDomain))
        .limit(1);
      if (stores.length) {
        storeId = stores[0].id;
        tenantId = stores[0].tenantId ?? undefined;
      }
    }

    if (!verifyWebhookHmac(rawBuffer, hmacHeader)) {
      await logSyncEvent({
        storeId,
        tenantId,
        event: topic || "webhook/unknown",
        entity: "webhook",
        entityId: (payload.id as string | number | undefined)?.toString(),
        direction: "inbound",
        status: "failed",
        latencyMs: Date.now() - startTime,
        errorMsg: "Invalid Shopify webhook signature",
        payload: { topic, shopDomain, id: payload.id, payload },
        headers: headersRecord,
        rawBody,
        shopDomain,
      });
      return new Response("Unauthorized", { status: 401 });
    }

    const entity = ENTITY_MAP[topic] ?? "webhook";
    const entityId = (payload.id as string | number | undefined)?.toString();

    if (MANDATORY_TOPICS.has(topic)) {
      try {
        await applyMandatorySideEffects(topic, shopDomain, payload);
      } catch (e) {
        console.error(
          `[Shopify Webhook] mandatory side-effect failed (${topic}):`,
          e
        );
      }
    }

    await logSyncEvent({
      storeId,
      tenantId,
      event: topic,
      entity,
      entityId,
      direction: "inbound",
      status: "success",
      latencyMs: Date.now() - startTime,
      payload: { topic, shopDomain, id: payload.id, payload },
      headers: headersRecord,
      rawBody,
      shopDomain,
    });
    return new Response("OK", { status: 200 });
  }

  if (path === "/api/shopify/install" && req.method === "GET") {
    const shop = (url.searchParams.get("shop") || "").trim().toLowerCase();
    if (!isValidShopDomain(shop))
      return Response.json(
        { error: "Invalid shop domain. Must end in .myshopify.com" },
        { status: 400 }
      );
    if (!SHOPIFY_API_KEY)
      return Response.json(
        { error: "SHOPIFY_API_KEY not configured" },
        { status: 500 }
      );
    const me = await resolveUserFromCookieHeader(req.headers.get("cookie"));
    if (!me)
      return Response.json(
        { error: "Sign in before connecting a Shopify store" },
        { status: 401 }
      );

    const state = crypto.randomBytes(16).toString("hex");
    try {
      await storeOauthState({
        state,
        shop,
        userId: me.id,
        tenantId: me.tenantId,
      });
    } catch (e) {
      console.error("[Shopify OAuth] storeOauthState failed:", e);
      return Response.json(
        { error: "Failed to initiate install" },
        { status: 500 }
      );
    }

    const redirectUri = `${url.origin}/api/shopify/callback`;
    const installUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${SHOPIFY_API_KEY}` +
      `&scope=${encodeURIComponent(REQUIRED_SCOPES)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;

    const res = new Response(null, {
      status: 302,
      headers: { Location: installUrl },
    });
    res.headers.append(
      "Set-Cookie",
      `shopify_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
        STATE_TTL_MS / 1000
      )}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    return res;
  }

  if (path === "/api/shopify/callback" && req.method === "GET") {
    const shop = (url.searchParams.get("shop") || "").toLowerCase();
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";

    if (!isValidShopDomain(shop))
      return new Response("Invalid shop domain", { status: 400 });

    const queryEntries: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      queryEntries[k] = v;
    });
    if (!verifyOAuthCallbackHmac(queryEntries))
      return new Response("Invalid HMAC signature", { status: 403 });

    const consumed = await consumeOauthState(state, shop);
    if (!consumed)
      return new Response("State mismatch or expired — possible CSRF", {
        status: 403,
      });

    let userId = consumed.userId ?? 0;
    let tenantId = consumed.tenantId;
    if (!userId) {
      const fallback = await resolveUserFromCookieHeader(
        req.headers.get("cookie")
      );
      if (!fallback)
        return new Response("Sign in to complete Shopify install", {
          status: 401,
        });
      userId = fallback.id;
      tenantId = fallback.tenantId;
    }
    if (!shop || !code)
      return new Response("Missing shop or code", { status: 400 });

    try {
      const tokenData = await exchangeCodeForToken(shop, code);
      const shopProfile = await fetchShopProfile(shop, tokenData.access_token);
      await upsertStore({
        shopDomain: shop,
        accessToken: tokenData.access_token,
        scopes: tokenData.scope,
        shopProfile,
        userId,
        tenantId,
      });
      const res = new Response(null, {
        status: 302,
        headers: {
          Location: `/shopify/success?shop=${encodeURIComponent(shop)}`,
        },
      });
      res.headers.append(
        "Set-Cookie",
        "shopify_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );
      return res;
    } catch (err) {
      console.error("[Shopify OAuth] Callback error:", err);
      return new Response("OAuth callback failed", { status: 500 });
    }
  }

  return null;
}

// Legacy compat — remove after callsites grepped clean
export { verifyWebhookHmac as validateShopifyWebhook } from "./_core/shopifyHmac";
