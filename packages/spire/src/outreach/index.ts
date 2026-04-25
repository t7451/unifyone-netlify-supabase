export { qualifyProspects } from "./prospects/qualify.js";
export type {
  CampaignType,
  QualifyInput,
  QualifyResult,
} from "./prospects/qualify.js";
export { findContacts } from "./prospects/find-contact.js";
export type {
  FindContactInput,
  FindContactResult,
} from "./prospects/find-contact.js";
export { selectAsset } from "./pitch/select-asset.js";
export type {
  SelectAssetInput,
  SelectAssetResult,
} from "./pitch/select-asset.js";
export { draftPitch } from "./pitch/draft.js";
export type { DraftInput, DraftResult } from "./pitch/draft.js";
export { renderPitchPrompt } from "./pitch/tokens.js";
export { scheduleSequence } from "./sequences/schedule.js";
export type {
  ScheduleSequenceInput,
  ScheduleSequenceResult,
} from "./sequences/schedule.js";
export { advanceSequences } from "./sequences/advance.js";
export type { AdvanceInput, AdvanceResult } from "./sequences/advance.js";
export {
  checkDeliverabilityGate,
  recordSent,
} from "./send/deliverability-gate.js";
export type {
  GateInput,
  GateResult,
  GateReason,
} from "./send/deliverability-gate.js";
export {
  buildCanSpamFooter,
  suppressionToken,
  verifySuppressionToken,
} from "./send/footer.js";
export type { FooterInput } from "./send/footer.js";
export { resendSend } from "./send/resend-client.js";
export {
  crawlProspectForBrokenLinks,
  crawlSiteSample,
} from "./crawler/broken-links.js";
export type { CrawlInput, CrawlResult } from "./crawler/broken-links.js";
export type {
  ResendSendInput,
  ResendSendResult,
} from "./send/resend-client.js";
