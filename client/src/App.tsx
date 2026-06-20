import { Suspense, lazy, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import { ClerkProvider } from "@clerk/clerk-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import ErrorBoundary, { RouteErrorBoundary } from "./components/ErrorBoundary";
import LoadingExperience from "./components/LoadingExperience";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import GigResourceLinks from "./components/GigResourceLinks";
import { getLoginUrl } from "./const";
import { trpc } from "./lib/trpc";
import { useTracking } from "./hooks/useTracking";
import { useServerEvents } from "./hooks/useServerEvents";
import {
  useCreditBalanceRealtime,
  useCreditUsageRealtime,
} from "./lib/supabaseRealtime";

const Home = lazy(() => import("./pages/Home"));
const Discounts = lazy(() => import("./pages/Discounts"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Settings = lazy(() => import("./pages/Settings"));
const AccountSettings = lazy(() => import("./pages/settings/AccountSettings"));
const NotificationSettings = lazy(
  () => import("./pages/settings/NotificationSettings")
);
const SecuritySettings = lazy(
  () => import("./pages/settings/SecuritySettings")
);
const ApiKeySettings = lazy(() => import("./pages/settings/ApiKeySettings"));
const AppearanceSettings = lazy(
  () => import("./pages/settings/AppearanceSettings")
);
const AdvancedSettings = lazy(
  () => import("./pages/settings/AdvancedSettings")
);
const TenantSetup = lazy(() => import("./pages/TenantSetup"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PlanCheckout = lazy(() => import("./pages/PlanCheckout"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const Billing = lazy(() => import("./pages/Billing"));
const Team = lazy(() => import("./pages/Team"));
const Social = lazy(() => import("./pages/Social"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Leads = lazy(() => import("./pages/Leads"));
const Automations = lazy(() => import("./pages/Automations"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ThemeStore = lazy(() => import("./pages/ThemeStore"));
const MyThemes = lazy(() => import("./pages/MyThemes"));
const AdminThemes = lazy(() => import("./pages/AdminThemes"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const ToolsIndex = lazy(() => import("./pages/ToolsIndex"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Rewards = lazy(() => import("./pages/Rewards"));
const RevenueStreams = lazy(() => import("./pages/RevenueStreams"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const AffiliateLanding = lazy(() => import("./pages/AffiliateLanding"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Sovereign = lazy(() => import("./pages/Sovereign"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const MoneyManager = lazy(() => import("./pages/MoneyManager"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Friends = lazy(() => import("./pages/Friends"));
const GigCommand = lazy(() => import("./pages/GigCommand"));
const GigWorkerPlans = lazy(() => import("./pages/GigWorkerPlans"));
const MobileAutomation = lazy(() => import("./pages/MobileAutomation"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Sandbox = lazy(() => import("./pages/Sandbox"));
const ShopifyInstall = lazy(() => import("./pages/ShopifyInstall"));
const ShopifySuccess = lazy(() => import("./pages/ShopifySuccess"));
const SyncMonitor = lazy(() => import("./pages/SyncMonitor"));
const GigEcommercePost = lazy(() => import("./pages/blog/GigEcommercePost"));
const MultiTenantPost = lazy(() => import("./pages/blog/MultiTenantPost"));
const GigWorkerShiftIntelligencePost = lazy(
  () => import("./pages/blog/GigWorkerShiftIntelligencePost")
);
const MileageCalculator = lazy(() => import("./pages/tools/MileageCalculator"));
const QuarterlyTaxEstimator = lazy(
  () => import("./pages/tools/QuarterlyTaxEstimator")
);
const EarningsConsolidator = lazy(
  () => import("./pages/tools/EarningsConsolidator")
);
const ResellerBreakEven = lazy(() => import("./pages/tools/ResellerBreakEven"));
const CashflowTracker = lazy(() => import("./pages/tools/CashflowTracker"));
const SETaxCalculator = lazy(() => import("./pages/tools/SETaxCalculator"));
const GigHourlyRate = lazy(() => import("./pages/tools/GigHourlyRate"));
const TaxSetAside = lazy(() => import("./pages/tools/TaxSetAside"));
const GigIncomeAggregator = lazy(
  () => import("./pages/geo/GigIncomeAggregator")
);
const TaxManagement1099 = lazy(() => import("./pages/geo/TaxManagement1099"));
const GigEarningsOptimizer = lazy(
  () => import("./pages/geo/GigEarningsOptimizer")
);
const FinancialIntelligenceGig = lazy(
  () => import("./pages/geo/FinancialIntelligenceGig")
);
const GigRouteIntelligence = lazy(
  () => import("./pages/geo/GigRouteIntelligence")
);
const PlatformTaxGuide = lazy(() => import("./pages/geo/PlatformTaxGuide"));
const GigTaxesHub = lazy(() => import("./pages/geo/GigTaxesHub"));
const StateTaxGuide = lazy(() => import("./pages/geo/StateTaxGuide"));
const PlatformComparison = lazy(() => import("./pages/geo/PlatformComparison"));
const GettingStartedGuide = lazy(
  () => import("./pages/geo/GettingStartedGuide")
);
const Form1099Explainer = lazy(() => import("./pages/geo/Form1099Explainer"));
const GigDeductionsGuide = lazy(() => import("./pages/geo/GigDeductionsGuide"));
const HowToFileGigTaxes = lazy(() => import("./pages/geo/HowToFileGigTaxes"));
const GigQuarterlyTaxes = lazy(() => import("./pages/geo/GigQuarterlyTaxes"));
const DigitalRetailGuidePost = lazy(
  () => import("./pages/blog/DigitalRetailGuidePost")
);
const DynamicBlogPost = lazy(() => import("./pages/blog/DynamicBlogPost"));
const Architecture = lazy(() => import("./pages/Architecture"));
const TheSystem = lazy(() => import("./pages/TheSystem"));
const Tithes = lazy(() => import("./pages/Tithes"));
const Documents = lazy(() => import("./pages/Documents"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const IntegrationGuides = lazy(() => import("./pages/IntegrationGuides"));
const WorkProof = lazy(() => import("./pages/WorkProof"));
const Resources = lazy(() => import("./pages/Resources"));
const VideoProduction = lazy(() => import("./pages/VideoProduction"));
const AdCopyHub = lazy(() => import("./pages/AdCopyHub"));
const DocsChat = lazy(() => import("./pages/DocsChat"));
const NlwebChat = lazy(() => import("./pages/NlwebChat"));
const DeveloperHub = lazy(() => import("./pages/DeveloperHub"));
const Terminal = lazy(() => import("./pages/Terminal"));
const RevenueCommand = lazy(() => import("./pages/RevenueCommand"));
const MasterControl = lazy(() => import("./pages/MasterControl"));
const DealflowPage = lazy(() => import("./pages/DealflowPage"));
const TerpforgePage = lazy(() => import("./pages/TerpforgePage"));
const KnowledgeGraphPage = lazy(() => import("./pages/KnowledgeGraphPage"));
const PixelforgePage = lazy(() => import("./pages/PixelforgePage"));
const ShopifyThemePage = lazy(() => import("./pages/ShopifyThemePage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Press = lazy(() => import("./pages/Press"));
const Contact = lazy(() => import("./pages/Contact"));
const SeoIndex = lazy(() => import("./pages/SeoIndex"));
const SeoLanding = lazy(() => import("./pages/SeoLanding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClipsToolkit = lazy(() => import("./pages/ClipsToolkit"));
const ClipsToolkitSuccess = lazy(() => import("./pages/ClipsToolkitSuccess"));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LoadingExperience
        fullScreen
        title="Restoring your workspace"
        description="Reconnecting your session, tenant permissions, and saved workspace state."
        label="Session recovery in progress"
      />
    );
  }

  if (!isAuthenticated) {
    const returnTo =
      window.location.pathname && window.location.pathname !== "/login"
        ? `?returnTo=${encodeURIComponent(window.location.pathname)}`
        : "";
    window.location.href = `${getLoginUrl()}${returnTo}`;
    return null;
  }

  return <>{children}</>;
}

function DashboardRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <TenantGuard>{children}</TenantGuard>
    </ProtectedRoute>
  );
}

function TenantGuard({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const tenants = trpc.tenant.list.useQuery();
  const hasTenant = tenants.data && tenants.data.length > 0;
  const isLoading = tenants.isLoading;

  if (isLoading) {
    return (
      <LoadingExperience
        fullScreen
        title="Preparing tenant workspace"
        description="Loading tenant access, dashboard modules, and personalized workspace data."
        label="Tenant setup loading"
      />
    );
  }

  if (!hasTenant) {
    navigate("/setup");
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  useTracking();
  // Connect to the SSE stream. Only establishes when the user is in an
  // authenticated session (EventSource uses cookies). Gives up after 5
  // consecutive failures (Netlify serverless — falls back to polling).
  useServerEvents();

  // Subscribe to Supabase Realtime for credit balance / usage — supplements
  // the SSE credit_balance event for environments where SSE isn't available.
  const { user } = useAuth();
  useCreditBalanceRealtime(user?.openId);
  useCreditUsageRealtime(user?.openId);

  return (
    <Switch>
      <Route path="/" component={() => <Home />} />
      <Route path="/login" component={() => <Login />} />
      <Route path="/register">{() => <Login initialIntent="signup" />}</Route>
      <Route path="/signup">{() => <Login initialIntent="signup" />}</Route>
      <Route path="/auth/callback" component={() => <AuthCallback />} />
      <Route path="/reset-password" component={() => <ResetPassword />} />
      <Route path="/verify-email" component={() => <VerifyEmail />} />
      <Route path="/pricing" component={() => <Pricing />} />
      <Route path="/about" component={() => <About />} />
      <Route path="/press" component={() => <Press />} />
      <Route path="/contact" component={() => <Contact />} />
      <Route
        path="/setup"
        component={() => (
          <ProtectedRoute>
            <TenantSetup />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/dashboard"
        component={() => (
          <DashboardRoute>
            <Dashboard />
          </DashboardRoute>
        )}
      />
      <Route
        path="/products"
        component={() => (
          <DashboardRoute>
            <Products />
          </DashboardRoute>
        )}
      />
      <Route
        path="/orders"
        component={() => (
          <DashboardRoute>
            <Orders />
          </DashboardRoute>
        )}
      />
      <Route
        path="/orders/:id"
        component={() => (
          <DashboardRoute>
            <Orders />
          </DashboardRoute>
        )}
      />
      <Route
        path="/customers"
        component={() => (
          <DashboardRoute>
            <Customers />
          </DashboardRoute>
        )}
      />
      <Route
        path="/analytics"
        component={() => (
          <DashboardRoute>
            <Analytics />
          </DashboardRoute>
        )}
      />
      <Route
        path="/integrations"
        component={() => (
          <DashboardRoute>
            <Integrations />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/account"
        component={() => (
          <DashboardRoute>
            <AccountSettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/notifications"
        component={() => (
          <DashboardRoute>
            <NotificationSettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/security"
        component={() => (
          <DashboardRoute>
            <SecuritySettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/api-keys"
        component={() => (
          <DashboardRoute>
            <ApiKeySettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/appearance"
        component={() => (
          <DashboardRoute>
            <AppearanceSettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings/advanced"
        component={() => (
          <DashboardRoute>
            <AdvancedSettings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/settings"
        component={() => (
          <DashboardRoute>
            <Settings />
          </DashboardRoute>
        )}
      />
      <Route
        path="/billing"
        component={() => (
          <DashboardRoute>
            <Billing />
          </DashboardRoute>
        )}
      />
      <Route
        path="/team"
        component={() => (
          <DashboardRoute>
            <Team />
          </DashboardRoute>
        )}
      />
      <Route
        path="/social"
        component={() => (
          <DashboardRoute>
            <Social />
          </DashboardRoute>
        )}
      />
      <Route
        path="/referrals"
        component={() => (
          <DashboardRoute>
            <Referrals />
          </DashboardRoute>
        )}
      />
      <Route
        path="/leads"
        component={() => (
          <DashboardRoute>
            <Leads />
          </DashboardRoute>
        )}
      />
      <Route
        path="/automations"
        component={() => (
          <DashboardRoute>
            <Automations />
          </DashboardRoute>
        )}
      />
      <Route
        path="/notifications"
        component={() => (
          <DashboardRoute>
            <Notifications />
          </DashboardRoute>
        )}
      />
      <Route path="/themes" component={() => <ThemeStore />} />
      <Route path="/components" component={() => <ComponentShowcase />} />
      <Route path="/design-system" component={() => <DesignSystem />} />
      <Route
        path="/my-themes"
        component={() => (
          <DashboardRoute>
            <MyThemes />
          </DashboardRoute>
        )}
      />
      <Route
        path="/admin/themes"
        component={() => (
          <DashboardRoute>
            <AdminThemes />
          </DashboardRoute>
        )}
      />
      <Route
        path="/rewards"
        component={() => (
          <DashboardRoute>
            <Rewards />
          </DashboardRoute>
        )}
      />
      <Route
        path="/revenue-streams"
        component={() => (
          <DashboardRoute>
            <RevenueStreams />
          </DashboardRoute>
        )}
      />
      <Route
        path="/affiliates"
        component={() => (
          <DashboardRoute>
            <Affiliates />
          </DashboardRoute>
        )}
      />
      <Route path="/shopify/install" component={() => <ShopifyInstall />} />
      <Route path="/shopify/success" component={() => <ShopifySuccess />} />
      <Route
        path="/sync-monitor"
        component={() => (
          <DashboardRoute>
            <SyncMonitor />
          </DashboardRoute>
        )}
      />
      <Route
        path="/money-manager"
        component={() => (
          <DashboardRoute>
            <MoneyManager />
          </DashboardRoute>
        )}
      />
      <Route
        path="/achievements"
        component={() => (
          <DashboardRoute>
            <Achievements />
          </DashboardRoute>
        )}
      />
      <Route
        path="/friends"
        component={() => (
          <DashboardRoute>
            <Friends />
          </DashboardRoute>
        )}
      />
      <Route
        path="/gig-command"
        component={() => (
          <DashboardRoute>
            <GigCommand />
          </DashboardRoute>
        )}
      />
      <Route
        path="/gig-worker-plans"
        component={() => (
          <DashboardRoute>
            <GigWorkerPlans />
          </DashboardRoute>
        )}
      />
      <Route
        path="/mobile-automation"
        component={() => (
          <DashboardRoute>
            <MobileAutomation />
          </DashboardRoute>
        )}
      />
      <Route
        path="/sandbox"
        component={() => (
          <DashboardRoute>
            <Sandbox />
          </DashboardRoute>
        )}
      />
      <Route
        path="/ai-assistant"
        component={() => (
          <DashboardRoute>
            <AIAssistant />
          </DashboardRoute>
        )}
      />
      <Route
        path="/developer"
        component={() => (
          <DashboardRoute>
            <DeveloperHub />
          </DashboardRoute>
        )}
      />
      <Route
        path="/terminal"
        component={() => (
          <DashboardRoute>
            <Terminal />
          </DashboardRoute>
        )}
      />
      <Route path="/sovereign" component={() => <Sovereign />} />
      <Route path="/privacy" component={() => <PrivacyPolicy />} />
      <Route path="/terms" component={() => <TermsOfService />} />
      <Route path="/architecture" component={() => <Architecture />} />
      <Route path="/the-system" component={() => <TheSystem />} />
      <Route path="/tithes" component={() => <Tithes />} />
      <Route path="/documents" component={() => <Documents />} />
      <Route path="/docs" component={() => <Documents />} />
      <Route path="/docs/getting-started" component={() => <Documents />} />
      <Route path="/documents/case-studies" component={() => <CaseStudies />} />
      <Route path="/docs/case-studies" component={() => <CaseStudies />} />
      <Route
        path="/documents/integrations"
        component={() => <IntegrationGuides />}
      />
      <Route
        path="/docs/integration-guides"
        component={() => <IntegrationGuides />}
      />
      <Route path="/documents/work-proof" component={() => <WorkProof />} />
      <Route path="/docs-chat" component={() => <DocsChat />} />
      <Route path="/tools" component={() => <ToolsIndex />} />
      <Route path="/blog" component={() => <BlogIndex />} />
      <Route path="/chat" component={() => <NlwebChat />} />
      <Route path="/resources" component={() => <Resources />} />
      <Route path="/affiliate-program" component={() => <AffiliateLanding />} />
      <Route path="/video-production" component={() => <VideoProduction />} />
      <Route path="/marketing/ad-copy" component={() => <AdCopyHub />} />
      <Route
        path="/blog/gig-ecommerce"
        component={() => <GigEcommercePost />}
      />
      <Route
        path="/blog/gig-economy-commerce-platform"
        component={() => <GigEcommercePost />}
      />
      <Route path="/blog/multi-tenant" component={() => <MultiTenantPost />} />
      <Route
        path="/blog/multi-tenant-ecommerce-saas"
        component={() => <MultiTenantPost />}
      />
      <Route
        path="/blog/gig-worker-shift-intelligence"
        component={() => <GigWorkerShiftIntelligencePost />}
      />
      <Route
        path="/blog/digital-retail-guide"
        component={() => <DigitalRetailGuidePost />}
      />
      {/* Dynamic AI-generated blog posts from the seo_content_jobs table */}
      <Route path="/blog/:slug" component={() => <DynamicBlogPost />} />
      {/* Free tools */}
      <Route
        path="/tools/mileage-deduction-calculator"
        component={() => <MileageCalculator />}
      />
      <Route
        path="/tools/quarterly-tax-estimator"
        component={() => <QuarterlyTaxEstimator />}
      />
      <Route
        path="/tools/earnings-consolidator"
        component={() => <EarningsConsolidator />}
      />
      <Route
        path="/tools/reseller-break-even"
        component={() => <ResellerBreakEven />}
      />
      <Route
        path="/tools/cashflow-tracker"
        component={() => <CashflowTracker />}
      />
      <Route
        path="/tools/se-tax-calculator"
        component={() => <SETaxCalculator />}
      />
      <Route
        path="/tools/gig-hourly-rate"
        component={() => <GigHourlyRate />}
      />
      <Route path="/tools/tax-set-aside" component={() => <TaxSetAside />} />
      {/* GEO landing pages */}
      <Route
        path="/gig-income-aggregator"
        component={() => (
          <>
            <GigIncomeAggregator />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/1099-tax-management"
        component={() => (
          <>
            <TaxManagement1099 />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/gig-earnings-optimizer"
        component={() => (
          <>
            <GigEarningsOptimizer />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/financial-intelligence-gig-workers"
        component={() => (
          <>
            <FinancialIntelligenceGig />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/gig-route-intelligence"
        component={() => (
          <>
            <GigRouteIntelligence />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig tax topic cluster: pillar hub + platform-specific spokes */}
      <Route
        path="/gig-taxes"
        component={() => (
          <>
            <GigTaxesHub />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/doordash-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="doordash-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/uber-driver-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="uber-driver-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/instacart-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="instacart-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/amazon-flex-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="amazon-flex-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/grubhub-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="grubhub-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/lyft-driver-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="lyft-driver-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/spark-driver-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="spark-driver-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/shipt-shopper-taxes"
        component={() => (
          <>
            <PlatformTaxGuide slug="shipt-shopper-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig-tax cluster: state guides */}
      <Route
        path="/california-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="california-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/texas-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="texas-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/florida-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="florida-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/new-york-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="new-york-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/illinois-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="illinois-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/washington-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="washington-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig-tax cluster: platform comparisons */}
      <Route
        path="/doordash-vs-uber-eats"
        component={() => (
          <>
            <PlatformComparison slug="doordash-vs-uber-eats" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/instacart-vs-doordash"
        component={() => (
          <>
            <PlatformComparison slug="instacart-vs-doordash" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/uber-vs-lyft-driver"
        component={() => (
          <>
            <PlatformComparison slug="uber-vs-lyft-driver" />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig-tax cluster: explainers & guides */}
      <Route
        path="/1099-nec-vs-1099-k"
        component={() => (
          <>
            <Form1099Explainer />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/gig-worker-tax-deductions"
        component={() => (
          <>
            <GigDeductionsGuide />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/how-to-file-gig-worker-taxes"
        component={() => (
          <>
            <HowToFileGigTaxes />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/gig-quarterly-taxes"
        component={() => (
          <>
            <GigQuarterlyTaxes />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig-tax cluster: more state guides */}
      <Route
        path="/georgia-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="georgia-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/pennsylvania-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="pennsylvania-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/new-jersey-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="new-jersey-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/arizona-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="arizona-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/ohio-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="ohio-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/north-carolina-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="north-carolina-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/michigan-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="michigan-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/colorado-gig-worker-taxes"
        component={() => (
          <>
            <StateTaxGuide slug="colorado-gig-worker-taxes" />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Gig-tax cluster: additional platform comparisons */}
      <Route
        path="/doordash-vs-grubhub"
        component={() => (
          <>
            <PlatformComparison slug="doordash-vs-grubhub" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/amazon-flex-vs-spark"
        component={() => (
          <>
            <PlatformComparison slug="amazon-flex-vs-spark" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/instacart-vs-shipt"
        component={() => (
          <>
            <PlatformComparison slug="instacart-vs-shipt" />
            <GigResourceLinks />
          </>
        )}
      />
      {/* Getting-started cluster: "how to make money on <platform>" guides */}
      <Route
        path="/how-to-make-money-on-doordash"
        component={() => (
          <>
            <GettingStartedGuide slug="how-to-make-money-on-doordash" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/how-to-make-money-driving-for-uber"
        component={() => (
          <>
            <GettingStartedGuide slug="how-to-make-money-driving-for-uber" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/how-to-make-money-with-instacart"
        component={() => (
          <>
            <GettingStartedGuide slug="how-to-make-money-with-instacart" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route
        path="/how-to-make-money-with-amazon-flex"
        component={() => (
          <>
            <GettingStartedGuide slug="how-to-make-money-with-amazon-flex" />
            <GigResourceLinks />
          </>
        )}
      />
      <Route path="/seo" component={() => <SeoIndex />} />
      <Route path="/seo/:slug" component={() => <SeoLanding />} />
      <Route
        path="/checkout/plan"
        component={() => (
          <ProtectedRoute>
            <PlanCheckout />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/billing/success"
        component={() => (
          <ProtectedRoute>
            <BillingSuccess />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/checkout"
        component={() => (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/checkout/paypal-return"
        component={() => (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/checkout/paypal-cancel"
        component={() => (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/master-control"
        component={() => (
          <DashboardRoute>
            <MasterControl />
          </DashboardRoute>
        )}
      />
      <Route
        path="/revenue-command"
        component={() => (
          <DashboardRoute>
            <RevenueCommand />
          </DashboardRoute>
        )}
      />
      <Route
        path="/dashboard/dealflow"
        component={() => (
          <DashboardRoute>
            <DealflowPage />
          </DashboardRoute>
        )}
      />
      <Route
        path="/dashboard/terpforge"
        component={() => (
          <DashboardRoute>
            <TerpforgePage />
          </DashboardRoute>
        )}
      />
      <Route
        path="/dashboard/knowledge-graph"
        component={() => (
          <DashboardRoute>
            <KnowledgeGraphPage />
          </DashboardRoute>
        )}
      />
      <Route
        path="/dashboard/pixelforge"
        component={() => (
          <DashboardRoute>
            <PixelforgePage />
          </DashboardRoute>
        )}
      />
      <Route
        path="/dashboard/shopify-theme"
        component={() => (
          <DashboardRoute>
            <ShopifyThemePage />
          </DashboardRoute>
        )}
      />
      <Route
        path="/discounts"
        component={() => (
          <DashboardRoute>
            <Discounts />
          </DashboardRoute>
        )}
      />
      <Route path="/404" component={() => <NotFound />} />
      <Route path="/clips" component={() => <ClipsToolkit />} />
      <Route path="/clips/success" component={() => <ClipsToolkitSuccess />} />
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function AppWithOptionalClerk({ children }: { children: ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}

function App() {
  return (
    <AppWithOptionalClerk>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster theme="dark" />
            <Suspense
              fallback={
                <LoadingExperience
                  fullScreen
                  title="Loading your next view"
                  description="Streaming route bundles, restoring interface state, and preparing a smoother transition."
                  label="Route bundle loading"
                />
              }
            >
              <RouteErrorBoundary>
                <Router />
              </RouteErrorBoundary>
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </AppWithOptionalClerk>
  );
}

export default App;
