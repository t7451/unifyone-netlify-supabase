import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  tenantId: int("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  creditBalance: int("creditBalance").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Plans ─────────────────────────────────────────────────────────────────────
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).notNull().default("0.00"),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripePriceIdYearly", { length: 100 }),
  maxProducts: int("maxProducts").default(100),
  maxOrders: int("maxOrders").default(1000),
  maxUsers: int("maxUsers").default(5),
  features: json("features").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logoUrl: text("logoUrl"),
  ownerId: int("ownerId").notNull(),
  planId: int("planId"),
  status: mysqlEnum("status", ["active", "suspended", "trial", "cancelled"]).default("trial").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "past_due", "cancelled", "trialing", "none"]).default("none").notNull(),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),
  shopifyShopDomain: varchar("shopifyShopDomain", { length: 255 }),
  shopifyAccessToken: text("shopifyAccessToken"),
  shopifySyncEnabled: boolean("shopifySyncEnabled").default(false),
  shopifyCheckoutUrl: text("shopifyCheckoutUrl"),
  n8nWebhookUrl: text("n8nWebhookUrl"),
  settings: json("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ── Categories ────────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parentId"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ── Products ──────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  categoryId: int("categoryId"),
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
  status: mysqlEnum("status", ["active", "draft", "archived"]).default("draft").notNull(),
  trackInventory: boolean("trackInventory").default(true),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  shopifyProductId: varchar("shopifyProductId", { length: 100 }),
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(0).notNull(),
  reservedQuantity: int("reservedQuantity").default(0).notNull(),
  lowStockThreshold: int("lowStockThreshold").default(10),
  location: varchar("location", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  shopifyCustomerId: varchar("shopifyCustomerId", { length: 100 }),
  totalOrders: int("totalOrders").default(0),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0.00"),
  tags: json("tags").$type<string[]>(),
  address: json("address").$type<{
    line1?: string; line2?: string; city?: string;
    state?: string; zip?: string; country?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  customerId: int("customerId"),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded", "partial"]).default("pending").notNull(),
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["unfulfilled", "partial", "fulfilled", "returned"]).default("unfulfilled").notNull(),
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
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "paypal", "shopify", "manual", "other"]),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ── Order Items ───────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  tenantId: int("tenantId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 500 }).notNull(),
  productSku: varchar("productSku", { length: 100 }),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
});

export type OrderItem = typeof orderItems.$inferSelect;

