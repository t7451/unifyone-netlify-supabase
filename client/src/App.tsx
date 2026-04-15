import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import {
  AccountSettings,
  NotificationSettings,
  SecuritySettings,
  AppearanceSettings,
  AdvancedSettings,
} from "./pages/settings";
import TenantSetup from "./pages/TenantSetup";
import Checkout from "./pages/Checkout";
import Billing from "./pages/Billing";
import Team from "./pages/Team";
import Social from "./pages/Social";
import Referrals from "./pages/Referrals";
import Leads from "./pages/Leads";
import Automations from "./pages/Automations";
import Notifications from "./pages/Notifications";
import ThemeStore from "./pages/ThemeStore";
import MyThemes from "./pages/MyThemes";
import AdminThemes from "./pages/AdminThemes";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Rewards from "./pages/Rewards";
import RevenueStreams from "./pages/RevenueStreams";
import Affiliates from "./pages/Affiliates";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Sovereign from "./pages/Sovereign";
import TermsOfService from "./pages/TermsOfService";
import MoneyManager from "./pages/MoneyManager";
import Achievements from "./pages/Achievements";
import Friends from "./pages/Friends";
import GigCommand from "./pages/GigCommand";
import MobileAutomation from "./pages/MobileAutomation";
import AIAssistant from "./pages/AIAssistant";
import ShopifyInstall from "./pages/ShopifyInstall";
import ShopifySuccess from "./pages/ShopifySuccess";
import SyncMonitor from "./pages/SyncMonitor";
import GigEcommercePost from "./pages/blog/GigEcommercePost";
import MultiTenantPost from "./pages/blog/MultiTenantPost";
import ManusAIPost from "./pages/blog/ManusAIPost";
import Architecture from "./pages/Architecture";
import TheSystem from "./pages/TheSystem";
import Tithes from "./pages/Tithes";
import Documents from "./pages/Documents";
import CaseStudies from "./pages/CaseStudies";
import IntegrationGuides from "./pages/IntegrationGuides";
import WorkProof from "./pages/WorkProof";
import Resources from "./pages/Resources";
import VideoProduction from "./pages/VideoProduction";
import AdCopyHub from "./pages/AdCopyHub";
import GovernanceDashboard from "./pages/GovernanceDashboard";
import { DocsChat } from "./pages/DocsChat";
import DeveloperHub from "./pages/DeveloperHub";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { getLoginUrl } from "./const";
import { trpc } from "./lib/trpc";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, loading } = useAuth();

  // Show spinner only while the initial auth check is in flight.
  // A fetch timeout (set in main.tsx) guarantees this resolves within 15 s.
  if (loading)
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // After loading completes, if the user is not authenticated (including when
  // the auth check failed / timed out and returned no cached data), redirect
  // to login so the user is never stuck on a perpetual spinner.
  if (!isAuthenticated) {
    const returnTo =
      window.location.pathname && window.location.pathname !== "/login"
        ? `?returnTo=${encodeURIComponent(window.location.pathname)}`
        : "";
    window.location.href = `${getLoginUrl()}${returnTo}`;
    return null;
  }

  return <Component />;
}

function DashboardRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  return (
    <ProtectedRoute component={() => <TenantGuard component={Component} />} />
  );
}

