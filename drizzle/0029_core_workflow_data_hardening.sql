CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_slug_idx" ON "products" ("tenantId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_sku_idx" ON "products" ("tenantId", "sku");
CREATE INDEX IF NOT EXISTS "products_tenant_status_created_idx" ON "products" ("tenantId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_price_non_negative'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_tenant_order_number_idx" ON "orders" ("tenantId", "orderNumber");
CREATE INDEX IF NOT EXISTS "orders_tenant_status_created_idx" ON "orders" ("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_tenant_payment_status_idx" ON "orders" ("tenantId", "paymentStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_total_non_negative'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_total_non_negative" CHECK ("total" >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("orderId");
CREATE INDEX IF NOT EXISTS "order_items_tenant_order_idx" ON "order_items" ("tenantId", "orderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_quantity_positive'
  ) THEN
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_unit_price_non_negative'
  ) THEN
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_unit_price_non_negative" CHECK ("unitPrice" >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_tenant_session_product_idx" ON "cart_items" ("tenantId", "sessionId", "productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cart_items_quantity_positive'
  ) THEN
    ALTER TABLE "cart_items"
      ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0);
  END IF;
END $$;
