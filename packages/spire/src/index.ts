export * as schema from "./schema.js";
export * as generator from "./generator/index.js";
export * as publisher from "./publisher/index.js";
export * as lib from "./lib/index.js";

// Re-export the most frequently-used APIs at top level for ergonomics.
export {
  createAnthropic,
  callClaude,
  connectNeon,
  loadEnv,
  logger,
  scrubForStorage,
  slugify,
} from "./lib/index.js";
export {
  expandKeywords,
  buildBrief,
  writeArticle,
  qualityGate,
} from "./generator/index.js";
export { publishArticle, buildFrontmatter } from "./publisher/index.js";

// Re-export the Drizzle schema objects so callers can import them without
// reaching into the namespace export. `schema` (the namespace) remains for
// callers that want the whole object, but most code uses named tables.
export { sites, keywords, contentPlan, runs } from "./schema.js";
export type { Site, Keyword, ContentPlan, Run } from "./schema.js";