// ── Cart Items ────────────────────────────────────────────────────────────────
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ── Analytics Events ──────────────────────────────────────────────────────────
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  userId: int("userId"),
  orderId: int("orderId"),
  productId: int("productId"),
  value: decimal("value", { precision: 12, scale: 2 }),
  properties: json("properties").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Webhook Events ────────────────────────────────────────────────────────────
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  source: mysqlEnum("source", ["stripe", "shopify", "n8n", "internal"]).notNull(),
  eventType: varchar("eventType", { length: 200 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  status: mysqlEnum("status", ["pending", "processed", "failed", "skipped"]).default("pending").notNull(),
  error: text("error"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

// ── Team Invites ──────────────────────────────────────────────────────────────
export const teamInvites = mysqlTable("team_invites", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

// ── Social Accounts ───────────────────────────────────────────────────────────
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "instagram", "linkedin", "facebook", "tiktok"]).notNull(),
  handle: varchar("handle", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  profileImageUrl: text("profileImageUrl"),
  followerCount: int("followerCount").default(0),
  isConnected: boolean("isConnected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;

// ── Social Posts ──────────────────────────────────────────────────────────────
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  platforms: json("platforms").$type<string[]>().notNull(),
  mediaUrls: json("mediaUrls").$type<string[]>(),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed", "cancelled"]).default("draft").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

// ── Referrals ─────────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredEmail: varchar("referredEmail", { length: 320 }),
  referredUserId: int("referredUserId"),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  platform: varchar("platform", { length: 50 }),
  utmSource: varchar("utmSource", { length: 100 }),
  status: mysqlEnum("status", ["clicked", "signed_up", "converted", "expired"]).default("clicked").notNull(),
  creditsAwarded: int("creditsAwarded").default(0),
  clickCount: int("clickCount").default(0),
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ── Credit Transactions ───────────────────────────────────────────────────────
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["earned", "redeemed", "expired", "bonus", "adjustment"]).notNull(),
  source: mysqlEnum("source", ["referral_click", "referral_signup", "referral_conversion", "social_share", "subscription_redemption", "admin", "bonus"]).notNull(),
  description: varchar("description", { length: 500 }),
  balanceAfter: int("balanceAfter").notNull(),
  referralId: int("referralId"),
  socialPostId: int("socialPostId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
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
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"]).default("new").notNull(),
  assignedTo: int("assignedTo"),
  notes: text("notes"),
  // Automation tracking
  n8nTriggered: boolean("n8nTriggered").default(false),
  zapierTriggered: boolean("zapierTriggered").default(false),
  mailchimpSubscribed: boolean("mailchimpSubscribed").default(false),
  notificationSent: boolean("notificationSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ── n8n Workflows ─────────────────────────────────────────────────────────────
export const n8nWorkflows = mysqlTable("n8n_workflows", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("triggerEvent", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  payloadTemplate: json("payloadTemplate").$type<Record<string, unknown>>(),
  enabled: boolean("enabled").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: int("triggerCount").default(0),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type N8nWorkflow = typeof n8nWorkflows.$inferSelect;
export type InsertN8nWorkflow = typeof n8nWorkflows.$inferInsert;

// ── Zapier Hooks ──────────────────────────────────────────────────────────────
export const zapierHooks = mysqlTable("zapier_hooks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  name: varchar("name", { length: 255 }).notNull(),
  triggerEvent: varchar("triggerEvent", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: int("triggerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ZapierHook = typeof zapierHooks.$inferSelect;

// ── Mailchimp Config ──────────────────────────────────────────────────────────
export const mailchimpConfig = mysqlTable("mailchimp_config", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").unique(),
  apiKey: text("apiKey"),
  serverPrefix: varchar("serverPrefix", { length: 10 }),
  listId: varchar("listId", { length: 100 }),
  tagPrefix: varchar("tagPrefix", { length: 100 }).default("unifyone"),
  enabled: boolean("enabled").default(false).notNull(),
  subscriberCount: int("subscriberCount").default(0),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MailchimpConfig = typeof mailchimpConfig.$inferSelect;

// ── In-App Notifications ──────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
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
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ── Announcement Dismissals (per-user) ────────────────────────────────────────
export const announcementDismissals = mysqlTable("announcement_dismissals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  announcementId: int("announcementId").notNull(),
  dismissedAt: timestamp("dismissedAt").defaultNow().notNull(),
});
export type AnnouncementDismissal = typeof announcementDismissals.$inferSelect;

// ── Notification Event Triggers (per-event webhook/email config) ──────────────
export const notificationTriggers = mysqlTable("notification_triggers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  // event: order.created | order.status_changed | payment.received | lead.submitted | team.invite_accepted | social.post_published
  n8nEnabled: boolean("n8nEnabled").default(false).notNull(),
  zapierEnabled: boolean("zapierEnabled").default(false).notNull(),
  mailchimpEnabled: boolean("mailchimpEnabled").default(false).notNull(),
  slackWebhookUrl: text("slackWebhookUrl"),
  slackEnabled: boolean("slackEnabled").default(false).notNull(),
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  emailRecipients: text("emailRecipients"),
  // comma-separated email addresses
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NotificationTrigger = typeof notificationTriggers.$inferSelect;
export type InsertNotificationTrigger = typeof notificationTriggers.$inferInsert;

// ── Theme Store ───────────────────────────────────────────────────────────────
export const themeCategories = mysqlTable("theme_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ThemeCategory = typeof themeCategories.$inferSelect;

export const themes = mysqlTable("themes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  longDescription: text("longDescription"),
  authorId: int("authorId").notNull(),
  categoryId: int("categoryId"),
  // Pricing
  priceType: mysqlEnum("priceType", ["free", "paid", "subscription"]).notNull().default("free"),
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
  complexity: mysqlEnum("complexity", ["starter", "standard", "advanced"]).notNull().default("standard"),
  features: json("features").$type<string[]>().default([]),
  techStack: json("techStack").$type<string[]>().default([]),
  // Stats
  installCount: int("installCount").default(0).notNull(),
  reviewCount: int("reviewCount").default(0).notNull(),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00").notNull(),
  // Status
  status: mysqlEnum("status", ["draft", "pending_review", "published", "archived"]).notNull().default("draft"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;

export const themeInstalls = mysqlTable("theme_installs", {
  id: int("id").autoincrement().primaryKey(),
  themeId: int("themeId").notNull(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  // Payment tracking (null for free themes)
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0.00").notNull(),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});
export type ThemeInstall = typeof themeInstalls.$inferSelect;

export const themeReviews = mysqlTable("theme_reviews", {
  id: int("id").autoincrement().primaryKey(),
  themeId: int("themeId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 200 }),
  body: text("body"),
  helpful: int("helpful").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ThemeReview = typeof themeReviews.$inferSelect;

// ─── Rewards Keys ─────────────────────────────────────────────────────────────

export const rewardOpportunities = mysqlTable("reward_opportunities", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  credits: int("credits").notNull(),
  category: mysqlEnum("category", ["signup", "referral", "purchase", "engagement", "milestone", "promotion"]).notNull().default("engagement"),
  maxClaimsPerUser: int("maxClaimsPerUser").default(1).notNull(),
  totalMaxClaims: int("totalMaxClaims"), // null = unlimited
  claimCount: int("claimCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RewardOpportunity = typeof rewardOpportunities.$inferSelect;
export type InsertRewardOpportunity = typeof rewardOpportunities.$inferInsert;

export const rewardClaims = mysqlTable("reward_claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  opportunityId: int("opportunityId").notNull(),
  credits: int("credits").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "rejected"]).notNull().default("completed"),
  metaEventId: varchar("metaEventId", { length: 100 }), // for CAPI deduplication
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
});
export type RewardClaim = typeof rewardClaims.$inferSelect;
export type InsertRewardClaim = typeof rewardClaims.$inferInsert;

// ─── Meta CAPI Event Log ──────────────────────────────────────────────────────

export const metaPixelEvents = mysqlTable("meta_pixel_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  eventName: varchar("eventName", { length: 100 }).notNull(),
  eventId: varchar("eventId", { length: 100 }).notNull(), // deduplication key
  eventSourceUrl: varchar("eventSourceUrl", { length: 500 }),
  customData: json("customData"),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).notNull().default("sent"),
  responseCode: int("responseCode"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type MetaPixelEvent = typeof metaPixelEvents.$inferSelect;
export type InsertMetaPixelEvent = typeof metaPixelEvents.$inferInsert;

// ─── Revenue Streams ──────────────────────────────────────────────────────────

export const revenueStreams = mysqlTable("revenue_streams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["affiliate", "saas", "consulting", "physical", "digital", "passive"]).notNull(),
  platform: varchar("platform", { length: 100 }),
  monthlyValue: decimal("monthlyValue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }), // percentage
  status: mysqlEnum("status", ["active", "pending", "inactive", "broken"]).notNull().default("active"),
  affiliateLink: varchar("affiliateLink", { length: 1000 }),
  cookieDuration: int("cookieDuration"), // days
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RevenueStream = typeof revenueStreams.$inferSelect;
export type InsertRevenueStream = typeof revenueStreams.$inferInsert;

// ─── Affiliate Programs ───────────────────────────────────────────────────────

export const affiliatePrograms = mysqlTable("affiliate_programs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  platform: varchar("platform", { length: 100 }),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  commissionType: mysqlEnum("commissionType", ["percentage", "flat", "recurring"]).notNull().default("percentage"),
  cookieDuration: int("cookieDuration").default(30).notNull(), // days
  affiliateLink: varchar("affiliateLink", { length: 1000 }),
  monthlyEarnings: decimal("monthlyEarnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  pendingPayout: decimal("pendingPayout", { precision: 10, scale: 2 }).default("0.00").notNull(),
  instantPayout: boolean("instantPayout").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AffiliateProgram = typeof affiliatePrograms.$inferSelect;
export type InsertAffiliateProgram = typeof affiliatePrograms.$inferInsert;

// ─── Shopify OAuth Stores ─────────────────────────────────────────────────────
export const shopifyStores = mysqlTable("shopify_stores", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  userId: int("userId").notNull(),
  shopDomain: varchar("shopDomain", { length: 255 }).notNull().unique(),
  accessToken: varchar("accessToken", { length: 500 }).notNull(),
  scopes: text("scopes").notNull(),
  shopName: varchar("shopName", { length: 255 }),
  shopEmail: varchar("shopEmail", { length: 255 }),
  shopCurrency: varchar("shopCurrency", { length: 10 }).default("USD"),
  shopPlan: varchar("shopPlan", { length: 100 }),
  status: mysqlEnum("status", ["active", "suspended", "uninstalled"]).notNull().default("active"),
  lastSyncAt: timestamp("lastSyncAt"),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShopifyStore = typeof shopifyStores.$inferSelect;
export type InsertShopifyStore = typeof shopifyStores.$inferInsert;

// ─── Shopify Sync Audit Log ───────────────────────────────────────────────────
export const shopifySyncLog = mysqlTable("shopify_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  tenantId: int("tenantId"),
  event: varchar("event", { length: 100 }).notNull(),
  entity: mysqlEnum("entity", ["product", "order", "customer", "inventory", "fulfillment", "webhook"]).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull().default("inbound"),
  status: mysqlEnum("status", ["success", "failed", "skipped", "retrying"]).notNull(),
  latencyMs: int("latencyMs"),
  errorMsg: text("errorMsg"),
  retryCount: int("retryCount").default(0).notNull(),
  payload: json("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ShopifySyncLog = typeof shopifySyncLog.$inferSelect;
export type InsertShopifySyncLog = typeof shopifySyncLog.$inferInsert;

// ─── Shopify API Quota Tracking ───────────────────────────────────────────────
export const shopifyApiQuota = mysqlTable("shopify_api_quota", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  restCallsMade: int("restCallsMade").default(0).notNull(),
  restCallsLimit: int("restCallsLimit").default(40).notNull(),
  graphqlPointsUsed: int("graphqlPointsUsed").default(0).notNull(),
  graphqlPointsLimit: int("graphqlPointsLimit").default(1000).notNull(),
  throttledCount: int("throttledCount").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});
export type ShopifyApiQuota = typeof shopifyApiQuota.$inferSelect;
export type InsertShopifyApiQuota = typeof shopifyApiQuota.$inferInsert;

// ─── Sovereign Stack Waitlist ─────────────────────────────────────────────────
export const sovereignWaitlist = mysqlTable("sovereign_waitlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  currentStack: text("currentStack"),
  monthlyRevenue: mysqlEnum("monthlyRevenue", ["pre_revenue", "under_5k", "5k_25k", "25k_100k", "over_100k"]),
  biggestChallenge: text("biggestChallenge"),
  referralSource: varchar("referralSource", { length: 100 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  status: mysqlEnum("status", ["pending", "contacted", "qualified", "converted", "rejected"]).default("pending").notNull(),
  position: int("position"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SovereignWaitlist = typeof sovereignWaitlist.$inferSelect;
export type InsertSovereignWaitlist = typeof sovereignWaitlist.$inferInsert;
