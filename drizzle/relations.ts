import { relations } from "drizzle-orm";
import {
  clips,
  clippingJobs,
  clippingSubscriptions,
  users,
  tenants,
  orders,
  orderItems,
  customers,
  products,
  categories,
} from "./schema";

// ── users ↔ tenants ───────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  /** The tenant this user currently belongs to. */
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  /** Tenants this user owns. */
  ownedTenants: many(tenants),
  /** Clippers jobs created by this user. */
  clippingJobs: many(clippingJobs),
  /** Clippers subscription owner row. */
  clippingSubscriptions: many(clippingSubscriptions),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  /** The user who owns/created this tenant. */
  owner: one(users, { fields: [tenants.ownerId], references: [users.id] }),
  /** All orders placed under this tenant. */
  orders: many(orders),
  /** All products listed under this tenant. */
  products: many(products),
  /** All customers under this tenant. */
  customers: many(customers),
  /** All categories under this tenant. */
  categories: many(categories),
  /** All clipping jobs under this tenant. */
  clippingJobs: many(clippingJobs),
  /** All generated clips under this tenant. */
  clips: many(clips),
  /** Tenant's Clippers subscription state. */
  clippingSubscriptions: many(clippingSubscriptions),
}));

// ── orders ↔ orderItems / customers ──────────────────────────────────────────

export const ordersRelations = relations(orders, ({ one, many }) => ({
  /** The tenant this order belongs to. */
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  /** The customer who placed this order. */
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  /** Individual line items in this order. */
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  /** The parent order. */
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  /** The product referenced by this line item. */
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  /** The tenant this customer belongs to. */
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  /** Orders placed by this customer. */
  orders: many(orders),
}));

// ── products ↔ categories ─────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one }) => ({
  /** The tenant this product belongs to. */
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  /** The category this product is assigned to. */
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  /** The tenant this category belongs to. */
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  /** Products assigned to this category. */
  products: many(products),
}));

// ── clippers ────────────────────────────────────────────────────────────────────

export const clippingJobsRelations = relations(clippingJobs, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clippingJobs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [clippingJobs.userId],
    references: [users.id],
  }),
  clips: many(clips),
}));

export const clipsRelations = relations(clips, ({ one }) => ({
  job: one(clippingJobs, {
    fields: [clips.jobId],
    references: [clippingJobs.id],
  }),
  tenant: one(tenants, {
    fields: [clips.tenantId],
    references: [tenants.id],
  }),
}));

export const clippingSubscriptionsRelations = relations(
  clippingSubscriptions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [clippingSubscriptions.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [clippingSubscriptions.userId],
      references: [users.id],
    }),
  })
);
