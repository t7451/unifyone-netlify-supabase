/**
 * server/_core/ngrok.ts
 *
 * Optional ngrok tunnel for exposing the local UnifyOne dev server to the
 * public internet. Useful for:
 *   - Testing third-party webhooks (Stripe, Shopify, PayPal, n8n) against
 *     a local server without deploying.
 *   - Letting Kai's MCP worker (or other external services) reach a local
 *     UnifyOne instance.
 *
 * Activation: set NGROK_ENABLED=true in .env. Requires NGROK_AUTHTOKEN.
 * Optional: NGROK_DOMAIN (reserved domain), NGROK_REGION (us|eu|ap|au|sa|jp|in).
 *
 * The @ngrok/ngrok package is loaded dynamically so it remains an optional
 * dependency — production builds without it installed will not break.
 */
import { logger } from "./logger";

let activeTunnelUrl: string | null = null;

export function getNgrokUrl(): string | null {
  return activeTunnelUrl;
}

export async function startNgrokTunnel(port: number): Promise<string | null> {
  if (process.env.NGROK_ENABLED !== "true") return null;

  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    logger.warn(
      "[ngrok] NGROK_ENABLED=true but NGROK_AUTHTOKEN is missing — skipping tunnel."
    );
    return null;
  }

  // Dynamic import keeps @ngrok/ngrok an optional dep — production builds
  // and CI environments without it installed must not crash on startup.
  // Typed as unknown because the package may be absent at type-check time.
  let ngrok: { forward: (opts: Record<string, unknown>) => Promise<{ url: () => string | null }> };
  try {
    ngrok = (await import(
      /* @vite-ignore */ "@ngrok/ngrok"
    )) as unknown as typeof ngrok;
  } catch {
    logger.warn(
      "[ngrok] @ngrok/ngrok is not installed — run `pnpm add -D @ngrok/ngrok` to enable tunnels."
    );
    return null;
  }

  try {
    const listener = await ngrok.forward({
      addr: port,
      authtoken,
      domain: process.env.NGROK_DOMAIN || undefined,
      region: process.env.NGROK_REGION || undefined,
    });
    const url = listener.url();
    if (!url) {
      logger.warn("[ngrok] Tunnel started but no URL was returned.");
      return null;
    }
    activeTunnelUrl = url;
    logger.info("[ngrok] Public tunnel active", {
      url,
      forwardingTo: `http://localhost:${port}`,
    });
    logger.info(
      "[ngrok] Webhook URLs (point provider dashboards here in dev):"
    );
    logger.info(`[ngrok]   Stripe   → ${url}/webhooks/stripe`);
    logger.info(`[ngrok]   PayPal   → ${url}/webhooks/paypal`);
    logger.info(`[ngrok]   Shopify  → ${url}/webhooks/shopify`);
    logger.info(`[ngrok]   Square   → ${url}/webhooks/square`);
    logger.info(`[ngrok]   n8n      → ${url}/webhooks/n8n`);
    return url;
  } catch (err) {
    logger.error("[ngrok] Failed to start tunnel", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Resolve the MCP worker URL Kai should call. Honors a dev-only override
 * (KAI_MCP_NGROK_URL) so a developer can route Kai's MCP tool calls at a
 * locally-tunneled MCP worker without changing the shared MCP_WORKER_URL.
 */
export function resolveKaiMcpUrl(): string | undefined {
  if (process.env.NODE_ENV !== "production" && process.env.KAI_MCP_NGROK_URL) {
    return process.env.KAI_MCP_NGROK_URL;
  }
  return process.env.MCP_WORKER_URL;
}
