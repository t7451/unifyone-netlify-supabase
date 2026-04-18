import {
  pgTable,
  text,
  timestamp,
  integer,
  bigserial,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // clerk user id
  email: text("email").notNull().unique(),
  orgId: text("org_id"),
  tier: text("tier").default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    refId: text("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  t => ({
    userCreatedIdx: index("credit_ledger_user_created_idx").on(
      t.userId,
      t.createdAt
    ),
  })
);

export const waitlist = pgTable(
  "waitlist",
  {
    email: text("email").primaryKey(),
    source: text("source"),
    utm: jsonb("utm"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  t => ({
    // The API normalizes to lowercase on write; this belt-and-suspenders
    // index prevents Alice@ and alice@ ever coexisting if the normalization
    // regresses.
    emailLowerUniq: uniqueIndex("waitlist_email_lower_idx").on(
      sql`lower(${t.email})`
    ),
  })
);
