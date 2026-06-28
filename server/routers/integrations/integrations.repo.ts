/**
 * server/routers/integrations/integrations.repo.ts
 *
 * Data access for the integrations router. Wraps the shared `../../db`
 * helpers — no business logic here, just relocated persistence calls. Each
 * method calls through lazily (at call time) so the underlying db binding is
 * only read when invoked, exactly as the original router's named imports did.
 */
import * as db from "../../db";

export const integrationsRepo = {
  getTenantById: (...args: Parameters<typeof db.getTenantById>) =>
    db.getTenantById(...args),
  updateTenant: (...args: Parameters<typeof db.updateTenant>) =>
    db.updateTenant(...args),
  logWebhookEvent: (...args: Parameters<typeof db.logWebhookEvent>) =>
    db.logWebhookEvent(...args),
};