function TenantGuard({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const [, navigate] = useLocation();
  const tenants = trpc.tenant.list.useQuery();
  const hasTenant = tenants.data && tenants.data.length > 0;
  const isLoading = tenants.isLoading;

  // Show spinner only while the initial fetch is in flight.
  // A fetch timeout (set in main.tsx) guarantees this resolves within 15 s.
  if (isLoading)
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // On error or empty tenant list, redirect to setup.
  // If the query errored (network/timeout), hasTenant is false and we fall
  // through to the redirect — the user can retry from the setup page.
  if (!hasTenant) {
    navigate("/setup");
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={() => <Login />} />
      <Route path="/signup">{() => <Login initialIntent="signup" />}</Route>
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route
        path="/setup"
        component={() => <ProtectedRoute component={TenantSetup} />}
      />
      <Route
        path="/dashboard"
        component={() => <DashboardRoute component={Dashboard} />}
      />
      <Route
        path="/products"
        component={() => <DashboardRoute component={Products} />}
      />
      <Route
        path="/orders"
        component={() => <DashboardRoute component={Orders} />}
      />
      <Route
        path="/customers"
        component={() => <DashboardRoute component={Customers} />}
      />
      <Route
        path="/analytics"
        component={() => <DashboardRoute component={Analytics} />}
      />
      <Route
        path="/integrations"
        component={() => <DashboardRoute component={Integrations} />}
      />
      <Route
        path="/settings/account"
        component={() => <DashboardRoute component={AccountSettings} />}
      />
      <Route
        path="/settings/notifications"
        component={() => <DashboardRoute component={NotificationSettings} />}
      />
      <Route
        path="/settings/security"
        component={() => <DashboardRoute component={SecuritySettings} />}
      />
      <Route
        path="/settings/appearance"
        component={() => <DashboardRoute component={AppearanceSettings} />}
      />
      <Route
        path="/settings/advanced"
        component={() => <DashboardRoute component={AdvancedSettings} />}
      />
      <Route
        path="/settings"
        component={() => <DashboardRoute component={Settings} />}
      />
      <Route
        path="/billing"
        component={() => <DashboardRoute component={Billing} />}
      />
      <Route
        path="/team"
        component={() => <DashboardRoute component={Team} />}
      />
      <Route
        path="/social"
        component={() => <DashboardRoute component={Social} />}
      />
      <Route
        path="/referrals"
        component={() => <DashboardRoute component={Referrals} />}
      />
      <Route
        path="/leads"
        component={() => <DashboardRoute component={Leads} />}
      />
      <Route
        path="/automations"
        component={() => <DashboardRoute component={Automations} />}
      />
      <Route
        path="/notifications"
        component={() => <DashboardRoute component={Notifications} />}
      />
      <Route path="/themes" component={ThemeStore} />
      <Route
        path="/my-themes"
        component={() => <DashboardRoute component={MyThemes} />}
      />
      <Route
        path="/admin/themes"
        component={() => <DashboardRoute component={AdminThemes} />}
      />
      <Route
        path="/rewards"
        component={() => <DashboardRoute component={Rewards} />}
      />
      <Route
        path="/revenue-streams"
        component={() => <DashboardRoute component={RevenueStreams} />}
      />
      <Route
        path="/affiliates"
        component={() => <DashboardRoute component={Affiliates} />}
      />
      <Route path="/shopify/install" component={ShopifyInstall} />
      <Route path="/shopify/success" component={ShopifySuccess} />
      <Route
        path="/sync-monitor"
        component={() => <DashboardRoute component={SyncMonitor} />}
      />
      <Route
        path="/money-manager"
        component={() => <DashboardRoute component={MoneyManager} />}
      />
      <Route
        path="/achievements"
        component={() => <DashboardRoute component={Achievements} />}
      />
      <Route
        path="/friends"
        component={() => <DashboardRoute component={Friends} />}
      />
      <Route
        path="/gig-command"
        component={() => <DashboardRoute component={GigCommand} />}
      />
      <Route
        path="/mobile-automation"
        component={() => <DashboardRoute component={MobileAutomation} />}
      />
      <Route
        path="/ai-assistant"
        component={() => <DashboardRoute component={AIAssistant} />}
      />
      <Route
        path="/developer"
        component={() => <DashboardRoute component={DeveloperHub} />}
      />
      <Route path="/sovereign" component={Sovereign} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      {/* Public Multi-Page Routes */}
      <Route path="/architecture" component={Architecture} />
      <Route path="/the-system" component={TheSystem} />
      <Route path="/tithes" component={Tithes} />
      {/* Documentation Routes */}
      <Route path="/documents" component={Documents} />
      <Route path="/documents/case-studies" component={CaseStudies} />
      <Route path="/documents/integrations" component={IntegrationGuides} />
      <Route path="/documents/work-proof" component={WorkProof} />
      <Route path="/docs-chat" component={DocsChat} />
      <Route path="/resources" component={Resources} />
      <Route path="/video-production" component={VideoProduction} />
      <Route path="/marketing/ad-copy" component={AdCopyHub} />
      <Route path="/governance" component={GovernanceDashboard} />
      {/* SEO Blog Routes */}
      <Route
        path="/blog/gig-economy-commerce-platform"
        component={GigEcommercePost}
      />
      <Route
        path="/blog/multi-tenant-ecommerce-saas"
        component={MultiTenantPost}
      />
      <Route path="/blog/manus-ai-gig-workers" component={ManusAIPost} />
      <Route
        path="/checkout"
        component={() => <ProtectedRoute component={Checkout} />}
      />
      <Route
        path="/checkout/paypal-return"
        component={() => <ProtectedRoute component={Checkout} />}
      />
      <Route
        path="/checkout/paypal-cancel"
        component={() => <ProtectedRoute component={Checkout} />}
      />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
