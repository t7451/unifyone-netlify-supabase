import { TRPCError } from "@trpc/server";
import { getStripe } from "../../_core/stripeClient";
import { signClipsDownloadToken } from "../../clipsToolkit";

/**
 * Use-case layer for the clips-toolkit instant-delivery product. Holds the
 * Stripe checkout / download-token logic and the origin allow-listing; the
 * transport (rate-limited procedures + zod) stays in index.ts. The token
 * crypto (signClipsDownloadToken) is unchanged — only relocated calls.
 */

export const CLIPS_PRODUCT_NAME = "1Commerce Gen AI Research Toolkit";
export const CLIPS_PRODUCT_DESCRIPTION =
  "Funding analysis of 41 generative AI video startups (2022–2025, $10.1B raised).";
/** Price in USD cents. Override with CLIPS_TOOLKIT_PRICE_CENTS env var. */
export const CLIPS_DEFAULT_PRICE_CENTS = 4900; // $49.00

export function getPriceCents(): number {
  const raw = process.env.CLIPS_TOOLKIT_PRICE_CENTS;
  if (!raw) return CLIPS_DEFAULT_PRICE_CENTS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return CLIPS_DEFAULT_PRICE_CENTS;
  }
  return parsed;
}

/**
 * Allow-list of origins the Checkout success/cancel URLs may point back to.
 * We never reflect an arbitrary client-supplied origin into Stripe — that would
 * let an attacker turn this endpoint into an open redirect.
 *
 * `localhost` is only permitted outside production so local dev still works.
 */
const PRODUCTION_ORIGIN_HOSTS = new Set([
  "clips.1commerce.online",
  "1commerce.online",
  "www.1commerce.online",
]);
const DEV_ONLY_ORIGIN_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isOriginAllowed(hostname: string): boolean {
  if (PRODUCTION_ORIGIN_HOSTS.has(hostname)) return true;
  if (
    process.env.NODE_ENV !== "production" &&
    DEV_ONLY_ORIGIN_HOSTS.has(hostname)
  ) {
    return true;
  }
  return false;
}

function normalizeOrigin(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid origin" });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid origin" });
  }
  if (!isOriginAllowed(parsed.hostname)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Origin not allowed for clips toolkit checkout",
    });
  }

  const isDevOnlyHost = DEV_ONLY_ORIGIN_HOSTS.has(parsed.hostname);
  const isProduction = process.env.NODE_ENV === "production";

  if (parsed.protocol === "http:" && (isProduction || !isDevOnlyHost)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "HTTPS origin required for clips toolkit checkout",
    });
  }

  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Returns metadata for the marketing page (price + product copy).
 */
export function getProduct() {
  return {
    name: CLIPS_PRODUCT_NAME,
    description: CLIPS_PRODUCT_DESCRIPTION,
    priceCents: getPriceCents(),
    currency: "usd" as const,
    metrics: {
      companies: 41,
      fundingUsd: 10_100_000_000,
      startYear: 2022,
      endYear: 2025,
    },
  };
}

/**
 * Creates a one-time Stripe Checkout Session for the toolkit and returns
 * the hosted-checkout URL the browser should redirect to.
 */
export async function createCheckout(input: {
  origin: string;
  email?: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Stripe is not configured",
    });
  }
  const baseUrl = normalizeOrigin(input.origin);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    customer_email: input.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: getPriceCents(),
          product_data: {
            name: CLIPS_PRODUCT_NAME,
            description: CLIPS_PRODUCT_DESCRIPTION,
          },
        },
      },
    ],
    metadata: {
      product: "clips-toolkit",
    },
    payment_intent_data: {
      metadata: { product: "clips-toolkit" },
    },
    success_url: `${baseUrl}/clips/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/clips?checkout=cancelled`,
  });

  if (!session.url) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe did not return a checkout URL",
    });
  }
  return { url: session.url, sessionId: session.id };
}

/**
 * Verifies a Stripe Checkout session is paid and returns a short-lived
 * download URL the buyer can hit immediately.
 */
export async function getDownload(input: { sessionId: string }) {
  const stripe = getStripe();
  if (!stripe) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Stripe is not configured",
    });
  }
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(input.sessionId);
  } catch {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Checkout session not found",
    });
  }
  if (session.payment_status !== "paid") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Payment not completed for this session",
    });
  }
  if (session.metadata?.product !== "clips-toolkit") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Session is not for the clips toolkit",
    });
  }

  const email =
    session.customer_details?.email ?? session.customer_email ?? null;
  const token = await signClipsDownloadToken({
    sub: session.id,
    email,
  });
  return {
    downloadUrl: `/api/clips-toolkit/download?token=${encodeURIComponent(token)}`,
    email,
    filename: "1Commerce_GenAI_Video_Startups_Funding_Analysis.xlsx",
  };
}
