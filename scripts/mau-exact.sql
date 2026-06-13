-- mau-exact.sql
-- Exact Monthly Active Users: users who logged in AND took ≥1 core action
-- in the rolling 28-day window.
--
-- Definition: a "core action" = placed an order OR created/updated a product.
-- Run against the Neon (DATABASE_URL) database.
--
-- Usage:
--   psql $DATABASE_URL -f scripts/mau-exact.sql

WITH window AS (
  SELECT NOW() - INTERVAL '28 days' AS since
),
active_logins AS (
  SELECT id, "tenantId", "lastSignedIn"
  FROM users
  WHERE "deletedAt" IS NULL
    AND "lastSignedIn" >= (SELECT since FROM window)
),
action_tenants AS (
  -- Tenants that placed at least one order in the window
  SELECT DISTINCT "tenantId" AS tid
  FROM orders
  WHERE "createdAt" >= (SELECT since FROM window)

  UNION

  -- Tenants that created at least one product in the window
  SELECT DISTINCT "tenantId" AS tid
  FROM products
  WHERE "createdAt" >= (SELECT since FROM window)
),
mau_users AS (
  SELECT al.id
  FROM active_logins al
  INNER JOIN action_tenants at_ ON al."tenantId" = at_.tid
)
SELECT
  COUNT(*)                          AS mau_exact,
  (SELECT COUNT(*) FROM active_logins) AS logged_in_28d,
  (SELECT COUNT(*) FROM action_tenants) AS active_tenants_28d,
  (SELECT since FROM window)        AS window_start,
  NOW()                             AS computed_at;
