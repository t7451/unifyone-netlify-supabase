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
        /** Ordered intermediate stops (max 8) — delivery waypoints. */
        stops: z.array(address).max(8).optional().default([]),
      })
    )
    .query(async ({ input }) => {
      return service.getRoute(
        input.origin,
        input.destination,
        input.preference,
        input.stops
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
});
