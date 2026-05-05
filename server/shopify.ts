import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import crypto from "crypto";
import { getDb } from "./db";
import {
  shopifyStores,
  shopifySyncLog,
  webhookEvents,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Shopify OAuth Config ─────────────────────────────────────────────────────
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

// ─── HMAC Validation ──────────────────────────────────────────────────────────
function validateHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  if (!hmac || !SHOPIFY_API_SECRET) return false;
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join("&");
  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");
  const digestBuffer = Buffer.from(digest, "hex");
  const hmacBuffer = Buffer.from(hmac, "hex");
  if (digestBuffer.length !== hmacBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, hmacBuffer);
}

// ─── Validate Webhook Signature ───────────────────────────────────────────────
/**
 * Validates Shopify webhook signature using HMAC-SHA256.
 * IMPORTANT: Returns false if SHOPIFY_API_SECRET is not configured, which will
 * reject all webhooks. This is intentional - webhooks should not be accepted
 * if signature verification is not possible.
 */
export function validateShopifyWebhook(
  rawBody: Buffer,
  hmacHeader: string
): boolean {
  if (!SHOPIFY_API_SECRET) {
    console.error(
      "[Shopify] SHOPIFY_API_SECRET not configured - webhook rejected"
    );
    return false;
  }
  if (!hmacHeader) {
    console.warn("[Shopify] Webhook missing x-shopify-hmac-sha256 header");
    return false;
  }

  try {
    const digest = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(rawBody)
      .digest("base64");

    // Both values must be base64-decoded for safe comparison
    const digestBuffer = Buffer.from(digest, "base64");
    const hmacBuffer = Buffer.from(hmacHeader, "base64");

    // timingSafeEqual requires buffers of equal length
    if (digestBuffer.length !== hmacBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuffer, hmacBuffer);
  } catch (err) {
    console.error("[Shopify] Webhook validation error:", err);
    return false;
  }
}

// ─── Log Sync Event Helper ────────────────────────────────────────────────────
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

