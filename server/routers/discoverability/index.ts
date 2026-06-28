/**
 * discoverability/index.ts — tRPC router for the Discoverability Engine
 * (WS0 + WS2).
 *
 * Admin-only endpoints:
 *  - mauMetric     — real MAU count (login + ≥1 core action in rolling 28d window)
 *  - funnelStats   — organic funnel: signups by source, activation rate
 *
 * Transport layer: procedures, zod schemas, middleware. Use-cases live in
 * discoverability.service.ts; data access lives in discoverability.repo.ts.
 */

import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { getFunnelStats, getMauMetric } from "./discoverability.service";

export const discoverabilityRouter = router({
  // ── WS0: MAU Metric ────────────────────────────────────────────────────────

  mauMetric: adminProcedure.query(async () => getMauMetric()),

  // ── WS0: Funnel Stats ──────────────────────────────────────────────────────

  funnelStats: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => getFunnelStats(input)),
});
