-- ============================================
-- UnifyOne — Cleanup Audit Users
-- ============================================
--
-- WHAT THIS DOES
--   Soft-deletes test rows that the production auth audit (PR #89)
--   created in the `users` table. Audit accounts use reserved-for-testing
--   email TLDs (`.test`, `.invalid`) so this cleanup is targeted and safe
--   to re-run.
--
-- ORIGIN
--   Auth audit follow-up. The audit validated end-to-end signup → me →
--   signin → logout against the production API and left real rows behind
--   in the Neon-backed `users` table. See PR #89 for context.
--
-- HOW TO USE
--   1. Run in PREVIEW mode (default):
--        psql "$DATABASE_URL" -f scripts/cleanup-audit-users.sql
--      Confirms which rows match. Nothing is mutated.
--
--   2. After reviewing the preview output, perform the soft-delete by
--      uncommenting the "DELETE BLOCK" near the bottom of this file
--      (every line is prefixed with "-- "). Then re-run the same command.
--
--   3. ROLLBACK if the count or any individual row looks wrong. The block
--      is wrapped in an explicit transaction so you can bail out cleanly.
--
-- WARNING
--   The DELETE BLOCK mutates production data. The mutation is "soft" —
--   it sets `deletedAt = NOW()` rather than issuing a hard DELETE — so
--   it is recoverable by `UPDATE users SET "deletedAt" = NULL ...`
--   until a future hard-delete sweep removes the rows. Even so, only run
--   the DELETE BLOCK after reviewing the preview output.
--
-- WHY SOFT DELETE (not hard DELETE)
--   The `users` table is the target of many foreign keys across the
--   schema (orders, sessions, api_keys, governance tables, clipper
--   tables, etc.). Several of those FKs use ON DELETE RESTRICT (e.g.
--   tenants.ownerId in drizzle/0026_foreign_keys_and_indexes.sql), and
--   others lack an explicit ON DELETE clause and therefore default to
--   NO ACTION. A hard DELETE would fail with FK violations on any audit
--   user that managed to create a tenant, session, api key, or governance
--   record before logout.
--
--   The schema instead provides a `deletedAt TIMESTAMP` column on
--   `users` (drizzle/schema.ts:143) specifically for this case. The auth
--   path filters `WHERE isNull(users.deletedAt)` (server/_core/customAuth.ts:312),
--   so soft-deleted rows are immediately invisible to signin/signup/me.
--   A scheduled job hard-deletes rows older than 30 days.
--
-- ============================================

-- ============================================
-- MATCH PATTERN
-- ============================================
-- Audit rows are created with emails of the form:
--   audit-<random>@example.test
--   audit-<random>@nope.invalid
-- The third clause `*.invalid` is a safety net for any other
-- reserved-for-testing TLD the audit script may have used; it is a
-- superset of the second clause but kept separate for documentation.
--
-- The pattern is duplicated verbatim in the DELETE BLOCK below. If you
-- adjust one, adjust the other.

WITH audit_users AS (
  SELECT id
  FROM users
  WHERE email LIKE 'audit-%@example.test'
     OR email LIKE 'audit-%@nope.invalid'
     OR email LIKE 'audit-%@%.invalid'
)
SELECT
  u.id,
  u.email,
  u."createdAt",
  u."tenantId",
  u."deletedAt"
FROM users u
JOIN audit_users a ON a.id = u.id
ORDER BY u.id;

-- ============================================
-- DELETE BLOCK (commented out by default)
-- ============================================
-- Uncomment every line below (remove the leading "-- ") to perform the
-- soft delete. The whole block must be uncommented as a unit so the
-- WITH/UPDATE/COMMIT statements line up — partial uncommenting will
-- produce a syntax error and the transaction will roll back cleanly
-- (BEGIN without a matching COMMIT is harmless on script exit).
--
-- BEGIN;
--
-- WITH audit_users AS (
--   SELECT id
--   FROM users
--   WHERE email LIKE 'audit-%@example.test'
--      OR email LIKE 'audit-%@nope.invalid'
--      OR email LIKE 'audit-%@%.invalid'
-- )
-- UPDATE users
-- SET "deletedAt" = NOW(),
--     "updatedAt" = NOW()
-- WHERE id IN (SELECT id FROM audit_users)
--   AND "deletedAt" IS NULL
-- RETURNING id, email, "deletedAt";
--
-- -- Sanity check: how many rows did we soft-delete?
-- -- The RETURNING clause above echoes each row. Compare against the
-- -- preview output. If the count looks wrong (e.g. 0 rows when you
-- -- expected ~3, or surprisingly many), run ROLLBACK instead of COMMIT
-- -- to undo the transaction.
--
-- COMMIT;
-- -- ROLLBACK;