// ─── Register Shopify OAuth Routes ───────────────────────────────────────────
export function registerShopifyRoutes(app: Express) {
  // ── Step 1: Initiate OAuth (/api/shopify/install) ──────────────────────────
  app.get(
    "/api/shopify/install",
    (req: ExpressRequest, res: ExpressResponse) => {
      const shop = ((req.query.shop as string) || "").trim().toLowerCase();
      if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
        return res
          .status(400)
          .json({ error: "Invalid shop domain. Must end in .myshopify.com" });
      }
      if (!SHOPIFY_API_KEY) {
        return res
          .status(500)
          .json({ error: "SHOPIFY_API_KEY not configured" });
      }
      const state = crypto.randomBytes(16).toString("hex");
      const redirectUri = `${req.protocol}://${req.get("host")}/api/shopify/callback`;
      const installUrl =
        `https://${shop}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${encodeURIComponent(REQUIRED_SCOPES)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;
      // Store state in a short-lived cookie for CSRF protection
      res.cookie("shopify_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000, // 10 minutes
      });
      return res.redirect(installUrl);
    }
  );

  // ── Step 2: OAuth Callback (/api/shopify/callback) ─────────────────────────
  app.get(
    "/api/shopify/callback",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const {
        shop,
        code,
        state,
        hmac: _hmac,
      } = req.query as Record<string, string>;

      // CSRF check
      const storedState = req.cookies?.shopify_oauth_state;
      if (!state || state !== storedState) {
        return res.status(403).send("State mismatch — possible CSRF attack");
      }

      // HMAC validation
      if (!validateHmac(req.query as Record<string, string>)) {
        return res.status(403).send("Invalid HMAC signature");
      }

      if (!shop || !code) {
        return res.status(400).send("Missing shop or code");
      }

      try {
        // ── Exchange code for access token ──────────────────────────────────────
        const tokenRes = await fetch(
          `https://${shop}/admin/oauth/access_token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: SHOPIFY_API_KEY,
              client_secret: SHOPIFY_API_SECRET,
              code,
            }),
          }
        );

        if (!tokenRes.ok) {
          const err = await tokenRes.text();
          console.error("[Shopify OAuth] Token exchange failed:", err);
          return res.status(500).send("Token exchange failed");
        }

        const tokenData = (await tokenRes.json()) as {
          access_token: string;
          scope: string;
        };

        // ── Fetch shop details ──────────────────────────────────────────────────
        const shopRes = await fetch(
          `https://${shop}/admin/api/2024-01/shop.json`,
          {
            headers: { "X-Shopify-Access-Token": tokenData.access_token },
          }
        );
        const shopData = shopRes.ok
          ? (
              (await shopRes.json()) as {
                shop: {
                  name: string;
                  email: string;
                  currency: string;
                  plan_name: string;
                };
              }
            ).shop
          : null;

        // ── Upsert store record ─────────────────────────────────────────────────
        const db = await getDb();
        if (!db) {
          return res.status(500).send("Database unavailable");
        }

        const existing = await db
          .select()
          .from(shopifyStores)
          .where(eq(shopifyStores.shopDomain, shop))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(shopifyStores)
            .set({
              accessToken: tokenData.access_token,
              scopes: tokenData.scope,
              shopName: shopData?.name,
              shopEmail: shopData?.email,
              shopCurrency: shopData?.currency ?? "USD",
              shopPlan: shopData?.plan_name,
              status: "active",
            })
            .where(eq(shopifyStores.shopDomain, shop));
        } else {
          // userId will be set to 0 for now — the user can link it from the dashboard
          await db.insert(shopifyStores).values({
            userId: 0,
            shopDomain: shop,
            accessToken: tokenData.access_token,
            scopes: tokenData.scope,
            shopName: shopData?.name,
            shopEmail: shopData?.email,
            shopCurrency: shopData?.currency ?? "USD",
            shopPlan: shopData?.plan_name,
            status: "active",
          });
        }

        // Clear CSRF cookie
        res.clearCookie("shopify_oauth_state");

        // Redirect to success page
        return res.redirect(
          `/shopify/success?shop=${encodeURIComponent(shop)}`
        );
      } catch (err) {
        console.error("[Shopify OAuth] Callback error:", err);
        return res.status(500).send("OAuth callback failed");
      }
    }
  );

  // ── Shopify Webhook Receiver (/api/shopify/webhook) ────────────────────────
  app.post(
    "/api/shopify/webhook",
    express.raw({ type: "application/json" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      const startTime = Date.now();
      const rawBody = (req.body as Buffer).toString();
      const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
      const topic = req.headers["x-shopify-topic"] as string;
      const shopDomain = req.headers["x-shopify-shop-domain"] as string;
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // non-JSON payload
      }

      // Find the store
      const db = await getDb();
      let storeId = 0;
      let tenantId: number | undefined;
      if (db && shopDomain) {
        const stores = await db
          .select({ id: shopifyStores.id, tenantId: shopifyStores.tenantId })
          .from(shopifyStores)
          .where(eq(shopifyStores.shopDomain, shopDomain))
          .limit(1);
        if (stores.length > 0) {
          storeId = stores[0].id;
          tenantId = stores[0].tenantId ?? undefined;
        }
      }

      const webhookPayload = {
        topic,
        shopDomain,
        id: payload.id,
        payload,
      };
      const headers = Object.fromEntries(
        Object.entries(req.headers).flatMap(([key, value]) =>
          value === undefined ? [] : [[key, value]]
        )
      );

      if (!validateShopifyWebhook(req.body as Buffer, hmacHeader)) {
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
          payload: webhookPayload,
          headers,
          rawBody,
          shopDomain,
        });
        return res.status(401).send("Unauthorized");
      }

      // Determine entity type from topic
      const entityMap: Record<
        string,
        | "product"
        | "order"
        | "customer"
        | "inventory"
        | "fulfillment"
        | "webhook"
      > = {
        "products/create": "product",
        "products/update": "product",
        "products/delete": "product",
        "orders/create": "order",
        "orders/updated": "order",
        "orders/cancelled": "order",
        "orders/fulfilled": "order",
        "customers/create": "customer",
        "customers/update": "customer",
        "customers/delete": "customer",
        "inventory_levels/update": "inventory",
        "fulfillments/create": "fulfillment",
        "fulfillments/update": "fulfillment",
      };
      const entity = entityMap[topic] ?? "webhook";
      const entityId = (payload.id as string | number | undefined)?.toString();

      await logSyncEvent({
        storeId,
        tenantId,
        event: topic,
        entity,
        entityId,
        direction: "inbound",
        status: "success",
        latencyMs: Date.now() - startTime,
        payload: webhookPayload,
        headers,
        rawBody,
        shopDomain,
      });

      console.log(`[Shopify Webhook] ${topic} from ${shopDomain}`);
      return res.status(200).send("OK");
    }
  );
}

