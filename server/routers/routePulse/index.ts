import { z } from "zod";
import { publicRateLimitedProcedure, router } from "../../_core/trpc";
import { publicFormLimiter, typeaheadLimiter } from "../../_core/rateLimiter";
import * as service from "./routePulse.service";
import { landmarksNear } from "./trimetContext";

const address = z
  .string()
  .trim()
  .min(3, "Enter a more complete address.")
  .max(300);

const hhmm = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

/** A stop address, optionally with a "must arrive by" deadline. */
const stopInput = z.union([
  address,
  z.object({ address, dueBy: hhmm.optional() }),
]);

export const routePulseRouter = router({
  geocode: publicRateLimitedProcedure(publicFormLimiter, "routepulse:geocode")
    .input(z.object({ address }))
    .query(async ({ input }) => {
      return service.geocodeAddress(input.address);
    }),

  suggest: publicRateLimitedProcedure(typeaheadLimiter, "routepulse:suggest")
    .input(
      z.object({
        query: z.string().trim().min(2).max(300),
      })
    )
    .query(async ({ input }) => {
      return service.suggestAddresses(input.query);
    }),

  // v22: preference + optional ordered stops for delivery multi-stop.
  getRoute: publicRateLimitedProcedure(publicFormLimiter, "routepulse:getRoute")
    .input(
      z.object({
        origin: address,
        destination: address,
        preference: z
          .enum(["fastest", "balanced", "quiet", "fuel"])
          .optional()
          .default("balanced"),
        /** Intermediate stops (max 15) — delivery waypoints, each optionally
         *  carrying a "must arrive by" deadline. */
        stops: z.array(stopInput).max(15).optional().default([]),
        /** Reorder stops for a shorter path (default true when 2+ stops). */
        optimizeStops: z.boolean().optional().default(true),
        /** "HH:MM" local departure time — only used when a stop has a dueBy. */
        departAt: hhmm.optional(),
      })
    )
    .query(async ({ input }) => {
      return service.getRoute(
        input.origin,
        input.destination,
        input.preference,
        input.stops,
        input.optimizeStops,
        input.departAt
      );
    }),

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

  /** M3: TriMet landmarks near a point (map context, not routing). */
  listTransitLandmarks: publicRateLimitedProcedure(
    publicFormLimiter,
    "routepulse:landmarks"
  )
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().min(1).max(30).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      return landmarksNear(input.lat, input.lng, input.radiusKm);
    }),
});
