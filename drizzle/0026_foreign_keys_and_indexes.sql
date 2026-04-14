-- Add foreign key constraints and performance indexes.
-- Uses IF NOT EXISTS / DO $$ blocks for safe re-runs.

-- ── Foreign Key Constraints ──────────────────────────────────────────────────

-- users.tenantId → tenants.id (SET NULL on delete — user survives tenant removal)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_tenant') THEN
    ALTER TABLE "users" ADD CONSTRAINT fk_users_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- tenants.ownerId → users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_owner') THEN
    ALTER TABLE "tenants" ADD CONSTRAINT fk_tenants_owner
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;

-- tenants.planId → plans.id (SET NULL on delete — tenant stays if plan removed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_plan') THEN
    ALTER TABLE "tenants" ADD CONSTRAINT fk_tenants_plan
      FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- categories.tenantId → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_categories_tenant') THEN
    ALTER TABLE "categories" ADD CONSTRAINT fk_categories_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- products.tenantId → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_tenant') THEN
    ALTER TABLE "products" ADD CONSTRAINT fk_products_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- products.categoryId → categories.id (SET NULL — product survives category delete)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_category') THEN
    ALTER TABLE "products" ADD CONSTRAINT fk_products_category
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- inventory.tenantId → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_tenant') THEN
    ALTER TABLE "inventory" ADD CONSTRAINT fk_inventory_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- inventory.productId → products.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_product') THEN
    ALTER TABLE "inventory" ADD CONSTRAINT fk_inventory_product
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- orders.tenantId → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_tenant') THEN
    ALTER TABLE "orders" ADD CONSTRAINT fk_orders_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- orders.customerId → customers.id (SET NULL — order survives customer delete)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_customer') THEN
    ALTER TABLE "orders" ADD CONSTRAINT fk_orders_customer
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- order_items.orderId → orders.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_order') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT fk_order_items_order
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- order_items.tenantId → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_tenant') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT fk_order_items_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- notifications.userId → users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT fk_notifications_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- user_preferences.userId → users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_preferences_user') THEN
    ALTER TABLE "user_preferences" ADD CONSTRAINT fk_user_preferences_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ── Composite Indexes for Tenant-Scoped Queries ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_tenant_status
  ON "products" ("tenantId", "status");

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status
  ON "orders" ("tenantId", "status");

CREATE INDEX IF NOT EXISTS idx_orders_tenant_created
  ON "orders" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_payment_status
  ON "orders" ("tenantId", "paymentStatus");

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON "order_items" ("orderId");

CREATE INDEX IF NOT EXISTS idx_order_items_tenant
  ON "order_items" ("tenantId");

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_product
  ON "inventory" ("tenantId", "productId");

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON "notifications" ("userId", "read");

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_type
  ON "analytics_events" ("tenantId", "eventType");

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant
  ON "webhook_events" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_categories_tenant
  ON "categories" ("tenantId");

CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON "users" ("tenantId");
