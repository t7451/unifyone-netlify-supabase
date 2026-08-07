import { z } from "zod";
import { publicRateLimitedProcedure, router } from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./routePulse.service";

const address = z
  .string()
  .trim()
  .min(3, "Enter a more complete address.")
  .max(300);

export const routePulseRouter = router({
  // Public: geocode a free-text address (OpenStreetMap/Nominatim, no key).
  // Used for live map preview as the user types/submits an address.
  geocode: publicRateLimitedProcedure(publicFormLimiter, "routepulse:geocode")
    .input(z.object({ address }))
    .query(async ({ input }) => {
      return service.geocodeAddress(input.address);
    }),

  // Public: request a route by address. Rate-limited since it fans out to
  // Nominatim + OSRM + Supabase + (conditionally) the AI router per call.
  getRoute: publicRateLimitedProcedure(publicFormLimiter, "routepulse:getRoute")
    .input(
      z.object({
        origin: address,
        destination: address,
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
