import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  date,
  serial,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── PostgreSQL Enums ─────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "trial", "cancelled"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "cancelled", "trialing", "none"]);
export const productStatusEnum = pgEnum("product_status", ["active", "draft", "archived"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded", "partial"]);
export const fulfillmentStatusEnum = pgEnum("fulfillment_status", ["unfulfilled", "partial", "fulfilled", "returned"]);
export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "paypal", "shopify", "square", "manual", "other"]);
export const webhookSourceEnum = pgEnum("webhook_source", ["stripe", "shopify", "n8n", "internal"]);
export const webhookStatusEnum = pgEnum("webhook_status", ["pending", "processed", "failed", "skipped"]);
export const teamInviteStatusEnum = pgEnum("team_invite_status", ["pending", "accepted", "expired", "revoked"]);
export const socialPlatformEnum = pgEnum("social_platform", ["twitter", "instagram", "linkedin", "facebook", "tiktok"]);
export const socialPostStatusEnum = pgEnum("social_post_status", ["draft", "scheduled", "published", "failed", "cancelled"]);
export const referralStatusEnum = pgEnum("referral_status", ["clicked", "signed_up", "converted", "expired"]);
export const creditTypeEnum = pgEnum("credit_type", ["earned", "redeemed", "expired", "bonus", "adjustment"]);
export const creditSourceEnum = pgEnum("credit_source", ["referral_click", "referral_signup", "referral_conversion", "social_share", "subscription_redemption", "admin", "bonus"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "converted", "lost"]);
export const themePriceTypeEnum = pgEnum("theme_price_type", ["free", "paid", "subscription"]);
export const themeComplexityEnum = pgEnum("theme_complexity", ["starter", "standard", "advanced"]);
export const themeStatusEnum = pgEnum("theme_status", ["draft", "pending_review", "published", "archived"]);
export const themeReviewStatusEnum = pgEnum("theme_review_status", ["pending", "approved", "rejected"]);
export const rewardCategoryEnum = pgEnum("reward_category", ["signup", "referral", "purchase", "engagement", "milestone", "promotion"]);
export const rewardClaimStatusEnum = pgEnum("reward_claim_status", ["pending", "completed", "rejected"]);
export const metaPixelStatusEnum = pgEnum("meta_pixel_status", ["sent", "failed", "skipped"]);
export const revenueStreamTypeEnum = pgEnum("revenue_stream_type", ["affiliate", "saas", "consulting", "physical", "digital", "passive"]);
export const revenueStreamStatusEnum = pgEnum("revenue_stream_status", ["active", "pending", "inactive", "broken"]);
export const commissionTypeEnum = pgEnum("commission_type", ["percentage", "flat", "recurring"]);
export const shopifyStoreStatusEnum = pgEnum("shopify_store_status", ["active", "suspended", "uninstalled"]);
export const syncEntityEnum = pgEnum("sync_entity", ["product", "order", "customer", "inventory", "fulfillment", "webhook"]);
export const syncDirectionEnum = pgEnum("sync_direction", ["inbound", "outbound"]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "failed", "skipped", "retrying"]);
export const sovereignRevenueEnum = pgEnum("sovereign_revenue", ["pre_revenue", "under_5k", "5k_25k", "25k_100k", "over_100k"]);
export const sovereignStatusEnum = pgEnum("sovereign_status", ["pending", "contacted", "qualified", "converted", "rejected"]);
export const gigShiftStatusEnum = pgEnum("gig_shift_status", ["active", "completed", "cancelled"]);
export const financialRuleTypeEnum = pgEnum("financial_rule_type", ["auto_save", "budget_cap", "alert", "allocation", "goal"]);
export const financialTriggerTypeEnum = pgEnum("financial_trigger_type", ["income_received", "expense_over", "balance_below", "balance_above", "scheduled", "manual"]);
export const financialActionTypeEnum = pgEnum("financial_action_type", ["transfer", "notify", "block", "tag", "save"]);
export const achievementCategoryEnum = pgEnum("achievement_category", ["gig", "finance", "social", "platform", "milestone", "special"]);
export const rarityEnum = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]);
export const challengeTypeEnum = pgEnum("challenge_type", ["daily", "weekly", "monthly", "one_time", "community"]);
export const challengeCategoryEnum = pgEnum("challenge_category", ["gig", "finance", "social", "platform"]);
export const subscriptionProviderEnum = pgEnum("subscription_provider", ["stripe", "paypal", "manual"]);
export const subscriptionEntitlementStatusEnum = pgEnum("subscription_entitlement_status", ["active", "pending", "canceled", "expired", "trial"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted", "declined", "blocked"]);
export const friendChallengeStatusEnum = pgEnum("friend_challenge_status", ["pending", "accepted", "declined", "completed"]);
export const pushTargetEnum = pgEnum("push_target", ["all", "active_users", "inactive_users", "new_users", "custom"]);
export const pushStatusEnum = pgEnum("push_status", ["draft", "scheduled", "sent", "failed", "recurring"]);
export const n8nRunStatusEnum = pgEnum("n8n_run_status", ["success", "failed", "pending"]);
export const emailSubscriberStatusEnum = pgEnum("email_subscriber_status", ["subscribed", "unsubscribed", "bounced"]);
export const escalationStatusEnum = pgEnum("escalation_status", ["pending", "approved", "rejected", "expired"]);
export const authorityLevelEnum = pgEnum("authority_level", ["viewer", "operator", "architect", "cathedral"]);
export const governanceRuleTypeEnum = pgEnum("governance_rule_type", ["approval_threshold", "rate_limit", "data_access", "operational_constraint"]);
export const violationActionEnum = pgEnum("violation_action", ["block", "escalate", "log", "warn"]);
export const gigWorkerPlanTierEnum = pgEnum("gig_worker_plan_tier", ["starter", "pro", "elite"]);
export const gigWorkerSubStatusEnum = pgEnum("gig_worker_sub_status", ["active", "trialing", "past_due", "cancelled", "none"]);
export const clippingJobStatusEnum = pgEnum("clipping_job_status", [
  "queued",
  "processing",
  "transcribing",
  "detecting",
  "extracting",
  "captioning",
  "uploading",
  "completed",
  "failed",
  "cancelled",
]);
export const seoContentJobStatusEnum = pgEnum("seo_content_job_status", [
  "pending",
  "generating",
  "generated",
  "published",
  "failed",
  "rejected",
]);
export const seoContentTypeEnum = pgEnum("seo_content_type", [
  "blog_post",
  "seo_landing",
  "faq_expansion",
]);
export const clippingPlanEnum = pgEnum("clipping_plan", [
  "free",
  "pro",
  "creator",
]);
export const clippingSourceTypeEnum = pgEnum("clipping_source_type", [
  "upload",
  "url",
]);

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // bcrypt/scrypt hash
  loginMethod: varchar("loginMethod", { length: 64 }),
  emailVerified: boolean("emailVerified").default(false),
  emailVerificationToken: varchar("emailVerificationToken", { length: 128 }).unique(),
  passwordResetToken: varchar("passwordResetToken", { length: 128 }).unique(),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  /**
   * Set whenever the user successfully resets their password.
   * Any JWT with iat < passwordChangedAt (seconds) is treated as invalidated —
   * this is the mechanism for session revocation after a password reset.
   */
  passwordChangedAt: timestamp("passwordChangedAt"),
  role: roleEnum("role").default("user").notNull(),
  tenantId: integer("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  creditBalance: integer("creditBalance").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  /**
   * Set when a user requests account deletion via /api/auth/delete-account.
   * The row is preserved (soft delete) for any cascading FKs and audit retention.
   * Auth lookups in customAuth.ts MUST filter `deletedAt IS NULL`.
   * After 30 days the row may be hard-deleted by a scheduled function.
   */
  deletedAt: timestamp("deletedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Plans ─────────────────────────────────────────────────────────────────────
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripePriceIdYearly", { length: 100 }),
  maxProducts: integer("maxProducts").default(100),
  maxOrders: integer("maxOrders").default(1000),
  maxUsers: integer("maxUsers").default(5),
  features: json("features").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logoUrl: text("logoUrl"),
  ownerId: integer("ownerId").notNull(),
  planId: integer("planId"),
  status: tenantStatusEnum("status").default("trial").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus").default("none").notNull(),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),
  shopifyShopDomain: varchar("shopifyShopDomain", { length: 255 }),
  shopifyAccessToken: text("shopifyAccessToken"),
  shopifySyncEnabled: boolean("shopifySyncEnabled").default(false),
  shopifyCheckoutUrl: text("shopifyCheckoutUrl"),
  squareAccessToken: text("squareAccessToken"),
  squareLocationId: varchar("squareLocationId", { length: 100 }),
  n8nWebhookUrl: text("n8nWebhookUrl"),
  settings: json("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ── Categories ────────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  parentId: integer("parentId"),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ── Products ──────────────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    categoryId: integer("categoryId"),
    name: varchar("name", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description"),
    sku: varchar("sku", { length: 100 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
    compareAtPrice: decimal("compareAtPrice", { precision: 10, scale: 2 }),
    costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
    imageUrl: text("imageUrl"),
    images: json("images").$type<string[]>(),
    tags: json("tags").$type<string[]>(),
    status: productStatusEnum("status").default("draft").notNull(),
    trackInventory: boolean("trackInventory").default(true),
    weight: decimal("weight", { precision: 8, scale: 3 }),
    shopifyProductId: varchar("shopifyProductId", { length: 100 }),
    metaTitle: varchar("metaTitle", { length: 255 }),
    metaDescription: text("metaDescription"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantSlugIdx: uniqueIndex("products_tenant_slug_idx").on(
      table.tenantId,
      table.slug
    ),
    tenantSkuIdx: uniqueIndex("products_tenant_sku_idx").on(
      table.tenantId,
      table.sku
    ),
    tenantStatusCreatedIdx: index("products_tenant_status_created_idx").on(
      table.tenantId,
      table.status,
      table.createdAt
    ),
    priceNonNegative: check("products_price_non_negative", sql`${table.price} >= 0`),
  })
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  reservedQuantity: integer("reservedQuantity").default(0).notNull(),
  lowStockThreshold: integer("lowStockThreshold").default(10),
  location: varchar("location", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("firstName", { length: 255 }),
    lastName: varchar("lastName", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
    shopifyCustomerId: varchar("shopifyCustomerId", { length: 100 }),
    totalOrders: integer("totalOrders").default(0),
    totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0.00"),
    tags: json("tags").$type<string[]>(),
    address: json("address").$type<{
      line1?: string; line2?: string; city?: string;
      state?: string; zip?: string; country?: string;
    }>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    // Unique customer per (tenant, email) — enables safe upsertCustomer
    tenantEmailIdx: uniqueIndex("customers_tenantId_email_idx").on(
      table.tenantId,
      table.email
    ),
  })
);

export type Customer = typeof customers.$inferSelect;

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  customerId: integer("customerId"),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("paymentStatus").default("pending").notNull(),
  fulfillmentStatus: fulfillmentStatusEnum("fulfillmentStatus").default("unfulfilled").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0.00"),
  shippingAmount: decimal("shippingAmount", { precision: 12, scale: 2 }).default("0.00"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  stripeSessionId: varchar("stripeSessionId", { length: 100 }),
  shopifyOrderId: varchar("shopifyOrderId", { length: 100 }),
  paypalOrderId: varchar("paypalOrderId", { length: 100 }),
  squarePaymentId: varchar("squarePaymentId", { length: 100 }),
  squareOrderId: varchar("squareOrderId", { length: 100 }),
  paymentMethod: paymentMethodEnum("paymentMethod"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerName: varchar("customerName", { length: 500 }),
  shippingAddress: json("shippingAddress").$type<{
    line1?: string; line2?: string; city?: string;
    state?: string; zip?: string; country?: string;
  }>(),
  notes: text("notes"),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, table => ({
  tenantOrderNumberIdx: uniqueIndex("orders_tenant_order_number_idx").on(
    table.tenantId,
    table.orderNumber
  ),
  tenantStatusCreatedIdx: index("orders_tenant_status_created_idx").on(
    table.tenantId,
    table.status,
    table.createdAt
  ),
  tenantPaymentStatusIdx: index("orders_tenant_payment_status_idx").on(
    table.tenantId,
    table.paymentStatus
  ),
  totalNonNegative: check("orders_total_non_negative", sql`${table.total} >= 0`),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ── Order Items ───────────────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  tenantId: integer("tenantId").notNull(),
  productId: integer("productId"),
  productName: varchar("productName", { length: 500 }).notNull(),
  productSku: varchar("productSku", { length: 100 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
}, table => ({
  orderItemsOrderIdx: index("order_items_order_idx").on(table.orderId),
  orderItemsTenantOrderIdx: index("order_items_tenant_order_idx").on(
    table.tenantId,
    table.orderId
  ),
  quantityPositive: check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  unitPriceNonNegative: check(
    "order_items_unit_price_non_negative",
    sql`${table.unitPrice} >= 0`
  ),
}));

export type OrderItem = typeof orderItems.$inferSelect;

// ── Cart Items ────────────────────────────────────────────────────────────────
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, table => ({
  tenantSessionProductIdx: uniqueIndex("cart_items_tenant_session_product_idx").on(
    table.tenantId,
    table.sessionId,
    table.productId
  ),
  quantityPositive: check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
}));

// ── Analytics Events ──────────────────────────────────────────────────────────
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  userId: integer("userId"),
  orderId: integer("orderId"),
  productId: integer("productId"),
  value: decimal("value", { precision: 12, scale: 2 }),
  properties: json("properties").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Webhook Events ────────────────────────────────────────────────────────────
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  source: webhookSourceEnum("source").notNull(),
  eventType: varchar("eventType", { length: 200 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  status: webhookStatusEnum("status").default("pending").notNull(),
  error: text("error"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

// ── Team Invites ──────────────────────────────────────────────────────────────
export const teamInvites = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: roleEnum("role").default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: integer("invitedBy").notNull(),
  status: teamInviteStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

// ── Social Accounts ───────────────────────────────────────────────────────────
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  platform: socialPlatformEnum("platform").notNull(),
  handle: varchar("handle", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  profileImageUrl: text("profileImageUrl"),
  followerCount: integer("followerCount").default(0),
  isConnected: boolean("isConnected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;

// ── Social Posts ──────────────────────────────────────────────────────────────
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  platforms: json("platforms").$type<string[]>().notNull(),
  mediaUrls: json("mediaUrls").$type<string[]>(),
  status: socialPostStatusEnum("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  campaignTag: varchar("campaignTag", { length: 100 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  metrics: json("metrics").$type<{
    impressions?: number; clicks?: number; likes?: number;
    shares?: number; comments?: number; reach?: number;
  }>(),
  aiGenerated: boolean("aiGenerated").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

// ── Referrals ─────────────────────────────────────────────────────────────────
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrerId").notNull(),
  referredEmail: varchar("referredEmail", { length: 320 }),
  referredUserId: integer("referredUserId"),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  platform: varchar("platform", { length: 50 }),
  utmSource: varchar("utmSource", { length: 100 }),
  status: referralStatusEnum("status").default("clicked").notNull(),
  creditsAwarded: integer("creditsAwarded").default(0),
  clickCount: integer("clickCount").default(0),
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ── Credit Transactions ───────────────────────────────────────────────────────
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  amount: integer("amount").notNull(),
  type: creditTypeEnum("type").notNull(),
  source: creditSourceEnum("source").notNull(),
  description: varchar("description", { length: 500 }),
  balanceAfter: integer("balanceAfter").notNull(),
  referralId: integer("referralId"),
  socialPostId: integer("socialPostId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  // Contact info
  companyName: varchar("companyName", { length: 500 }),
  contactName: varchar("contactName", { length: 500 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  // Lead details
  plan: varchar("plan", { length: 100 }),
  platforms: json("platforms").$type<string[]>(),
  branding: varchar("branding", { length: 255 }),
  monthlyRevenue: varchar("monthlyRevenue", { length: 100 }),
  teamSize: varchar("teamSize", { length: 50 }),
  message: text("message"),
  source: varchar("source", { length: 100 }).default("landing_page"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  // CRM status
  status: leadStatusEnum("status").default("new").notNull(),
  assignedTo: integer("assignedTo"),
  notes: text("notes"),
  // Automation tracking
  n8nTriggered: boolean("n8nTriggered").default(false),
  zapierTriggered: boolean("zapierTriggered").default(false),
  mailchimpSubscribed: boolean("mailchimpSubscribed").default(false),
  notificationSent: boolean("notificationSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ── n8n Workflows ─────────────────────────────────────────────────────────────
export const n8nWorkflows = pgTable("n8n_workflows", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("triggerEvent", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  payloadTemplate: json("payloadTemplate").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: integer("triggerCount").default(0),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type N8nWorkflow = typeof n8nWorkflows.$inferSelect;
export type InsertN8nWorkflow = typeof n8nWorkflows.$inferInsert;

// ── Zapier Hooks ──────────────────────────────────────────────────────────────
export const zapierHooks = pgTable("zapier_hooks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 255 }).notNull(),
  triggerEvent: varchar("triggerEvent", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: integer("triggerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ZapierHook = typeof zapierHooks.$inferSelect;

// ── Mailchimp Config ──────────────────────────────────────────────────────────
export const mailchimpConfig = pgTable("mailchimp_config", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").unique(),
  apiKey: text("apiKey"),
  serverPrefix: varchar("serverPrefix", { length: 10 }),
  listId: varchar("listId", { length: 100 }),
  tagPrefix: varchar("tagPrefix", { length: 100 }).default("unifyone"),
  enabled: boolean("enabled").default(false).notNull(),
  subscriberCount: integer("subscriberCount").default(0),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MailchimpConfig = typeof mailchimpConfig.$inferSelect;

// ── In-App Notifications ──────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  // type: info | success | warning | error | order | payment | team | social | lead
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 500 }),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ── Admin Announcements (broadcast to all users) ───────────────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  adminId: integer("adminId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("banner"),
  // type: banner | toast | modal
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  // severity: info | success | warning | error
  dismissible: boolean("dismissible").default(true).notNull(),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ── Announcement Dismissals (per-user) ────────────────────────────────────────
export const announcementDismissals = pgTable("announcement_dismissals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  announcementId: integer("announcementId").notNull(),
  dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
});
export type AnnouncementDismissal = typeof announcementDismissals.$inferSelect;

// ── Notification Event Triggers (per-event webhook/email config) ──────────────
export const notificationTriggers = pgTable("notification_triggers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  // event: order.created | order.status_changed | payment.received | lead.submitted | team.invite_accepted | social.post_published
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  n8nEnabled: boolean("n8nEnabled").default(false).notNull(),
  n8nWebhookUrl: text("n8nWebhookUrl"),
  zapierEnabled: boolean("zapierEnabled").default(false).notNull(),
  mailchimpEnabled: boolean("mailchimpEnabled").default(false).notNull(),
  slackWebhookUrl: text("slackWebhookUrl"),
  slackEnabled: boolean("slackEnabled").default(false).notNull(),
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  emailRecipients: text("emailRecipients"),
  // comma-separated email addresses
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type NotificationTrigger = typeof notificationTriggers.$inferSelect;
export type InsertNotificationTrigger = typeof notificationTriggers.$inferInsert;

// ── Theme Store ───────────────────────────────────────────────────────────────
export const themeCategories = pgTable("theme_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ThemeCategory = typeof themeCategories.$inferSelect;

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  longDescription: text("longDescription"),
  authorId: integer("authorId").notNull(),
  categoryId: integer("categoryId"),
  // Pricing
  priceType: themePriceTypeEnum("priceType").notNull().default("free"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  stripePriceId: varchar("stripePriceId", { length: 100 }),
  // Assets
  previewUrl: text("previewUrl"),       // live preview URL or iframe src
  thumbnailUrl: text("thumbnailUrl"),   // main card image (CDN)
  screenshotUrls: json("screenshotUrls").$type<string[]>().default([]),
  downloadUrl: text("downloadUrl"),     // S3 URL for the zip file
  // Metadata
  tags: json("tags").$type<string[]>().default([]),
  industry: varchar("industry", { length: 100 }),
  complexity: themeComplexityEnum("complexity").notNull().default("standard"),
  features: json("features").$type<string[]>().default([]),
  techStack: json("techStack").$type<string[]>().default([]),
  // Stats
  installCount: integer("installCount").default(0).notNull(),
  reviewCount: integer("reviewCount").default(0).notNull(),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00").notNull(),
  // Status
  status: themeStatusEnum("status").notNull().default("draft"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;

export const themeInstalls = pgTable("theme_installs", {
  id: serial("id").primaryKey(),
  themeId: integer("themeId").notNull(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  // Payment tracking (null for free themes)
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0.00").notNull(),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});
export type ThemeInstall = typeof themeInstalls.$inferSelect;

export const themeReviews = pgTable("theme_reviews", {
  id: serial("id").primaryKey(),
  themeId: integer("themeId").notNull(),
  userId: integer("userId").notNull(),
  rating: integer("rating").notNull(), // 1-5
  title: varchar("title", { length: 200 }),
  body: text("body"),
  helpful: integer("helpful").default(0).notNull(),
  status: themeReviewStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ThemeReview = typeof themeReviews.$inferSelect;

// ─── Rewards Keys ─────────────────────────────────────────────────────────────

export const rewardOpportunities = pgTable("reward_opportunities", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  category: rewardCategoryEnum("category").notNull().default("engagement"),
  maxClaimsPerUser: integer("maxClaimsPerUser").default(1).notNull(),
  totalMaxClaims: integer("totalMaxClaims"), // null = unlimited
  claimCount: integer("claimCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RewardOpportunity = typeof rewardOpportunities.$inferSelect;
export type InsertRewardOpportunity = typeof rewardOpportunities.$inferInsert;

export const rewardClaims = pgTable("reward_claims", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  opportunityId: integer("opportunityId").notNull(),
  credits: integer("credits").notNull(),
  status: rewardClaimStatusEnum("status").notNull().default("completed"),
  metaEventId: varchar("metaEventId", { length: 100 }), // for CAPI deduplication
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
});
export type RewardClaim = typeof rewardClaims.$inferSelect;
export type InsertRewardClaim = typeof rewardClaims.$inferInsert;

// ─── Meta CAPI Event Log ──────────────────────────────────────────────────────

export const metaPixelEvents = pgTable("meta_pixel_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  eventName: varchar("eventName", { length: 100 }).notNull(),
  eventId: varchar("eventId", { length: 100 }).notNull(), // deduplication key
  eventSourceUrl: varchar("eventSourceUrl", { length: 500 }),
  customData: json("customData"),
  status: metaPixelStatusEnum("status").notNull().default("sent"),
  responseCode: integer("responseCode"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type MetaPixelEvent = typeof metaPixelEvents.$inferSelect;
export type InsertMetaPixelEvent = typeof metaPixelEvents.$inferInsert;

// ─── Revenue Streams ──────────────────────────────────────────────────────────

export const revenueStreams = pgTable("revenue_streams", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 200 }).notNull(),
  type: revenueStreamTypeEnum("type").notNull(),
  platform: varchar("platform", { length: 100 }),
  monthlyValue: decimal("monthlyValue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }), // percentage
  status: revenueStreamStatusEnum("status").notNull().default("active"),
  affiliateLink: varchar("affiliateLink", { length: 1000 }),
  cookieDuration: integer("cookieDuration"), // days
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RevenueStream = typeof revenueStreams.$inferSelect;
export type InsertRevenueStream = typeof revenueStreams.$inferInsert;

// ─── Affiliate Programs ───────────────────────────────────────────────────────

export const affiliatePrograms = pgTable("affiliate_programs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  platform: varchar("platform", { length: 100 }),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  commissionType: commissionTypeEnum("commissionType").notNull().default("percentage"),
  cookieDuration: integer("cookieDuration").default(30).notNull(), // days
  affiliateLink: varchar("affiliateLink", { length: 1000 }),
  monthlyEarnings: decimal("monthlyEarnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  pendingPayout: decimal("pendingPayout", { precision: 10, scale: 2 }).default("0.00").notNull(),
  instantPayout: boolean("instantPayout").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AffiliateProgram = typeof affiliatePrograms.$inferSelect;
export type InsertAffiliateProgram = typeof affiliatePrograms.$inferInsert;

// ─── Shopify OAuth Stores ─────────────────────────────────────────────────────
export const shopifyStores = pgTable("shopify_stores", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  userId: integer("userId").notNull(),
  shopDomain: varchar("shopDomain", { length: 255 }).notNull().unique(),
  accessToken: varchar("accessToken", { length: 500 }).notNull(),
  scopes: text("scopes").notNull(),
  shopName: varchar("shopName", { length: 255 }),
  shopEmail: varchar("shopEmail", { length: 255 }),
  shopCurrency: varchar("shopCurrency", { length: 10 }).default("USD"),
  shopPlan: varchar("shopPlan", { length: 100 }),
  status: shopifyStoreStatusEnum("status").notNull().default("active"),
  lastSyncAt: timestamp("lastSyncAt"),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ShopifyStore = typeof shopifyStores.$inferSelect;
export type InsertShopifyStore = typeof shopifyStores.$inferInsert;

// ─── Shopify Sync Audit Log ───────────────────────────────────────────────────
export const shopifySyncLog = pgTable("shopify_sync_log", {
  id: serial("id").primaryKey(),
  storeId: integer("storeId").notNull(),
  tenantId: integer("tenantId"),
  event: varchar("event", { length: 100 }).notNull(),
  entity: syncEntityEnum("entity").notNull(),
  entityId: varchar("entityId", { length: 100 }),
  direction: syncDirectionEnum("direction").notNull().default("inbound"),
  status: syncStatusEnum("status").notNull(),
  latencyMs: integer("latencyMs"),
  errorMsg: text("errorMsg"),
  retryCount: integer("retryCount").default(0).notNull(),
  payload: json("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ShopifySyncLog = typeof shopifySyncLog.$inferSelect;
export type InsertShopifySyncLog = typeof shopifySyncLog.$inferInsert;

// ─── Shopify API Quota Tracking ───────────────────────────────────────────────
export const shopifyApiQuota = pgTable("shopify_api_quota", {
  id: serial("id").primaryKey(),
  storeId: integer("storeId").notNull(),
  restCallsMade: integer("restCallsMade").default(0).notNull(),
  restCallsLimit: integer("restCallsLimit").default(40).notNull(),
  graphqlPointsUsed: integer("graphqlPointsUsed").default(0).notNull(),
  graphqlPointsLimit: integer("graphqlPointsLimit").default(1000).notNull(),
  throttledCount: integer("throttledCount").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});
export type ShopifyApiQuota = typeof shopifyApiQuota.$inferSelect;
export type InsertShopifyApiQuota = typeof shopifyApiQuota.$inferInsert;

// ─── Sovereign Stack Waitlist ─────────────────────────────────────────────────
export const sovereignWaitlist = pgTable("sovereign_waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  currentStack: text("currentStack"),
  monthlyRevenue: sovereignRevenueEnum("monthlyRevenue"),
  biggestChallenge: text("biggestChallenge"),
  referralSource: varchar("referralSource", { length: 100 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  status: sovereignStatusEnum("status").default("pending").notNull(),
  position: integer("position"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SovereignWaitlist = typeof sovereignWaitlist.$inferSelect;
export type InsertSovereignWaitlist = typeof sovereignWaitlist.$inferInsert;

// ─── Gig Shifts (from MoneyGeneratorApp / Gig Command Center) ─────────────────
export const gigShifts = pgTable("gig_shifts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  platform: varchar("platform", { length: 100 }).notNull().default("other"),
  // e.g. DoorDash, Uber, Instacart, Lyft, Upwork, etc.
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationMinutes: integer("durationMinutes"),
  startLat: decimal("startLat", { precision: 10, scale: 7 }),
  startLng: decimal("startLng", { precision: 10, scale: 7 }),
  endLat: decimal("endLat", { precision: 10, scale: 7 }),
  endLng: decimal("endLng", { precision: 10, scale: 7 }),
  routeWaypoints: json("routeWaypoints").$type<Array<{ lat: number; lng: number; ts: number }>>(),
  totalMiles: decimal("totalMiles", { precision: 8, scale: 2 }).default("0.00").notNull(),
  grossEarnings: decimal("grossEarnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  tips: decimal("tips", { precision: 10, scale: 2 }).default("0.00").notNull(),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0.00").notNull(),
  notes: text("notes"),
  status: gigShiftStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GigShift = typeof gigShifts.$inferSelect;
export type InsertGigShift = typeof gigShifts.$inferInsert;

// ─── Mileage Logs ─────────────────────────────────────────────────────────────
export const mileageLogs = pgTable("mileage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  shiftId: integer("shiftId"),
  date: timestamp("date").notNull(),
  miles: decimal("miles", { precision: 8, scale: 2 }).notNull(),
  purpose: varchar("purpose", { length: 255 }).notNull().default("business"),
  // IRS 2025 rate: 0.70/mile
  irsRateCents: integer("irsRateCents").default(70).notNull(),
  deductionCents: integer("deductionCents").notNull(),
  startAddress: varchar("startAddress", { length: 500 }),
  endAddress: varchar("endAddress", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MileageLog = typeof mileageLogs.$inferSelect;
export type InsertMileageLog = typeof mileageLogs.$inferInsert;

// ─── Financial Rules (Money Management Rules Engine) ─────────────────────────
export const financialRules = pgTable("financial_rules", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  // Rule types: auto-save, budget-cap, alert, allocation
  type: financialRuleTypeEnum("type").notNull(),
  // Trigger condition
  triggerType: financialTriggerTypeEnum("triggerType").notNull(),
  triggerValue: decimal("triggerValue", { precision: 10, scale: 2 }),
  // Action
  actionType: financialActionTypeEnum("actionType").notNull(),
  actionValue: decimal("actionValue", { precision: 10, scale: 2 }),
  actionPercent: decimal("actionPercent", { precision: 5, scale: 2 }),
  // Targeting
  category: varchar("category", { length: 100 }),
  platform: varchar("platform", { length: 100 }),
  enabled: boolean("enabled").default(true).notNull(),
  triggerCount: integer("triggerCount").default(0).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type FinancialRule = typeof financialRules.$inferSelect;
export type InsertFinancialRule = typeof financialRules.$inferInsert;

// ─── Gamification: User Points ────────────────────────────────────────────────
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  totalPoints: integer("totalPoints").default(0).notNull(),
  lifetimePoints: integer("lifetimePoints").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  // Level thresholds: 1=0, 2=100, 3=300, 4=600, 5=1000, 6=1500, 7=2500, 8=4000, 9=6000, 10=10000
  streakDays: integer("streakDays").default(0).notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type UserPoints = typeof userPoints.$inferSelect;

// ─── Gamification: Points Transactions ───────────────────────────────────────
export const pointsTransactions = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  points: integer("points").notNull(), // positive = earned, negative = spent
  action: varchar("action", { length: 100 }).notNull(),
  // e.g. shift_completed, mileage_logged, rule_created, achievement_unlocked, challenge_completed, daily_login, referral
  description: varchar("description", { length: 500 }),
  referenceId: varchar("referenceId", { length: 100 }), // e.g. shiftId, achievementId
  balanceAfter: integer("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PointsTransaction = typeof pointsTransactions.$inferSelect;

// ─── Gamification: Achievements ───────────────────────────────────────────────
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  // e.g. first_shift, mileage_100, streak_7, rule_master, referral_5
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }).notNull().default("Trophy"),
  // Lucide icon name
  category: achievementCategoryEnum("category").notNull(),
  pointsReward: integer("pointsReward").default(50).notNull(),
  requirement: json("requirement").$type<{
    type: string; threshold: number; unit?: string;
  }>().notNull(),
  rarity: rarityEnum("rarity").notNull().default("common"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Achievement = typeof achievements.$inferSelect;

// ─── Gamification: User Achievements (unlocked) ───────────────────────────────
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  achievementId: integer("achievementId").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  pointsAwarded: integer("pointsAwarded").notNull(),
});
export type UserAchievement = typeof userAchievements.$inferSelect;

// ─── Gamification: Challenges ─────────────────────────────────────────────────
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: challengeTypeEnum("type").notNull(),
  category: challengeCategoryEnum("category").notNull(),
  goal: integer("goal").notNull(), // target number (e.g. 5 shifts, 100 miles)
  unit: varchar("unit", { length: 50 }).notNull().default("count"), // shifts, miles, dollars, rules, referrals
  pointsReward: integer("pointsReward").notNull(),
  bonusReward: varchar("bonusReward", { length: 200 }), // e.g. "Free month Pro"
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  maxParticipants: integer("maxParticipants"), // null = unlimited
  participantCount: integer("participantCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Challenge = typeof challenges.$inferSelect;

// ─── Gamification: Challenge Progress (per user) ──────────────────────────────
export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  challengeId: integer("challengeId").notNull(),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  pointsAwarded: integer("pointsAwarded").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ChallengeProgress = typeof challengeProgress.$inferSelect;

// ─── Subscription Entitlements (from MoneyGeneratorApp) ───────────────────────
export const subscriptionEntitlements = pgTable("subscription_entitlements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  planId: varchar("planId", { length: 100 }).notNull(),
  // e.g. free, pro, enterprise
  provider: subscriptionProviderEnum("provider").notNull().default("stripe"),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }),
  status: subscriptionEntitlementStatusEnum("status").notNull().default("pending"),
  features: json("features").$type<string[]>().default([]),
  // e.g. ["gig_tracker", "unlimited_rules", "advanced_analytics"]
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SubscriptionEntitlement = typeof subscriptionEntitlements.$inferSelect;
export type InsertSubscriptionEntitlement = typeof subscriptionEntitlements.$inferInsert;

// ─── Social: Friendships ──────────────────────────────────────────────────────
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requesterId").notNull(),
  addresseeId: integer("addresseeId").notNull(),
  status: friendshipStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

// ─── Social: Friend Challenges ────────────────────────────────────────────────
export const friendChallenges = pgTable("friend_challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challengerId").notNull(),
  challengeeId: integer("challengeeId").notNull(),
  challengeId: integer("challengeId").notNull(),
  message: varchar("message", { length: 500 }),
  status: friendChallengeStatusEnum("status").notNull().default("pending"),
  winnerId: integer("winnerId"),
  acceptedAt: timestamp("acceptedAt"),
  completedAt: timestamp("completedAt"),
  resolvedAt: timestamp("resolvedAt"),
  winnerNotified: boolean("winnerNotified").default(false).notNull(),
  loserNotified: boolean("loserNotified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type FriendChallenge = typeof friendChallenges.$inferSelect;
export type InsertFriendChallenge = typeof friendChallenges.$inferInsert;

// ─── Mobile: Deep Link Attributions ──────────────────────────────────────────
export const deepLinkAttributions = pgTable("deep_link_attributions", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  email: varchar("email", { length: 255 }),
  source: varchar("source", { length: 100 }).notNull().default("unknown"),
  medium: varchar("medium", { length: 100 }),
  campaign: varchar("campaign", { length: 255 }),
  deepLinkPath: varchar("deepLinkPath", { length: 500 }),
  referralCode: varchar("referralCode", { length: 100 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  converted: boolean("converted").default(false).notNull(),
  convertedAt: timestamp("convertedAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DeepLinkAttribution = typeof deepLinkAttributions.$inferSelect;
export type InsertDeepLinkAttribution = typeof deepLinkAttributions.$inferInsert;

// ─── Mobile: n8n Schedules ────────────────────────────────────────────────────
export const n8nSchedules = pgTable("n8n_schedules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  workflowId: varchar("workflowId", { length: 255 }),
  webhookUrl: varchar("webhookUrl", { length: 1000 }),
  cronExpression: varchar("cronExpression", { length: 100 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastRunStatus: n8nRunStatusEnum("lastRunStatus"),
  lastRunError: text("lastRunError"),
  triggerCount: integer("triggerCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type N8nSchedule = typeof n8nSchedules.$inferSelect;
export type InsertN8nSchedule = typeof n8nSchedules.$inferInsert;

// ─── Meta CAPI Events ─────────────────────────────────────────────────────────
export const metaCapiEvents = pgTable("meta_capi_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  eventName: text("event_name").notNull(),
  eventId: text("event_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  eventSourceUrl: text("event_source_url"),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  sentAt: timestamp("sent_at").defaultNow(),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
});
export type MetaCapiEvent = typeof metaCapiEvents.$inferSelect;
export type InsertMetaCapiEvent = typeof metaCapiEvents.$inferInsert;

// ─── Mobile: Push Notification Schedules ─────────────────────────────────────
export const mobilePushSchedules = pgTable("mobile_push_schedules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  targetAudience: pushTargetEnum("targetAudience").default("all").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  cronExpression: varchar("cronExpression", { length: 100 }),
  recurring: boolean("recurring").default(false).notNull(),
  deepLinkPath: varchar("deepLinkPath", { length: 500 }),
  imageUrl: text("imageUrl"),
  enabled: boolean("enabled").default(true).notNull(),
  sentCount: integer("sentCount").default(0).notNull(),
  lastSentAt: timestamp("lastSentAt"),
  status: pushStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type MobilePushSchedule = typeof mobilePushSchedules.$inferSelect;
export type InsertMobilePushSchedule = typeof mobilePushSchedules.$inferInsert;

// ─── AI Conversations ─────────────────────────────────────────────────────────
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  context: varchar("context", { length: 100 }).default("general").notNull(),
  messages: json("messages").$type<Array<{ role: "user" | "assistant" | "system"; content: string; timestamp: number }>>().default([]).notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

// ── Email Subscribers ─────────────────────────────────────────────────────────
export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  status: emailSubscriberStatusEnum("status").default("subscribed").notNull(),
  source: varchar("source", { length: 50 }).default("landing_page").notNull(), // landing_page, blog, referral, etc.
  dripsCompleted: integer("dripsCompleted").default(0).notNull(), // Track which drip emails have been sent (0-5)
  lastDripSentAt: timestamp("lastDripSentAt"),
  metadata: json("metadata").$type<Record<string, unknown>>(), // Store custom data like utm params, referral source, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribers.$inferInsert;


// ── Document Embeddings (RAG) ─────────────────────────────────────────────────
export const documentEmbeddings = pgTable("document_embeddings", {
  id: serial("id").primaryKey(),
  docId: varchar("docId", { length: 100 }).notNull(), // e.g., "case-study-1", "integration-claude"
  docTitle: varchar("docTitle", { length: 255 }).notNull(), // e.g., "Cathedral Framework Case Study"
  chunk: text("chunk").notNull(), // Text chunk (max 1000 chars)
  chunkIndex: integer("chunkIndex").notNull(), // Order within document
  embedding: json("embedding").$type<number[]>().notNull(), // Claude embeddings (1536-dim array)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type InsertDocumentEmbedding = typeof documentEmbeddings.$inferInsert;

// ── Governance: Audit Logs ─────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  oldValue: json("old_value").$type<Record<string, unknown>>(),
  newValue: json("new_value").$type<Record<string, unknown>>(),
  decisionAuthority: varchar("decision_authority", { length: 100 }),
  escalationTriggered: boolean("escalation_triggered").default(false).notNull(),
  escalationReason: text("escalation_reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ── Governance: Escalation Queue ───────────────────────────────────────────────
export const escalationQueue = pgTable("escalation_queue", {
  id: serial("id").primaryKey(),
  auditLogId: integer("audit_log_id").notNull(),
  decisionType: varchar("decision_type", { length: 100 }).notNull(),
  decisionContext: json("decision_context").$type<Record<string, unknown>>().notNull(),
  thresholdExceeded: decimal("threshold_exceeded", { precision: 10, scale: 2 }),
  thresholdLimit: decimal("threshold_limit", { precision: 10, scale: 2 }),
  authorityLevel: varchar("authority_level", { length: 50 }),
  requiredApprovals: integer("required_approvals").default(1).notNull(),
  approvalsReceived: integer("approvals_received").default(0).notNull(),
  status: escalationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by"),
  resolutionNotes: text("resolution_notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type EscalationQueueItem = typeof escalationQueue.$inferSelect;
export type InsertEscalationQueueItem = typeof escalationQueue.$inferInsert;

// ── Governance: Decision Authority ─────────────────────────────────────────────
export const decisionAuthority = pgTable("decision_authority", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  authorityLevel: authorityLevelEnum("authority_level").default("operator").notNull(),
  approvalThreshold: decimal("approval_threshold", { precision: 10, scale: 2 }),
  canOverrideDecisions: boolean("can_override_decisions").default(false).notNull(),
  canModifyGovernance: boolean("can_modify_governance").default(false).notNull(),
  canAccessAuditLogs: boolean("can_access_audit_logs").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DecisionAuthorityRecord = typeof decisionAuthority.$inferSelect;
export type InsertDecisionAuthority = typeof decisionAuthority.$inferInsert;

// ── Governance: Kill Switches ──────────────────────────────────────────────────
export const killSwitches = pgTable("kill_switches", {
  id: serial("id").primaryKey(),
  switchName: varchar("switch_name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  triggeredBy: integer("triggered_by"),
  triggeredAt: timestamp("triggered_at"),
  reason: text("reason"),
  autoResetEnabled: boolean("auto_reset_enabled").default(false).notNull(),
  autoResetAt: timestamp("auto_reset_at"),
  impactScope: varchar("impact_scope", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type KillSwitch = typeof killSwitches.$inferSelect;
export type InsertKillSwitch = typeof killSwitches.$inferInsert;

// ── Governance: Rules ──────────────────────────────────────────────────────────
export const governanceRules = pgTable("governance_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: governanceRuleTypeEnum("rule_type").notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  conditionJson: json("condition_json").$type<Record<string, unknown>>().notNull(),
  actionOnViolation: violationActionEnum("action_on_violation").default("escalate").notNull(),
  authorityLevelRequired: varchar("authority_level_required", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type GovernanceRule = typeof governanceRules.$inferSelect;
export type InsertGovernanceRule = typeof governanceRules.$inferInsert;

// ── Governance: Metrics ────────────────────────────────────────────────────────
export const governanceMetrics = pgTable("governance_metrics", {
  id: serial("id").primaryKey(),
  metricDate: date("metric_date").notNull(),
  totalOperations: integer("total_operations").default(0).notNull(),
  escalationsTriggered: integer("escalations_triggered").default(0).notNull(),
  escalationsApproved: integer("escalations_approved").default(0).notNull(),
  escalationsRejected: integer("escalations_rejected").default(0).notNull(),
  killSwitchesActivated: integer("kill_switches_activated").default(0).notNull(),
  averageEscalationTimeMinutes: integer("average_escalation_time_minutes"),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type GovernanceMetric = typeof governanceMetrics.$inferSelect;

// ── Developer API Keys ────────────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(), // e.g. "uo_live_a1b2c3d4"
  keyHash: varchar("keyHash", { length: 64 }).notNull(),     // SHA-256 hex of full key
  scopes: json("scopes").$type<string[]>().notNull().default([]),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ── User Preferences ─────────────────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  pushNotifications: boolean("pushNotifications").default(true).notNull(),
  orderUpdates: boolean("orderUpdates").default(true).notNull(),
  teamAlerts: boolean("teamAlerts").default(true).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  weeklyDigest: boolean("weeklyDigest").default(true).notNull(),
  analyticsSharing: boolean("analyticsSharing").default(true).notNull(),
  theme: varchar("theme", { length: 20 }).default("dark").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ─── Gig Worker Plans ─────────────────────────────────────────────────────────
// A separate plan catalog for individual gig workers (per-user, not per-tenant).
// Tiers: starter (free), pro ($9.99/mo), elite ($24.99/mo).
export const gigWorkerPlans = pgTable("gig_worker_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  tier: gigWorkerPlanTierEnum("tier").notNull(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripePriceIdYearly", { length: 100 }),
  // Monthly AI credit quota (number of LLM requests)
  monthlyAICredits: integer("monthlyAICredits").notNull().default(50),
  // Feature flags as JSON array, e.g. ["route_optimizer","tax_export","earnings_forecast"]
  features: json("features").$type<string[]>().notNull().default([]),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GigWorkerPlan = typeof gigWorkerPlans.$inferSelect;
export type InsertGigWorkerPlan = typeof gigWorkerPlans.$inferInsert;

// ─── Gig Worker Subscriptions ─────────────────────────────────────────────────
// One active subscription row per user for the gig worker add-on.
export const gigWorkerSubscriptions = pgTable("gig_worker_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  planId: integer("planId").notNull(),
  status: gigWorkerSubStatusEnum("status").notNull().default("none"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  trialEnd: timestamp("trialEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GigWorkerSubscription = typeof gigWorkerSubscriptions.$inferSelect;
export type InsertGigWorkerSubscription = typeof gigWorkerSubscriptions.$inferInsert;

// ─── Gig AI Usage ─────────────────────────────────────────────────────────────
// Tracks AI LLM call consumption per user within each billing period.
export const gigAIUsage = pgTable(
  "gig_ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    // ISO date string for the billing month, e.g. "2025-04"
    billingPeriod: varchar("billingPeriod", { length: 7 }).notNull(),
    // Number of AI requests consumed
    requestsUsed: integer("requestsUsed").notNull().default(0),
    // Total tokens consumed (input + output)
    tokensUsed: integer("tokensUsed").notNull().default(0),
    // Context that triggered the usage (gig-command, money-manager, etc.)
    lastContext: varchar("lastContext", { length: 100 }),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    // Enforces one row per user per billing month; required for the atomic
    // INSERT … ON CONFLICT DO UPDATE upsert in incrementGigAIUsage.
    gigAIUsageUserPeriodIdx: uniqueIndex("gig_ai_usage_user_billing_period_idx").on(
      table.userId,
      table.billingPeriod,
    ),
  }),
);
export type GigAIUsage = typeof gigAIUsage.$inferSelect;
export type InsertGigAIUsage = typeof gigAIUsage.$inferInsert;

// ─── Clippers Jobs ─────────────────────────────────────────────────────────────
export const clippingJobs = pgTable(
  "clipping_jobs",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    sourceType: clippingSourceTypeEnum("sourceType").notNull().default("url"),
    sourceUrl: text("sourceUrl"),
    sourceStorageKey: text("sourceStorageKey"),
    status: clippingJobStatusEnum("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    currentStage: varchar("currentStage", { length: 64 })
      .notNull()
      .default("queued"),
    errorMessage: text("errorMessage"),
    requestedClipCount: integer("requestedClipCount").notNull().default(10),
    options: jsonb("options")
      .$type<{
        aspectRatio?: "9:16" | "1:1";
        captionStyle?: "default" | "bold" | "minimal";
        language?: string;
      }>()
      .notNull()
      .default({}),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    clipJobTenantCreatedIdx: index("clipping_jobs_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
    clipJobTenantStatusIdx: index("clipping_jobs_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
    clipJobProgressRange: check(
      "clipping_jobs_progress_range",
      sql`${table.progress} >= 0 AND ${table.progress} <= 100`
    ),
    clipRequestedCountRange: check(
      "clipping_jobs_requested_count_range",
      sql`${table.requestedClipCount} >= 1 AND ${table.requestedClipCount} <= 20`
    ),
  })
);
export type ClippingJob = typeof clippingJobs.$inferSelect;
export type InsertClippingJob = typeof clippingJobs.$inferInsert;

// ─── Clippers Generated Clips ──────────────────────────────────────────────────
export const clips = pgTable(
  "clips",
  {
    id: serial("id").primaryKey(),
    jobId: integer("jobId").notNull(),
    tenantId: integer("tenantId").notNull(),
    index: integer("index").notNull(),
    title: varchar("title", { length: 255 }),
    storageKey: text("storageKey").notNull(),
    durationSec: integer("durationSec").notNull().default(0),
    startSec: integer("startSec").notNull().default(0),
    endSec: integer("endSec").notNull().default(0),
    highlightScore: decimal("highlightScore", { precision: 6, scale: 3 }),
    captionsStorageKey: text("captionsStorageKey"),
    thumbnailStorageKey: text("thumbnailStorageKey"),
    sizeBytes: integer("sizeBytes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    clipsJobIdx: index("clips_job_idx").on(table.jobId),
    clipsTenantJobIdx: index("clips_tenant_job_idx").on(table.tenantId, table.jobId),
    clipsUniqueJobIndex: uniqueIndex("clips_job_index_unique_idx").on(
      table.jobId,
      table.index
    ),
    clipsDurationNonNegative: check(
      "clips_duration_non_negative",
      sql`${table.durationSec} >= 0`
    ),
  })
);
export type Clip = typeof clips.$inferSelect;
export type InsertClip = typeof clips.$inferInsert;

// ─── Clippers Subscriptions ────────────────────────────────────────────────────
export const clippingSubscriptions = pgTable(
  "clipping_subscriptions",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull().unique(),
    userId: integer("userId").notNull(),
    plan: clippingPlanEnum("plan").notNull().default("free"),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
    stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
    stripePriceId: varchar("stripePriceId", { length: 100 }),
    status: subscriptionStatusEnum("status").notNull().default("none"),
    monthlyJobQuota: integer("monthlyJobQuota").notNull().default(3),
    jobsUsedThisPeriod: integer("jobsUsedThisPeriod").notNull().default(0),
    periodStart: timestamp("periodStart").notNull().defaultNow(),
    periodEnd: timestamp("periodEnd").notNull().defaultNow(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    clippingSubStatusIdx: index("clipping_sub_status_idx").on(
      table.status,
      table.updatedAt
    ),
    clippingSubUsageNonNegative: check(
      "clipping_sub_usage_non_negative",
      sql`${table.jobsUsedThisPeriod} >= 0`
    ),
    clippingSubQuotaPositive: check(
      "clipping_sub_quota_positive",
      sql`${table.monthlyJobQuota} >= 0`
    ),
  })
);
export type ClippingSubscription = typeof clippingSubscriptions.$inferSelect;
export type InsertClippingSubscription =
  typeof clippingSubscriptions.$inferInsert;

// ─── SEO Content Jobs ─────────────────────────────────────────────────────────
// Tracks AI-generated SEO content (blog posts, landing pages, FAQ expansions)
// created by the weekly seo-content-generator-scheduled cron job.
export const seoContentJobs = pgTable(
  "seo_content_jobs",
  {
    id: serial("id").primaryKey(),
    // URL-safe slug for this piece of content, e.g. "unifyone-vs-woocommerce"
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    type: seoContentTypeEnum("type").notNull().default("blog_post"),
    status: seoContentJobStatusEnum("status").notNull().default("pending"),
    // Topic string used to prompt the LLM
    topic: varchar("topic", { length: 500 }).notNull(),
    // Comma-separated target keywords fed to the LLM
    targetKeywords: json("targetKeywords").$type<string[]>().notNull().default([]),
    // Generated page fields (null until generated)
    title: varchar("title", { length: 500 }),
    h1: varchar("h1", { length: 500 }),
    tagline: text("tagline"),
    description: text("description"),
    keywords: json("keywords").$type<string[]>(),
    sections: json("sections").$type<Array<{
      heading: string;
      paragraphs: string[];
      bullets?: string[];
    }>>(),
    faq: json("faq").$type<Array<{ q: string; a: string }>>(),
    related: json("related").$type<string[]>(),
    // Cron run identifier (ISO timestamp of the run that created this)
    runId: varchar("runId", { length: 64 }),
    errorMessage: text("errorMessage"),
    generatedAt: timestamp("generatedAt"),
    publishedAt: timestamp("publishedAt"),
    // Optional: schedule for future generation
    scheduledFor: timestamp("scheduledFor"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    seoJobStatusIdx: index("seo_content_jobs_status_idx").on(
      table.status,
      table.createdAt
    ),
    seoJobTypeStatusIdx: index("seo_content_jobs_type_status_idx").on(
      table.type,
      table.status
    ),
  })
);
export type SeoContentJob = typeof seoContentJobs.$inferSelect;
export type InsertSeoContentJob = typeof seoContentJobs.$inferInsert;

// ── CLI ───────────────────────────────────────────────────────────────────────

export const cliModeEnum = pgEnum("cli_mode", ["platform", "vps", "local"]);

/**
 * Tracks active and historical CLI sessions (all three modes).
 * Rows are created when a session begins and updated when it ends.
 */
export const cliSessions = pgTable("cli_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  mode: cliModeEnum("mode").notNull().default("platform"),
  /** FK to cli_vps_connections.id — only set when mode = 'vps'. */
  vpsId: integer("vpsId"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  exitCode: integer("exitCode"),
});
export type CliSession = typeof cliSessions.$inferSelect;
export type InsertCliSession = typeof cliSessions.$inferInsert;

/**
 * Saved VPS / remote host configurations per user.
 * Private keys are stored AES-256-GCM encrypted and are never returned to the client.
 */
export const cliVpsConnections = pgTable("cli_vps_connections", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  userId: integer("userId").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(22),
  username: varchar("username", { length: 64 }).notNull(),
  /** AES-256-GCM encrypted private key (hex-encoded). Null if password auth is used. */
  encryptedPrivateKey: text("encryptedPrivateKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type CliVpsConnection = typeof cliVpsConnections.$inferSelect;
export type InsertCliVpsConnection = typeof cliVpsConnections.$inferInsert;

/**
 * Per-session command history — one row per command executed.
 * Used for the history tRPC query and the admin audit log.
 */
export const cliCommandHistory = pgTable(
  "cli_command_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    tenantId: integer("tenantId"),
    sessionId: integer("sessionId"),
    command: text("command").notNull(),
    output: text("output"),
    exitCode: integer("exitCode"),
    executedAt: timestamp("executedAt").defaultNow().notNull(),
  },
  table => ({
    cliHistoryUserIdx: index("cli_command_history_user_idx").on(
      table.userId,
      table.executedAt
    ),
    cliHistoryTenantIdx: index("cli_command_history_tenant_idx").on(
      table.tenantId,
      table.executedAt
    ),
  })
);
export type CliCommandHistory = typeof cliCommandHistory.$inferSelect;
export type InsertCliCommandHistory = typeof cliCommandHistory.$inferInsert;

// ── Stripe Payment Audit ────────────────────────────────────────────────────
//
// Records every successful Stripe verification before the corresponding order
// row is written. Provides idempotency (a retry with the same Stripe id
// returns the previously-linked order) and orphan detection (audit rows that
// stay unlinked beyond a grace window indicate a DB write that failed after
// Stripe captured the payment).
export const stripePaymentAuditStatusEnum = pgEnum(
  "stripe_payment_audit_status",
  ["pending", "linked", "orphaned"]
);

export const stripePaymentAudit = pgTable(
  "stripe_payment_audit",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenantId").notNull(),
    userId: integer("userId").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 200 }).notNull(),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
    stripeSessionId: varchar("stripeSessionId", { length: 100 }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: stripePaymentAuditStatusEnum("status")
      .notNull()
      .default("pending"),
    linkedOrderId: integer("linkedOrderId"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdempotencyIdx: uniqueIndex("stripe_payment_audit_tenant_key_idx").on(
      table.tenantId,
      table.idempotencyKey
    ),
    statusCreatedIdx: index("stripe_payment_audit_status_created_idx").on(
      table.status,
      table.createdAt
    ),
  })
);
export type StripePaymentAudit = typeof stripePaymentAudit.$inferSelect;
export type InsertStripePaymentAudit = typeof stripePaymentAudit.$inferInsert;

// ── Refresh Tokens ────────────────────────────────────────────────────────────
//
// Stores opaque refresh tokens that back short-lived access JWTs.
// When the access JWT expires the client presents its HttpOnly refresh cookie
// to POST /api/auth/refresh; the server verifies the token hash, rotates
// (deletes old, issues new), and returns a fresh access JWT + new refresh token.
//
// Revocation: setting revokedAt prevents the token from being used again.
// The access JWT's short lifetime (7 days) limits blast radius if stolen.
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  /** SHA-256 hex digest of the raw token (raw token is never stored). */
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  /** Device/browser identity for the session management UI. */
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// ── Stripe Webhook Events (forensic log + idempotency) ────────────────────────
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // received | processed | failed
  errorMessage: text("error_message"),
  livemode: boolean("livemode").default(false).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── PayPal Webhook Events (forensic log + idempotency) ───────────────────────
// Mirror of stripeWebhookEvents for PayPal. eventId is the `id` field on the
// PayPal webhook envelope (e.g. "WH-xxxx-xxxx") which is unique per delivery,
// guaranteeing idempotency.
export const paypalWebhookEvents = pgTable("paypal_webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // received | processed | failed
  errorMessage: text("error_message"),
  livemode: boolean("livemode").default(false).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Square Webhook Events (forensic log + idempotency) ───────────────────────
// Mirror of stripeWebhookEvents for Square. eventId is the `event_id` field on
// the Square webhook envelope (UUID) which is unique per delivery.
export const squareWebhookEvents = pgTable("square_webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // received | processed | failed
  errorMessage: text("error_message"),
  livemode: boolean("livemode").default(false).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// ─────────────────────────────────────────────────────────────────────────────
// Impact.com S2S Affiliate Tracking
//
// Click capture → conversion firing for the Impact.com affiliate network.
// Two tables:
//   * impact_clicks      — every inbound ?im_ref=… landing
//   * impact_conversions — every conversion postback fired to Impact's S2S API
//
// Privacy: ipHash is SHA-256 of the IP, never the raw address.
// Idempotency: stripe_session_id is UNIQUE on conversions so a replayed
// Stripe webhook can never double-fire.
// ─────────────────────────────────────────────────────────────────────────────
export const impactClicks = pgTable(
  "impact_clicks",
  {
    id: serial("id").primaryKey(),
    /** Server-issued opaque ID (32 hex chars) — what we send to Impact as SubId. */
    clickId: varchar("click_id", { length: 64 }).notNull().unique(),
    /** Raw value of the ?im_ref= query param (partner-supplied). */
    imRef: varchar("im_ref", { length: 200 }).notNull(),
    /** Landing page URL with the affiliate parameter intact. */
    landingUrl: text("landing_url"),
    /** SHA-256 hex of the client IP. Never the raw IP. */
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    referer: text("referer"),
    /** When known (post-signup), link the click back to the user. */
    userId: integer("user_id"),
    /** Set when the conversion is fired, so we can compute funnel rate. */
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    imRefIdx: index("impact_clicks_im_ref_idx").on(table.imRef),
    userIdx: index("impact_clicks_user_id_idx").on(table.userId),
    createdAtIdx: index("impact_clicks_created_at_idx").on(table.createdAt),
  })
);
export type ImpactClick = typeof impactClicks.$inferSelect;
export type InsertImpactClick = typeof impactClicks.$inferInsert;

export const impactConversions = pgTable(
  "impact_conversions",
  {
    id: serial("id").primaryKey(),
    clickId: varchar("click_id", { length: 64 }).notNull(),
    /** The Stripe checkout session that triggered this conversion. UNIQUE => idempotent. */
    stripeSessionId: varchar("stripe_session_id", { length: 100 })
      .notNull()
      .unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    /** Raw response from Impact's S2S endpoint for forensic replay. */
    impactResponse: json("impact_response").$type<Record<string, unknown>>(),
    /** HTTP status from the Impact API (null if local-only / dry-run). */
    httpStatus: integer("http_status"),
    /** True if posted successfully to Impact (2xx); false on error. */
    success: boolean("success").default(false).notNull(),
    firedAt: timestamp("fired_at").defaultNow().notNull(),
  },
  table => ({
    clickIdx: index("impact_conversions_click_id_idx").on(table.clickId),
    firedAtIdx: index("impact_conversions_fired_at_idx").on(table.firedAt),
  })
);
export type ImpactConversion = typeof impactConversions.$inferSelect;
export type InsertImpactConversion = typeof impactConversions.$inferInsert;


// ─────────────────────────────────────────────────────────────────────────────
// Deploy Events (Netlify outgoing-webhook receiver)
//
// Persistent, idempotent log of every Netlify deploy event we receive at
// /api/deploys/notify. UNIQUE on deployId so Netlify retries are no-ops and
// we have forensic history when investigating outages (e.g. "what was the
// last successful deploy before this fire?").
// ─────────────────────────────────────────────────────────────────────────────
export const deployEvents = pgTable(
  "deploy_events",
  {
    id: serial("id").primaryKey(),
    /** Netlify deploy ID; UNIQUE so the same event can't be persisted twice. */
    deployId: varchar("deploy_id", { length: 64 }).notNull().unique(),
    /** Netlify site ID — useful when we add more sites later. */
    siteId: varchar("site_id", { length: 64 }),
    /** Deploy state: ready / error / failed / timeout / broken / building / … */
    state: varchar("state", { length: 32 }).notNull(),
    branch: varchar("branch", { length: 120 }),
    commitRef: varchar("commit_ref", { length: 64 }),
    errorMessage: text("error_message"),
    /** Full Netlify payload as jsonb so we can mine it later. */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  table => ({
    stateIdx: index("deploy_events_state_idx").on(table.state),
    receivedAtIdx: index("deploy_events_received_at_idx").on(table.receivedAt),
    siteIdIdx: index("deploy_events_site_id_idx").on(table.siteId),
  })
);
export type DeployEvent = typeof deployEvents.$inferSelect;
export type InsertDeployEvent = typeof deployEvents.$inferInsert;
