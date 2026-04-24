import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigserial,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Tables mirror infra/neon/0003_spire_foundation.sql. Keep these in sync —
// the SQL file is the source of truth for DDL (indexes, triggers, constraints
// not representable in Drizzle are defined there). This file exists so the
// TypeScript code can query/insert with type safety.

export const sites = pgTable("spire_sites", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  domain: text("domain").notNull(),
  repo: text("repo").notNull(),
  contentPath: text("content_path").notNull(),
  brandBriefKey: text("brand_brief_key").notNull(),
  niche: text("niche").notNull(),
  targetAudiences: text("target_audiences").array().notNull(),
  tier: text("tier").notNull().default("foundation"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const keywords = pgTable(
  "spire_keywords",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    cluster: text("cluster"),
    intent: text("intent"),
    priority: integer("priority").notNull().default(50),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    siteTermUnique: uniqueIndex("spire_keywords_site_term_key").on(
      t.siteId,
      t.term
    ),
    queueIdx: index("spire_keywords_queue_idx").on(
      t.siteId,
      t.status,
      t.priority
    ),
  })
);

export const contentPlan = pgTable(
  "spire_content_plan",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id").references(() => keywords.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    targetKeyword: text("target_keyword").notNull(),
    title: text("title"),
    brief: jsonb("brief"),
    contentMd: text("content_md"),
    wordCount: integer("word_count"),
    qualityScore: integer("quality_score"),
    qualityReport: jsonb("quality_report"),
    status: text("status").notNull().default("queued"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    commitSha: text("commit_sha"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    siteSlugUnique: uniqueIndex("spire_content_plan_site_slug_key").on(
      t.siteId,
      t.slug
    ),
    queueIdx: index("spire_content_plan_queue_idx").on(
      t.siteId,
      t.status,
      t.createdAt
    ),
  })
);

export const runs = pgTable(
  "spire_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    trigger: text("trigger").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    planned: integer("planned").notNull().default(0),
    generated: integer("generated").notNull().default(0),
    published: integer("published").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    log: jsonb("log"),
  },
  t => ({
    siteStartedIdx: index("spire_runs_site_started_idx").on(
      t.siteId,
      t.startedAt
    ),
  })
);

// --- Batch 04: distribution tables ---
// SQL lives in infra/neon/0004_spire_distribution.sql. Indexes, CHECK
// constraints, and the updated_at trigger on spire_submissions are declared
// there; this file is the query/insert surface only.

export const directories = pgTable("spire_directories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  submitUrl: text("submit_url"),
  method: text("method").notNull(),
  methodConfig: jsonb("method_config").notNull(),
  authority: integer("authority"),
  category: text("category")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  cooldownDays: integer("cooldown_days").notNull().default(90),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const submissions = pgTable(
  "spire_submissions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    directoryId: uuid("directory_id")
      .notNull()
      .references(() => directories.id, { onDelete: "restrict" }),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    liveUrl: text("live_url"),
    response: jsonb("response"),
    error: text("error"),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    siteDirectoryUnique: uniqueIndex("spire_submissions_site_directory_key").on(
      t.siteId,
      t.directoryId
    ),
    queueIdx: index("spire_submissions_queue_idx").on(t.status, t.queuedAt),
  })
);

export const meshTopics = pgTable("spire_mesh_topics", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  cluster: text("cluster").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
});

export const meshCoverage = pgTable(
  "spire_mesh_coverage",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => meshTopics.id, { onDelete: "cascade" }),
    primaryPath: text("primary_path").notNull(),
    authorityWeight: integer("authority_weight").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    coverageUnique: uniqueIndex("spire_mesh_coverage_site_topic_path_key").on(
      t.siteId,
      t.topicId,
      t.primaryPath
    ),
    topicWeightIdx: index("spire_mesh_coverage_topic_weight_idx").on(
      t.topicId,
      t.authorityWeight
    ),
  })
);

export const trackedKeywords = pgTable(
  "spire_tracked_keywords",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => keywords.id, { onDelete: "cascade" }),
    targetUrl: text("target_url").notNull(),
    locationCode: integer("location_code").notNull().default(2840),
    languageCode: text("language_code").notNull().default("en"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    trackedUnique: uniqueIndex(
      "spire_tracked_keywords_site_keyword_loc_key"
    ).on(t.siteId, t.keywordId, t.locationCode),
    activeIdx: index("spire_tracked_keywords_active_idx").on(
      t.active,
      t.siteId
    ),
  })
);

export const rankChecks = pgTable(
  "spire_rank_checks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    trackedKeywordId: uuid("tracked_keyword_id")
      .notNull()
      .references(() => trackedKeywords.id, { onDelete: "cascade" }),
    rank: integer("rank"),
    urlFound: text("url_found"),
    serpFeatures: jsonb("serp_features"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    keywordTimeIdx: index("spire_rank_checks_keyword_time_idx").on(
      t.trackedKeywordId,
      t.checkedAt
    ),
  })
);

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Keyword = typeof keywords.$inferSelect;
export type NewKeyword = typeof keywords.$inferInsert;
export type ContentPlan = typeof contentPlan.$inferSelect;
export type NewContentPlan = typeof contentPlan.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Directory = typeof directories.$inferSelect;
export type NewDirectory = typeof directories.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type MeshTopic = typeof meshTopics.$inferSelect;
export type MeshCoverage = typeof meshCoverage.$inferSelect;
export type TrackedKeyword = typeof trackedKeywords.$inferSelect;
export type RankCheck = typeof rankChecks.$inferSelect;

// Avoid unused-import lint warnings in IDEs when `check` isn't used — Drizzle
// CHECK constraints live in the SQL file; export it so downstream modules can
// import if ever needed.
void check;
