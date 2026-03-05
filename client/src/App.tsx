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
import Rewards from "./pages/Rewards";
import RevenueStreams from "./pages/RevenueStreams";
import Affiliates from "./pages/Affiliates";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { getLoginUrl } from "./const";
import { trpc } from "./lib/trpc";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }
  return <Component />;
}

function DashboardRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute component={() => <TenantGuard component={Component} />} />
  );
}

function TenantGuard({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const tenants = trpc.tenant.list.useQuery();
  const hasTenant = tenants.data && tenants.data.length > 0;
  const isLoading = tenants.isLoading;

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/setup" component={() => <ProtectedRoute component={TenantSetup} />} />
      <Route path="/dashboard" component={() => <DashboardRoute component={Dashboard} />} />
      <Route path="/products" component={() => <DashboardRoute component={Products} />} />
      <Route path="/orders" component={() => <DashboardRoute component={Orders} />} />
      <Route path="/customers" component={() => <DashboardRoute component={Customers} />} />
      <Route path="/analytics" component={() => <DashboardRoute component={Analytics} />} />
      <Route path="/integrations" component={() => <DashboardRoute component={Integrations} />} />
      <Route path="/settings" component={() => <DashboardRoute component={Settings} />} />
      <Route path="/billing" component={() => <DashboardRoute component={Billing} />} />
      <Route path="/team" component={() => <DashboardRoute component={Team} />} />
      <Route path="/social" component={() => <DashboardRoute component={Social} />} />
      <Route path="/referrals" component={() => <DashboardRoute component={Referrals} />} />
      <Route path="/leads" component={() => <DashboardRoute component={Leads} />} />
      <Route path="/automations" component={() => <DashboardRoute component={Automations} />} />
      <Route path="/notifications" component={() => <DashboardRoute component={Notifications} />} />
      <Route path="/themes" component={ThemeStore} />
      <Route path="/my-themes" component={() => <DashboardRoute component={MyThemes} />} />
      <Route path="/admin/themes" component={() => <DashboardRoute component={AdminThemes} />} />
      <Route path="/rewards" component={() => <DashboardRoute component={Rewards} />} />
      <Route path="/revenue-streams" component={() => <DashboardRoute component={RevenueStreams} />} />
      <Route path="/affiliates" component={() => <DashboardRoute component={Affiliates} />} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/checkout/paypal-return" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/checkout/paypal-cancel" component={() => <ProtectedRoute component={Checkout} />} />
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
