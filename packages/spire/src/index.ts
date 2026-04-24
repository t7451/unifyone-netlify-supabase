export * as schema from "./schema.js";
export * as generator from "./generator/index.js";
export * as publisher from "./publisher/index.js";
export * as lib from "./lib/index.js";
export * as mesh from "./mesh/index.js";
export * as rank from "./rank/index.js";
// NOTE: no `export * as directories from "./directories/index.js"` —
// it would collide with the `directories` table re-export below, and the
// named exports after this block cover the same surface.

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
export {
  sites,
  keywords,
  contentPlan,
  runs,
  directories,
  submissions,
  meshTopics,
  meshCoverage,
  trackedKeywords,
  rankChecks,
  outreachProspects,
  submissionCitations,
} from "./schema.js";
export type {
  Site,
  Keyword,
  ContentPlan,
  Run,
  Directory,
  Submission,
  MeshTopic,
  MeshCoverage,
  TrackedKeyword,
  RankCheck,
  OutreachProspect,
  NewOutreachProspect,
  SubmissionCitation,
  NewSubmissionCitation,
} from "./schema.js";

// Batch 04 addendum — business profile NAP source of truth + NAP renderer.
export {
  loadBusinessProfile,
  assertNapConsistency,
  BusinessProfileSchema,
  _resetBusinessProfileCache,
} from "./lib/business-profile.js";
export type { BusinessProfile } from "./lib/business-profile.js";
export {
  toFormFillerTokens,
  toGooglePlacesPayload,
  toBrightLocalPayload,
  toLocalBusinessJsonLd,
} from "./directories/renderers/nap.js";

// Batch 04 helpers + schemas.
export {
  findCrosslinks,
  seedMesh,
  meshCoverageReport,
  MeshSeedSchema,
} from "./mesh/index.js";
export type { MeshCrosslink, MeshSeed, SeedMeshResult } from "./mesh/index.js";
export { createDataForSeoClient } from "./rank/index.js";
export type {
  DataForSeoClient,
  RankCheckInput,
  RankCheckResult,
} from "./rank/index.js";
export { renderSubmissionPayload } from "./directories/index.js";
export {
  DirectorySeedSchema,
  DirectorySeedEntrySchema,
  FormMethodConfigSchema,
  ApiMethodConfigSchema,
  EmailMethodConfigSchema,
  ManualMethodConfigSchema,
  SubmissionPayloadSchema,
} from "./directories/index.js";
export type {
  SubmissionPayload,
  DirectorySeed,
  DirectorySeedEntry,
  FormMethodConfig,
  FormStep,
  ApiMethodConfig,
  EmailMethodConfig,
  ManualMethodConfig,
} from "./directories/index.js";
