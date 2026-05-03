/**
 * server/_core/impact.ts
 *
 * Impact.com S2S (server-to-server) affiliate conversion tracking.
 *
 * Architecture
 * ────────────
 * 1. A partner sends a click to https://1commerce.online/?im_ref=AFFID_CLICKID
 * 2. Client-side capture (client/src/lib/impactCapture.ts) POSTs to
 *    /api/impact/click; that handler writes a row to impact_clicks and
 *    returns a HttpOnly `im_ref` cookie that lives 90 days.
 * 3. On `checkout.session.completed`, server/stripe.ts calls
 *    fireImpactConversion(...) below.
 * 4. fireImpactConversion is idempotent on stripe_session_id (UNIQUE
 *    constraint on impact_conversions). A replayed Stripe webhook never
 *    double-fires.
 *
 * Env vars required (added by user post-deploy, see docs/IMPACT_INTEGRATION.md):
 *   IMPACT_ACCOUNT_SID
 *   IMPACT_AUTH_TOKEN
 *   IMPACT_CAMPAIGN_ID
 *   IMPACT_API_BASE_URL  (optional; default https://api.impact.com)
 *
 * If any of the first three are unset, fireImpactConversion logs a warning
 * and returns { skipped: true } — the platform never blocks a Stripe
 * webhook because affiliate config is missing.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  impactClicks,
  impactConversions,
  type ImpactClick,
  type ImpactConversion,
} from "../../drizzle/schema";
import { errMsg } from "./errors";
import { logger } from "./logger";

// ─── Constants ───────────────────────────────────────────────────────────────

export const IMPACT_COOKIE_NAME = "im_ref";
/** 90 days in seconds — industry-standard affiliate cookie window. */
export const IMPACT_COOKIE_MAX_AGE_S = 90 * 24 * 60 * 60;

// ─── Public configuration helpers ────────────────────────────────────────────

export interface ImpactConfig {
  accountSid: string;
  authToken: string;
  campaignId: string;
  apiBaseUrl: string;
}

export function getImpactConfig(): ImpactConfig | null {
  const accountSid = process.env.IMPACT_ACCOUNT_SID || "";
  const authToken = process.env.IMPACT_AUTH_TOKEN || "";
  const campaignId = process.env.IMPACT_CAMPAIGN_ID || "";
  if (!accountSid || !authToken || !campaignId) return null;
  return {
    accountSid,
    authToken,
    campaignId,
    apiBaseUrl: process.env.IMPACT_API_BASE_URL || "https://api.impact.com",
  };
}

// ─── Click ID + IP helpers ───────────────────────────────────────────────────

export function generateClickId(): string {
  // 16 random bytes → 32 hex chars. Plenty of entropy, fits in varchar(64).
  return randomBytes(16).toString("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Pull the client IP out of a Fetch Request, honouring x-forwarded-for /
 * x-nf-client-connection-ip from Netlify's edge.
 */
export function clientIpFromRequest(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

// ─── Cookie helpers (Set-Cookie strings — Fetch Response API) ───────────────

export function buildClickCookie(
  clickId: string,
  cookieDomain?: string
): string {
  const domain = cookieDomain ? `; Domain=${cookieDomain}` : "";
  // SameSite=Lax + HttpOnly: cookie returns on top-level navigation back to
  // our domain (which is what affiliate landings look like), but is not
  // exposed to JS / cross-origin scripts.
  return `${IMPACT_COOKIE_NAME}=${encodeURIComponent(
    clickId
  )}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${IMPACT_COOKIE_MAX_AGE_S}${domain}`;
}

export function readClickCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === IMPACT_COOKIE_NAME) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=") || null;
      }
    }
  }
  return null;
}

// ─── Click recording ─────────────────────────────────────────────────────────

export interface RecordClickInput {
  imRef: string;
  landingUrl?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}

export interface RecordClickResult {
  clickId: string;
  alreadyExisted: boolean;
}

/**
 * Persist (or look up) a click row. If a click_id is supplied (e.g. the
 * caller already has one from a returning cookie), we reuse it; otherwise
 * mint a fresh one.
 */
