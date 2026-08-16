import { z } from "zod";
import { publicRateLimitedProcedure, router } from "../../_core/trpc";
import { publicFormLimiter, typeaheadLimiter } from "../../_core/rateLimiter";
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

  // Public: lightweight address suggestion lookup for typeahead UI.
  // Rate-limited independently with a looser budget than the form limiter
  // since it's fired on every debounced keystroke, not once per submit.
  suggest: publicRateLimitedProcedure(typeaheadLimiter, "routepulse:suggest")
    .input(
      z.object({
        query: z.string().trim().min(2).max(300),
      })
    )
    .query(async ({ input }) => {
      return service.suggestAddresses(input.query);
    }),

  // Public: request a route by address. Rate-limited since it fans out to
  // Nominatim + OSRM + Supabase + (conditionally) the AI router per call.
  // v19: optional preference mode changes multi-objective ranking weights
  // (fastest | balanced | quiet | fuel). Default balanced for delivery.
  getRoute: publicRateLimitedProcedure(publicFormLimiter, "routepulse:getRoute")
    .input(
      z.object({
        origin: address,
        destination: address,
        preference: z
          .enum(["fastest", "balanced", "quiet", "fuel"])
          .optional()
          .default("balanced"),
      })
    )
    .query(async ({ input }) => {
      return service.getRoute(
        input.origin,
        input.destination,
        input.preference
      );
    }),

  // Public: list currently-active incidents (for a map overlay). Rate-limited
  // so the full active-incident table can't be scraped every request.
  // v17: optional bbox — when passed, geofences to that viewport instead of
  // returning the full statewide feed.
  listIncidents: publicRateLimitedProcedure(
    publicFormLimiter,
    "routepulse:listIncidents"
  )
    .input(
      z
        .object({
          minLat: z.number(),
          minLng: z.number(),
          maxLat: z.number(),
          maxLng: z.number(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return service.listActiveIncidents(input);
    }),

  // Public: list traffic cameras (for the map camera layer). Same
  // rate-limiting rationale as listIncidents.
  listCameras: publicRateLimitedProcedure(
    publicFormLimiter,
    "routepulse:listCameras"
  )
    .input(
      z
        .object({
          minLat: z.number(),
          minLng: z.number(),
          maxLat: z.number(),
          maxLng: z.number(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return service.listCameras(input);
    }),
});
