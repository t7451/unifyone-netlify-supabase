/**
 * server/routers/moneyManager/index.ts
 *
 * tRPC router for the Money Manager feature. Transport layer only:
 * procedures, input schemas, and auth. Business logic lives in the
 * shifts / mileageTax / rules / points service modules, and data access in
 * moneyManager.repo.ts.
 */

import { z } from "zod";
import { operatorProcedure, router } from "../../_core/trpc";
import { shiftsService } from "./shifts.service";
import { mileageTaxService } from "./mileageTax.service";
import { rulesService } from "./rules.service";
import { pointsService } from "./points.service";
import { taxExportService } from "./taxExport.service";
import { earningsImportService } from "./earningsImport.service";
import { gigWorkerService } from "../gigWorker/gigWorker.service";

// Zod shape of one normalized earnings row (mirrors NormalizedImportRow). The
// client sends back the rows it previewed; this re-validates them server-side.
const normalizedImportRowSchema = z.object({
  earnedDate: z.string().min(1),
  platform: z.string().min(1).max(100),
  grossDollars: z.number().finite(),
  tipsDollars: z.number().finite(),
  bonusDollars: z.number().finite(),
  miles: z.number().finite().nullable(),
  rawRow: z.record(z.string(), z.string()),
});

export const moneyManagerRouter = router({
  // ── Gig Shifts ──────────────────────────────────────────────────────────────
  startShift: operatorProcedure
    .input(
      z.object({
        platform: z.string().min(1).max(100),
        startLat: z.number().optional(),
        startLng: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return shiftsService.startShift(ctx.user.id, input);
    }),

  endShift: operatorProcedure
    .input(
      z.object({
        shiftId: z.number(),
        grossEarnings: z.number().min(0),
        tips: z.number().min(0).default(0),
        bonuses: z.number().min(0).default(0),
        totalMiles: z.number().min(0).default(0),
        endLat: z.number().optional(),
        endLng: z.number().optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return shiftsService.endShift(ctx, input);
    }),

  listShifts: operatorProcedure
    .input(
      z.object({
        platform: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return shiftsService.listShifts(ctx.user.id, input);
    }),

  getShiftStats: operatorProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "year", "all"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      return shiftsService.getShiftStats(ctx.user.id, input);
    }),

  // ── Mileage Logs ────────────────────────────────────────────────────────────
  logMileage: operatorProcedure
    .input(
      z.object({
        miles: z.number().min(0.1),
        purpose: z.string().default("business"),
        date: z.string().optional(),
        startAddress: z.string().max(500).optional(),
        endAddress: z.string().max(500).optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return mileageTaxService.logMileage(ctx, input);
    }),

  getMileageSummary: operatorProcedure
    .input(z.object({ year: z.number().default(new Date().getFullYear()) }))
    .query(async ({ ctx, input }) => {
      return mileageTaxService.getMileageSummary(ctx.user.id, input);
    }),

  // ── Financial Rules ──────────────────────────────────────────────────────────
  listRules: operatorProcedure.query(async ({ ctx }) => {
    return rulesService.listRules(ctx.user.id);
  }),

  createRule: operatorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        type: z.enum([
          "auto_save",
          "budget_cap",
          "alert",
          "allocation",
          "goal",
        ]),
        triggerType: z.enum([
          "income_received",
          "expense_over",
          "balance_below",
          "balance_above",
          "scheduled",
          "manual",
        ]),
        triggerValue: z.number().optional(),
        actionType: z.enum(["transfer", "notify", "block", "tag", "save"]),
        actionValue: z.number().optional(),
        actionPercent: z.number().min(0).max(100).optional(),
        category: z.string().optional(),
        platform: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return rulesService.createRule(ctx.user.id, input);
    }),

  toggleRule: operatorProcedure
    .input(z.object({ ruleId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return rulesService.toggleRule(ctx.user.id, input);
    }),

  deleteRule: operatorProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return rulesService.deleteRule(ctx.user.id, input);
    }),

  // ── Subscription Entitlements ────────────────────────────────────────────────
  getEntitlement: operatorProcedure.query(async ({ ctx }) => {
    return rulesService.getEntitlement(ctx.user.id);
  }),

  // ── Points Balance ───────────────────────────────────────────────────────────
  getPointsBalance: operatorProcedure.query(async ({ ctx }) => {
    return pointsService.getPointsBalance(ctx.user.id);
  }),

  getPointsHistory: operatorProcedure
    .input(
      z.object({ limit: z.number().default(20), offset: z.number().default(0) })
    )
    .query(async ({ ctx, input }) => {
      return pointsService.getPointsHistory(ctx.user.id, input);
    }),

  // ── Gig Command: GPS & Route ─────────────────────────────────────────────────
  getActiveShift: operatorProcedure.query(async ({ ctx }) => {
    return shiftsService.getActiveShift(ctx.user.id);
  }),

  updateShiftGPS: operatorProcedure
    .input(
      z.object({
        shiftId: z.number(),
        lat: z.number(),
        lng: z.number(),
        appendWaypoint: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return shiftsService.updateShiftGPS(ctx.user.id, input);
    }),

  getRouteIntelligence: operatorProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        platform: z.string().default("any"),
        radiusMiles: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      return shiftsService.getRouteIntelligence(ctx.user.id, input);
    }),
  generateAIShortcuts: operatorProcedure
    .input(z.object({ platform: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return shiftsService.generateAIShortcuts(ctx.user.id, input);
    }),

  // ── GigIQ Intelligence Layer ──────────────────────────────────────────────
  // These procedures power the shift intelligence + deduction dashboard.
  // They read from existing gigShifts + mileageLogs data — no new tables needed.

  /**
   * Per-platform, per-hour, per-day breakdown.
   * Returns the data Kai needs to give dollar-specific recommendations:
   * "Your Thursday 5–9pm shifts average $31.20/hr vs $21.90/hr Monday mornings."
   */
  getShiftBreakdown: operatorProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "year", "all"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      return shiftsService.getShiftBreakdown(ctx.user.id, input);
    }),

  /**
   * YTD deduction widget — the "aha moment" stat.
   * Returns current year mileage deduction, quarterly estimate,
   * and whether the user should be prompted to upgrade.
   */
  getYTDDeduction: operatorProcedure.query(async ({ ctx }) => {
    return mileageTaxService.getYTDDeduction(ctx.user.id);
  }),

  /**
   * Comprehensive tax estimate: SE tax, federal income tax, quarterly payment due.
   * Uses YTD gigShifts gross + mileageLogs deductions to project annual obligations.
   */
  getTaxEstimate: operatorProcedure
    .input(
      z
        .object({ bracketRate: z.number().min(0).max(0.5).optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return mileageTaxService.getTaxEstimate(ctx.user.id, input);
    }),

  /**
   * Kai-ready data context for gig-command and money-manager pages.
   * Returns a compact JSON string the AI system prompt can inject directly.
   */
  getKaiContext: operatorProcedure
    .input(
      z.object({
        context: z.enum(["gig-command", "money-manager", "dashboard"]),
      })
    )
    .query(async ({ ctx }) => {
      return shiftsService.getKaiContext(ctx.user.id);
    }),

  /**
   * Tax Export (Pro) — assemble the year's shifts + mileage + tax estimate into
   * a structured report the client downloads as CSV/PDF. Gated server-side via
   * `requireFeature("tax_export")`: a Starter operator gets a FORBIDDEN with an
   * upgrade message, so the paywall is enforced at the source, not just hidden
   * in the UI.
   */
  exportTaxReport: operatorProcedure
    .input(
      z
        .object({
          year: z
            .number()
            .int()
            .min(2020)
            .max(2100)
            .default(new Date().getFullYear()),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      await gigWorkerService.requireFeature(ctx.user.id, "tax_export");
      const year = input?.year ?? new Date().getFullYear();
      return taxExportService.buildTaxReport(ctx.user.id, { year });
    }),

  /**
   * Earnings anomaly detection: flags platforms where the user's recent $/hr
   * has deviated significantly from their baseline.
   */
  getAnomalies: operatorProcedure
    .input(
      z
        .object({
          lookbackDays: z.number().min(7).max(180).default(30),
          recentSampleSize: z.number().min(2).max(10).default(3),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return mileageTaxService.getAnomalies(ctx.user.id, input);
    }),

  // ── Earnings Import ──────────────────────────────────────────────────────────
  // Multi-platform earnings consolidation: import CSV / 1099 earnings from gig
  // platforms and blend them into the consolidated income picture. CSV arrives
  // as a text string (the client reads the file via FileReader) — no file upload.

  /**
   * Preview a CSV import: parse + normalize + validate against the platform's
   * header aliases. Read-only — no DB write, so it is safe to call on every file
   * pick. Returns normalized rows, skipped rows (with reasons), and totals.
   */
  previewEarningsImport: operatorProcedure
    .input(
      z.object({
        csvText: z.string().max(512_000),
        platform: z.string().min(1).max(100),
      })
    )
    .query(async ({ input }) => {
      return earningsImportService.previewImport(input.csvText, input.platform);
    }),

  /**
   * Commit a previewed import. Gated server-side via requireFeature: a Starter
   * operator gets FORBIDDEN with an upgrade message, so the paywall is enforced
   * at the source, not just hidden in the UI.
   */
  commitEarningsImport: operatorProcedure
    .input(
      z.object({
        platform: z.string().min(1).max(100),
        fileName: z.string().max(300).optional(),
        rows: z.array(normalizedImportRowSchema).max(50_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await gigWorkerService.requireFeature(ctx.user.id, "earnings_import");
      return earningsImportService.commitImport(ctx.user.id, input);
    }),

  /** List the operator's past import batches (newest first). */
  listImportBatches: operatorProcedure.query(async ({ ctx }) => {
    return earningsImportService.listBatches(ctx.user.id);
  }),

  /** Undo an import: delete a batch and all of its rows (userId-scoped). */
  deleteImportBatch: operatorProcedure
    .input(z.object({ batchId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return earningsImportService.deleteBatch(ctx.user.id, input.batchId);
    }),
});
