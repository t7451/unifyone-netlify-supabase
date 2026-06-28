import { z } from "zod";
import {
  publicProcedure,
  publicRateLimitedProcedure,
  adminProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./sovereign.service";

export const sovereignRouter = router({
  // Public: join the waitlist — IP rate-limited to prevent waitlist spam.
  joinWaitlist: publicRateLimitedProcedure(publicFormLimiter, "waitlist:join")
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(255).optional(),
        company: z.string().max(255).optional(),
        currentStack: z.string().max(1000).optional(),
        monthlyRevenue: z
          .enum(["pre_revenue", "under_5k", "5k_25k", "25k_100k", "over_100k"])
          .optional(),
        biggestChallenge: z.string().max(2000).optional(),
        referralSource: z.string().max(100).optional(),
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => service.joinWaitlist(input)),

  // Public: get waitlist count (for social proof)
  getCount: publicProcedure.query(async () => service.getWaitlistCount()),

  // Admin: list all waitlist entries
  listWaitlist: adminProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "contacted", "qualified", "converted", "rejected"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => service.listWaitlist(input)),

  // Admin: update waitlist entry status
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "pending",
          "contacted",
          "qualified",
          "converted",
          "rejected",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => service.updateStatus(input)),
});
