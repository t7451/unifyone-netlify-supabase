-- ── Migration 0047: Behavior tracking indexes ────────────────────────────────
--
-- First-party behavioral analytics (product views, searches, cart/checkout,
-- purchases) is written to the existing analytics_events table. These indexes
-- back the insight queries added in server/db.ts:
--   - getBehaviorSummary / getCartFunnel  → filter by (tenantId, eventType, createdAt)
--   - getTopViewedProducts                → group by (tenantId, productId)
--
-- The table and its columns already exist (created in an earlier migration);
-- this migration only adds indexes, so it is safe to run on a populated table.
-- Run this after 0046_discounts.sql.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "analytics_events_tenant_event_created_idx"
  ON "analytics_events" ("tenantId", "eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "analytics_events_tenant_product_idx"
  ON "analytics_events" ("tenantId", "productId");
