import { z } from "zod";
import {
  adminProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./leads.service";

export const leadsRouter = router({
  // Public: submit a lead from the landing page wizard — IP rate-limited.
  submit: publicRateLimitedProcedure(publicFormLimiter, "leads:submit")
    .input(
      z.object({
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        website: z.string().optional(),
        plan: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        branding: z.string().optional(),
        monthlyRevenue: z.string().optional(),
        teamSize: z.string().optional(),
        message: z.string().optional(),
        source: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return service.submitLead(input);
    }),

  // Admin: list all leads with optional status filter
  list: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum(["new", "contacted", "qualified", "converted", "lost"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx: _ctx, input }) => {
      return service.listLeads(input?.status);
    }),

  // Admin: update lead status
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost"]),
      })
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      return service.updateStatus(input.id, input.status);
    }),

  // Admin: add a note to a lead
  addNote: adminProcedure
    .input(
      z.object({
        id: z.number(),
        note: z.string().min(1),
      })
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      return service.addNote(input.id, input.note);
    }),

  // Admin: get lead stats
  stats: adminProcedure.query(async ({ ctx: _ctx }) => {
    return service.getStats();
  }),
});
