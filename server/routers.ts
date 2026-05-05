import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyticsRouter } from "./routers/analytics";
import { integrationsRouter } from "./routers/integrations";
import { ordersRouter } from "./routers/orders";
import { productsRouter } from "./routers/products";
import { tenantRouter } from "./routers/tenant";
import { subscriptionRouter } from "./routers/subscription";
import { teamRouter } from "./routers/team";
import { socialRouter } from "./routers/social";
import { referralRouter } from "./routers/referral";
import { leadsRouter } from "./routers/leads";
import { automationRouter } from "./routers/automation";
import { notificationsRouter } from "./routers/notifications";
import { themesRouter } from "./routers/themes";
import { rewardsRouter } from "./routers/rewards";
import { metaRouter } from "./routers/meta";
import { revenueStreamsRouter } from "./routers/revenueStreams";
import { affiliatesRouter } from "./routers/affiliates";
import { shopifyStoresRouter } from "./routers/shopifyStores";
import { syncMonitorRouter } from "./routers/syncMonitor";
import { sovereignRouter } from "./routers/sovereign";
import { moneyManagerRouter } from "./routers/moneyManager";
import { gamificationRouter } from "./routers/gamification";
import { socialFriendsRouter } from "./routers/socialFriends";
import { mobileAutomationRouter } from "./routers/mobileAutomation";
import { capiRouter } from "./routers/capi";
import { aiRouter } from "./routers/ai";
import { emailRouter } from "./routers/email";
import { documentChatRouter } from "./routers/documentChat";
import { governanceRouter } from "./routers/governance";
import { claudeGovernanceRouter } from "./routers/claudeGovernance";
import { contactRouter } from "./routers/contact";
import { mcpRouter } from "./routers/mcp";
import { userRouter } from "./routers/user";
import { gigWorkerRouter } from "./routers/gigWorker";
import { developerRouter } from "./routers/developer";
import { clippersRouter } from "./routers/clippers";
import { seoRouter } from "./routers/seo";
import { cliRouter } from "./routers/cli";
import { dealflowRouter } from "./routers/dealflow";
import { shopifyThemeRouter } from "./routers/shopifyTheme";
import { terpforgeRouter } from "./routers/terpforge";
import { knowledgeGraphRouter } from "./routers/knowledgeGraph";
import { pixelforgeRouter } from "./routers/pixelforge";
import { customersRouter } from "./routers/customers";
import { discountsRouter } from "./routers/discounts";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      const u = opts.ctx.user;
      if (!u) return null;
      return {
        id: u.id,
        openId: u.openId,
        tenantId: u.tenantId,
        email: u.email,
        name: u.name,
        username: u.username,
        role: u.role,
        loginMethod: u.loginMethod,
        emailVerified: u.emailVerified,
        passwordChangedAt: u.passwordChangedAt,
        hasPassword: !!u.passwordHash,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      // ctx.res is only available in the Express adapter (local/Docker).
      // In the Netlify fetch adapter ctx.res is undefined; the cookie is
      // cleared by the /api/auth/logout non-tRPC route instead.
      if (ctx.res && typeof ctx.res.clearCookie === "function") {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return { success: true } as const;
    }),
  }),

  tenant: tenantRouter,
  products: productsRouter,
  orders: ordersRouter,
  analytics: analyticsRouter,
  integrations: integrationsRouter,
  subscription: subscriptionRouter,
  team: teamRouter,
  social: socialRouter,
  referral: referralRouter,
  leads: leadsRouter,
  automation: automationRouter,
  notifications: notificationsRouter,
  themes: themesRouter,
  rewards: rewardsRouter,
  meta: metaRouter,
  revenueStreams: revenueStreamsRouter,
  affiliates: affiliatesRouter,
  shopifyStores: shopifyStoresRouter,
  syncMonitor: syncMonitorRouter,
  sovereign: sovereignRouter,
  moneyManager: moneyManagerRouter,
  gamification: gamificationRouter,
  socialFriends: socialFriendsRouter,
  mobileAutomation: mobileAutomationRouter,
  capi: capiRouter,
  ai: aiRouter,
  mcp: mcpRouter,
  email: emailRouter,
  documentChat: documentChatRouter,
  governance: governanceRouter,
  claudeGovernance: claudeGovernanceRouter,
  contact: contactRouter,
  user: userRouter,
  gigWorker: gigWorkerRouter,
  developer: developerRouter,
  clippers: clippersRouter,
  seo: seoRouter,
  cli: cliRouter,
  dealflow: dealflowRouter,
  shopifyTheme: shopifyThemeRouter,
  terpforge: terpforgeRouter,
  knowledgeGraph: knowledgeGraphRouter,
  pixelforge: pixelforgeRouter,

  customers: customersRouter,

  discounts: discountsRouter,
});

export type AppRouter = typeof appRouter;
