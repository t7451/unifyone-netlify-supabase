import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyticsRouter } from "./routers/analytics";
import { integrationsRouter } from "./routers/integrations";
import { ordersRouter } from "./routers/orders";
import { productsRouter } from "./routers/products";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tenant: tenantRouter,
  products: productsRouter,
  orders: ordersRouter,
  analytics: analyticsRouter,
  integrations: integrationsRouter,
});

export type AppRouter = typeof appRouter;