function normalizePayloadForWebhookEvent(
  payload: unknown
): Record<string, unknown> | undefined {
  if (payload === undefined) {
    return undefined;
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return { value: payload };
}

// ─── Register Shopify Fetch Routes (Netlify production) ──────────────────────
// Parallels registerPayPalFetchRoutes / registerSquareFetchRoutes. The Express
// version (registerShopifyRoutes) only runs in local dev; Netlify Functions
// dispatch through server/_core/nonTrpcRoutes.ts, which calls this Fetch
// handler. Returning null falls through to tRPC.
export async function registerShopifyFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  // ── POST /api/shopify/webhook ─────────────────────────────────────────────
  if (path === "/api/shopify/webhook" && req.method === "POST") {
    const startTime = Date.now();
    const rawBytes = new Uint8Array(await req.arrayBuffer());
    const rawBuffer = Buffer.from(rawBytes);
    const rawBody = rawBuffer.toString("utf-8");
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";
    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      // non-JSON payload — leave as {}
    }

    // Resolve store + tenant from shopDomain
    const db = await getDb();
    let storeId = 0;
    let tenantId: number | undefined;
    if (db && shopDomain) {
      const stores = await db
        .select({ id: shopifyStores.id, tenantId: shopifyStores.tenantId })
        .from(shopifyStores)
        .where(eq(shopifyStores.shopDomain, shopDomain))
        .limit(1);
      if (stores.length > 0) {
        storeId = stores[0].id;
        tenantId = stores[0].tenantId ?? undefined;
      }
    }

    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key] = value;
    });

    const webhookPayload = {
      topic,
      shopDomain,
      id: payload.id,
      payload,
    };

    if (!validateShopifyWebhook(rawBuffer, hmacHeader)) {
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
        payload: webhookPayload,
        headers: headersRecord,
        rawBody,
        shopDomain,
      });
      return new Response("Unauthorized", { status: 401 });
    }

    const entityMap: Record<
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
      "inventory_levels/update": "inventory",
      "fulfillments/create": "fulfillment",
      "fulfillments/update": "fulfillment",
    };
    const entity = entityMap[topic] ?? "webhook";
    const entityId = (payload.id as string | number | undefined)?.toString();

    await logSyncEvent({
      storeId,
      tenantId,
      event: topic,
      entity,
      entityId,
      direction: "inbound",
      status: "success",
      latencyMs: Date.now() - startTime,
      payload: webhookPayload,
      headers: headersRecord,
      rawBody,
      shopDomain,
    });

    console.log(`[Shopify Webhook] ${topic} from ${shopDomain}`);
    return new Response("OK", { status: 200 });
  }

  // ── GET /api/shopify/install ──────────────────────────────────────────────
  if (path === "/api/shopify/install" && req.method === "GET") {
    const shop = (url.searchParams.get("shop") || "").trim().toLowerCase();
    if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      return Response.json(
        { error: "Invalid shop domain. Must end in .myshopify.com" },
        { status: 400 }
      );
    }
    if (!SHOPIFY_API_KEY) {
      return Response.json(
        { error: "SHOPIFY_API_KEY not configured" },
        { status: 500 }
      );
    }
    const state = crypto.randomBytes(16).toString("hex");
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
      `shopify_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return res;
  }

  // ── GET /api/shopify/callback ─────────────────────────────────────────────
  if (path === "/api/shopify/callback" && req.method === "GET") {
    const shop = url.searchParams.get("shop") || "";
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";

    // CSRF check (state cookie)
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)shopify_oauth_state=([^;]+)/);
    const storedState = m ? decodeURIComponent(m[1]) : null;
    if (!state || state !== storedState) {
      return new Response("State mismatch — possible CSRF attack", {
        status: 403,
      });
    }

    // HMAC validation across query
    const queryEntries: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      queryEntries[k] = v;
    });
    if (!validateHmac(queryEntries)) {
      return new Response("Invalid HMAC signature", { status: 403 });
    }

    if (!shop || !code) {
      return new Response("Missing shop or code", { status: 400 });
    }

    try {
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[Shopify OAuth] Token exchange failed:", err);
        return new Response("Token exchange failed", { status: 500 });
      }
      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        scope: string;
      };

      const shopRes = await fetch(
        `https://${shop}/admin/api/2024-01/shop.json`,
        {
          headers: { "X-Shopify-Access-Token": tokenData.access_token },
        }
      );
      const shopData = shopRes.ok
        ? (
            (await shopRes.json()) as {
              shop: {
                name: string;
                email: string;
                currency: string;
                plan_name: string;
              };
            }
          ).shop
        : null;

      const db = await getDb();
      if (!db) {
        return new Response("Database unavailable", { status: 500 });
      }

      const existing = await db
        .select()
        .from(shopifyStores)
        .where(eq(shopifyStores.shopDomain, shop))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(shopifyStores)
          .set({
            accessToken: tokenData.access_token,
            scopes: tokenData.scope,
            shopName: shopData?.name,
            shopEmail: shopData?.email,
            shopCurrency: shopData?.currency ?? "USD",
            shopPlan: shopData?.plan_name,
            status: "active",
          })
          .where(eq(shopifyStores.shopDomain, shop));
      } else {
        await db.insert(shopifyStores).values({
          userId: 0,
          shopDomain: shop,
          accessToken: tokenData.access_token,
          scopes: tokenData.scope,
          shopName: shopData?.name,
          shopEmail: shopData?.email,
          shopCurrency: shopData?.currency ?? "USD",
          shopPlan: shopData?.plan_name,
          status: "active",
        });
      }

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

  // Unhandled — fall through to tRPC
  return null;
}