export async function recordClick(
  db: any,
  input: RecordClickInput,
  existingClickId?: string | null
): Promise<RecordClickResult> {
  // If we already have a click_id from the cookie, see if we have its row.
  if (existingClickId) {
    const rows = (await db
      .select()
      .from(impactClicks)
      .where(eq(impactClicks.clickId, existingClickId))
      .limit(1)) as ImpactClick[];
    if (rows.length) {
      return { clickId: existingClickId, alreadyExisted: true };
    }
  }

  const clickId = existingClickId ?? generateClickId();
  await db.insert(impactClicks).values({
    clickId,
    imRef: (input.imRef || "").slice(0, 200),
    landingUrl: input.landingUrl ?? null,
    ipHash: input.ipHash ?? null,
    userAgent: input.userAgent ?? null,
    referer: input.referer ?? null,
  });
  return { clickId, alreadyExisted: false };
}

/**
 * Find the most-recent unconverted click for a given click_id (cookie value)
 * or, fallback, by user_id. Used at conversion time.
 */
export async function findClickForConversion(
  db: any,
  opts: { clickId?: string | null; userId?: number | null }
): Promise<ImpactClick | null> {
  if (opts.clickId) {
    const rows = (await db
      .select()
      .from(impactClicks)
      .where(eq(impactClicks.clickId, opts.clickId))
      .limit(1)) as ImpactClick[];
    if (rows.length) return rows[0] ?? null;
  }
  if (opts.userId) {
    const rows = (await db
      .select()
      .from(impactClicks)
      .where(
        and(
          eq(impactClicks.userId, opts.userId),
          isNull(impactClicks.convertedAt)
        )
      )
      .orderBy(desc(impactClicks.createdAt))
      .limit(1)) as ImpactClick[];
    if (rows.length) return rows[0] ?? null;
  }
  return null;
}

/**
 * Bind a click to a user once we know who they are (e.g. on signup).
 * Idempotent.
 */
export async function attachUserToClick(
  db: any,
  clickId: string,
  userId: number
): Promise<void> {
  await db
    .update(impactClicks)
    .set({ userId })
    .where(eq(impactClicks.clickId, clickId));
}

// ─── Conversion firing ───────────────────────────────────────────────────────

export interface FireConversionInput {
  stripeSessionId: string;
  amountCents: number;
  currency: string;
  clickId: string | null | undefined;
  /** Optional — if known, lets us look up the click via user when cookie is missing. */
  userId?: number | null;
  /** If true, never call Impact's API — just record the row locally. */
  dryRun?: boolean;
}

export type FireConversionResult =
  | { status: "skipped"; reason: string }
  | { status: "duplicate"; conversion: ImpactConversion }
  | {
      status: "fired";
      conversion: ImpactConversion;
      httpStatus: number;
      response: unknown;
    }
  | { status: "error"; error: string; httpStatus?: number };

/**
 * Fires a single conversion to Impact's S2S endpoint, idempotently.
 *
 * Idempotency: a UNIQUE constraint on impact_conversions.stripe_session_id
 * means a concurrent or replayed call surfaces a duplicate-key error,
 * which we trap and translate to { status: "duplicate" }.
 *
 * Retries: Impact 5xx → up to 2 retries with exponential backoff (250ms,
 * 1000ms). 4xx is not retried — it indicates a config / data problem.
 */
