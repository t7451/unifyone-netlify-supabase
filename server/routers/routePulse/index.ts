import { z } from "zod";
import {
  publicProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./routePulse.service";

const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const routePulseRouter = router({
  // Public: request a route. Rate-limited since it fans out to OSRM +
  // Supabase + (conditionally) Gemini per call.
  getRoute: publicRateLimitedProcedure(publicFormLimiter, "routepulse:getRoute")
    .input(
      z.object({
        origin: latLng,
        destination: latLng,
      })
    )
    .query(async ({ input }) => {
      return service.getRoute(input.origin, input.destination);
    }),

  // Public: list currently-active incidents (for a map overlay).
  listIncidents: publicProcedure.query(async () => {
    return service.listActiveIncidents();
  }),
});
