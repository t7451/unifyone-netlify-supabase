export { createGscClient } from "./client.js";
export type { GscClient, GscDimension, GscRow } from "./client.js";
export { ingestGsc, refreshWeeklyRollup } from "./ingest.js";
export type { IngestInput, IngestResult } from "./ingest.js";
export {
  findStrikingDistanceQueries,
  findCannibalQueries,
  findDecliningPages,
  findRisingQueries,
  summarize,
} from "./analyze.js";
export type { StrikingDistanceRow, CannibalRow, TrendRow } from "./analyze.js";