export async function fireImpactConversion(
  db: any,
  input: FireConversionInput
): Promise<FireConversionResult> {
  // 1. Pre-flight idempotency check (fast path before we even touch Impact)
  const existing = (await db
    .select()
    .from(impactConversions)
    .where(eq(impactConversions.stripeSessionId, input.stripeSessionId))
    .limit(1)) as ImpactConversion[];
  if (existing.length) {
    return { status: "duplicate", conversion: existing[0]! };
  }

  // 2. Resolve click — cookie click_id wins, else fall back to userId.
  let clickId = input.clickId ?? null;
  if (!clickId && input.userId) {
    const click = await findClickForConversion(db, { userId: input.userId });
    clickId = click?.clickId ?? null;
  }

  if (!clickId) {
    return {
      status: "skipped",
      reason: "no click_id (organic or non-affiliate purchase)",
    };
  }

  // 3. Pull config or skip (graceful no-op when env vars missing).
  const cfg = getImpactConfig();
  if (!cfg && !input.dryRun) {
    logger.warn("Impact conversion skipped: missing config", {
      have_sid: !!process.env.IMPACT_ACCOUNT_SID,
      have_token: !!process.env.IMPACT_AUTH_TOKEN,
      have_campaign: !!process.env.IMPACT_CAMPAIGN_ID,
      stripeSessionId: input.stripeSessionId,
      clickId,
    });
    return { status: "skipped", reason: "IMPACT_* env vars not configured" };
  }

  // 4. Call Impact (or skip when dryRun) with retries on 5xx.
  let httpStatus = 0;
  let responseBody: unknown = null;
  let success = false;
  let lastError = "";

  if (cfg && !input.dryRun) {
    const url = `${cfg.apiBaseUrl}/Mediapartners/${encodeURIComponent(
      cfg.accountSid
    )}/Conversions`;
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
      "base64"
    );
    // Impact's Conversions endpoint accepts application/x-www-form-urlencoded.
    const params = new URLSearchParams({
      CampaignId: cfg.campaignId,
      EventTypeCode: "ONLINE_SALE",
      EventDate: new Date().toISOString(),
      ClickId: clickId,
      OrderId: input.stripeSessionId,
      CustomerId: input.userId ? String(input.userId) : "",
      OrderPromoCode: "",
      Amount: (input.amountCents / 100).toFixed(2),
      Currency: (input.currency || "USD").toUpperCase(),
      ItemCategory: "subscription",
      ItemSku: input.stripeSessionId,
      ItemSubTotal: (input.amountCents / 100).toFixed(2),
      ItemQuantity: "1",
    });

    const delays = [0, 250, 1000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]) await sleep(delays[attempt]!);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: params.toString(),
        });
        httpStatus = res.status;
        try {
          const ct = res.headers.get("content-type") || "";
          responseBody = ct.includes("application/json")
            ? await res.json()
            : { text: await res.text() };
        } catch {
          responseBody = null;
        }
        if (res.ok) {
          success = true;
          break;
        }
        // 4xx — don't retry.
        if (res.status >= 400 && res.status < 500) {
          lastError = `Impact ${res.status}`;
          break;
        }
        lastError = `Impact ${res.status}`;
      } catch (e: unknown) {
        lastError = errMsg(e);
        // network errors are retried up to delays.length times
      }
    }
  } else if (input.dryRun) {
    success = true;
    httpStatus = 0;
    responseBody = { dryRun: true };
  }

  // 5. Persist conversion. Trap UNIQUE-violation on stripe_session_id as a
  //    duplicate (race condition with a parallel webhook).
  try {
    const inserted = (await db
      .insert(impactConversions)
      .values({
        clickId,
        stripeSessionId: input.stripeSessionId,
        amountCents: input.amountCents,
        currency: (input.currency || "USD").toUpperCase().slice(0, 3),
        impactResponse: (responseBody as Record<string, unknown>) ?? null,
        httpStatus: httpStatus || null,
        success,
      })
      .returning()) as ImpactConversion[];

    // 6. Mark the click as converted, idempotently.
    await db
      .update(impactClicks)
      .set({ convertedAt: new Date() })
      .where(
        and(eq(impactClicks.clickId, clickId), isNull(impactClicks.convertedAt))
      );

    if (success) {
      logger.info("Impact conversion fired", {
        clickId,
        stripeSessionId: input.stripeSessionId,
        amountCents: input.amountCents,
        httpStatus,
      });
      return {
        status: "fired",
        conversion: inserted[0]!,
        httpStatus,
        response: responseBody,
      };
    }
    logger.error("Impact conversion failed (recorded for retry)", {
      clickId,
      stripeSessionId: input.stripeSessionId,
      httpStatus,
      lastError,
    });
    return {
      status: "error",
      error: lastError || `HTTP ${httpStatus}`,
      httpStatus,
    };
  } catch (e: unknown) {
    const msg = errMsg(e);
    if (/duplicate key|unique constraint|UNIQUE/i.test(msg)) {
      const dup = (await db
        .select()
        .from(impactConversions)
        .where(eq(impactConversions.stripeSessionId, input.stripeSessionId))
        .limit(1)) as ImpactConversion[];
      if (dup.length) return { status: "duplicate", conversion: dup[0]! };
    }
    logger.error("Impact conversion DB persist failed", {
      stripeSessionId: input.stripeSessionId,
      error: msg,
    });
    return { status: "error", error: msg };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
