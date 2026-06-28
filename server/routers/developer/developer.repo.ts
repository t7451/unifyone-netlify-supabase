/**
 * server/routers/developer/developer.repo.ts
 *
 * Data access for the Developer Hub router. Wraps the shared `../../db`
 * helpers — relocated, not rewritten. Each method calls through lazily (at
 * call time) so the underlying db binding is only read when invoked, exactly
 * as the original router's named imports did.
 */
import * as db from "../../db";

export const developerRepo = {
  createApiKey: (...args: Parameters<typeof db.createApiKey>) =>
    db.createApiKey(...args),
  getApiKeysByTenant: (...args: Parameters<typeof db.getApiKeysByTenant>) =>
    db.getApiKeysByTenant(...args),
  getFilteredWebhookEvents: (
    ...args: Parameters<typeof db.getFilteredWebhookEvents>
  ) => db.getFilteredWebhookEvents(...args),
  getWebhookStats: (...args: Parameters<typeof db.getWebhookStats>) =>
    db.getWebhookStats(...args),
  retryWebhookEvent: (...args: Parameters<typeof db.retryWebhookEvent>) =>
    db.retryWebhookEvent(...args),
  revokeApiKey: (...args: Parameters<typeof db.revokeApiKey>) =>
    db.revokeApiKey(...args),
  getTenantById: (...args: Parameters<typeof db.getTenantById>) =>
    db.getTenantById(...args),
};
