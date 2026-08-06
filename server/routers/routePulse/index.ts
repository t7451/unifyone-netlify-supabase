import { z } from "zod";
import { publicRateLimitedProcedure, router } from "../../_core/trpc";
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

  // Public: list currently-active incidents (for a map overlay). Rate-limited
  // so the full active-incident table can't be scraped every request.
  listIncidents: publicRateLimitedProcedure(
    publicFormLimiter,
    "routepulse:listIncidents"
  ).query(async () => {
    return service.listActiveIncidents();
  }),
});
