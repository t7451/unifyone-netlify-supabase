/**
 * server/routers/clipsToolkit/index.ts
 *
 * tRPC router for the standalone instant-delivery product served at
 * https://clips.1commerce.online/.
 *
 * Public surface — no auth required so that anyone landing on the marketing
 * page can buy and receive the research workbook immediately.
 *
 * Flow:
 *   1. Browser calls `clipsToolkit.createCheckout` → server creates a Stripe
 *      Checkout Session and returns its URL. The buyer is redirected there.
 *   2. After payment, Stripe redirects back to `successUrl?session_id=...`.
 *   3. Browser calls `clipsToolkit.getDownload({ sessionId })` → server
 *      retrieves the session from Stripe, verifies `payment_status === "paid"`,
 *      and mints a short-lived JWT download token.
 *   4. Browser hits `/api/clips-toolkit/download?token=...` to stream the file.
 *
 * The token is signed with `JWT_SECRET` and expires in 15 minutes; it embeds
 * the Stripe session id as `sub` so each purchase is auditable. The research
 * workbook itself never leaves the server filesystem.
 *
 * Transport only: procedures + zod schemas live here; the Stripe checkout /
 * download-token use-cases live in clipsToolkit.service.ts.
 */
import { z } from "zod";

import { publicRateLimitedProcedure, router } from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./clipsToolkit.service";

// Re-exported for backwards compatibility with the previous single-file module.
export {
  CLIPS_PRODUCT_NAME,
  CLIPS_PRODUCT_DESCRIPTION,
  CLIPS_DEFAULT_PRICE_CENTS,
} from "./clipsToolkit.service";

export const clipsToolkitRouter = router({
  /**
   * Returns metadata for the marketing page (price + product copy) so the
   * frontend doesn't have to hard-code the price separately from the server.
   */
  getProduct: publicRateLimitedProcedure(
    publicFormLimiter,
    "clipsToolkit:getProduct"
  ).query(() => {
    return service.getProduct();
  }),

  /**
   * Creates a one-time Stripe Checkout Session for the toolkit and returns
   * the hosted-checkout URL the browser should redirect to.
   */
  createCheckout: publicRateLimitedProcedure(
    publicFormLimiter,
    "clipsToolkit:createCheckout"
  )
    .input(
      z.object({
        origin: z.string().min(1).max(2048),
        email: z.string().email().max(254).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return service.createCheckout(input);
    }),

  /**
   * Verifies a Stripe Checkout session is paid and returns a short-lived
   * download URL the buyer can hit immediately.
   */
  getDownload: publicRateLimitedProcedure(
    publicFormLimiter,
    "clipsToolkit:getDownload"
  )
    .input(z.object({ sessionId: z.string().min(1).max(256) }))
    .mutation(async ({ input }) => {
      return service.getDownload(input);
    }),
});
