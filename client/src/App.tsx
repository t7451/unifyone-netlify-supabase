import { Suspense, lazy, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import { ClerkProvider } from "@clerk/clerk-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import ErrorBoundary from "./components/ErrorBoundary";
import LoadingExperience from "./components/LoadingExperience";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { getLoginUrl } from "./const";
import { trpc } from "./lib/trpc";

const Home = lazy(() => import("./pages/Home"));
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
const AppearanceSettings = lazy(
  () => import("./pages/settings/AppearanceSettings")
);
const AdvancedSettings = lazy(
  () => import("./pages/settings/AdvancedSettings")
);
const TenantSetup = lazy(() => import("./pages/TenantSetup"));
const Checkout = lazy(() => import("./pages/Checkout"));
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
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Rewards = lazy(() => import("./pages/Rewards"));
const RevenueStreams = lazy(() => import("./pages/RevenueStreams"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Sovereign = lazy(() => import("./pages/Sovereign"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const MoneyManager = lazy(() => import("./pages/MoneyManager"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Friends = lazy(() => import("./pages/Friends"));
const GigCommand = lazy(() => import("./pages/GigCommand"));
const GigWorkerPlans = lazy(() => import("./pages/GigWorkerPlans"));
const MobileAutomation = lazy(() => import("./pages/MobileAutomation"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const ShopifyInstall = lazy(() => import("./pages/ShopifyInstall"));
const ShopifySuccess = lazy(() => import("./pages/ShopifySuccess"));
const SyncMonitor = lazy(() => import("./pages/SyncMonitor"));
const GigEcommercePost = lazy(() => import("./pages/blog/GigEcommercePost"));
const MultiTenantPost = lazy(() => import("./pages/blog/MultiTenantPost"));
const AIGigWorkersPost = lazy(() => import("./pages/blog/AIGigWorkersPost"));
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
const GovernanceDashboard = lazy(() => import("./pages/GovernanceDashboard"));
const DocsChat = lazy(() => import("./pages/DocsChat"));
const DeveloperHub = lazy(() => import("./pages/DeveloperHub"));
const AuthorizationHub = lazy(() => import("./pages/AuthorizationHub"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
  return (
    <Switch>
      <Route path="/" component={() => <Home />} />
      <Route path="/login" component={() => <Login />} />
      <Route path="/signup">{() => <Login initialIntent="signup" />}</Route>
      <Route path="/auth/callback" component={() => <AuthCallback />} />
      <Route path="/reset-password" component={() => <ResetPassword />} />
      <Route path="/verify-email" component={() => <VerifyEmail />} />
      <Route path="/pricing" component={() => <Pricing />} />
      <Route path="/about" component={() => <About />} />
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
        path="/ai-assistant"
        component={() => (
          <DashboardRoute>
            <AIAssistant />
          </DashboardRoute>
        )}
      />
      <Route
        path="/auth-hub"
        component={() => (
          <DashboardRoute>
            <AuthorizationHub />
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
      <Route path="/sovereign" component={() => <Sovereign />} />
      <Route path="/privacy" component={() => <PrivacyPolicy />} />
      <Route path="/terms" component={() => <TermsOfService />} />
      <Route path="/architecture" component={() => <Architecture />} />
      <Route path="/the-system" component={() => <TheSystem />} />
      <Route path="/tithes" component={() => <Tithes />} />
      <Route path="/documents" component={() => <Documents />} />
      <Route path="/documents/case-studies" component={() => <CaseStudies />} />
      <Route
        path="/documents/integrations"
        component={() => <IntegrationGuides />}
      />
      <Route path="/documents/work-proof" component={() => <WorkProof />} />
      <Route path="/docs-chat" component={() => <DocsChat />} />
      <Route path="/resources" component={() => <Resources />} />
      <Route path="/video-production" component={() => <VideoProduction />} />
      <Route path="/marketing/ad-copy" component={() => <AdCopyHub />} />
      <Route path="/governance" component={() => <GovernanceDashboard />} />
      <Route
        path="/blog/gig-economy-commerce-platform"
        component={() => <GigEcommercePost />}
      />
      <Route
        path="/blog/multi-tenant-ecommerce-saas"
        component={() => <MultiTenantPost />}
      />
      <Route
        path="/blog/manus-ai-gig-workers"
        component={() => <AIGigWorkersPost />}
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
      <Route path="/404" component={() => <NotFound />} />
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

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
              <Router />
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </AppWithOptionalClerk>
  );
}

export default App;
