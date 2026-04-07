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
import { manusAIRouter } from "./routers/manusAI";
import { emailRouter } from "./routers/email";
import { documentChatRouter } from "./routers/documentChat";
import { governanceRouter } from "./routers/governance";
import { claudeGovernanceRouter } from "./routers/claudeGovernance";
import { contactRouter } from "./routers/contact";

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
  manusAI: manusAIRouter,
  email: emailRouter,
  documentChat: documentChatRouter,
  governance: governanceRouter,
  claudeGovernance: claudeGovernanceRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
