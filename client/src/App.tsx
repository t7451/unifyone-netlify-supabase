import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { getLoginUrl } from "./const";

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
    <ProtectedRoute component={() => (
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    )} />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup" component={() => <ProtectedRoute component={TenantSetup} />} />
      <Route path="/dashboard" component={() => <DashboardRoute component={Dashboard} />} />
      <Route path="/products" component={() => <DashboardRoute component={Products} />} />
      <Route path="/orders" component={() => <DashboardRoute component={Orders} />} />
      <Route path="/customers" component={() => <DashboardRoute component={Customers} />} />
      <Route path="/analytics" component={() => <DashboardRoute component={Analytics} />} />
      <Route path="/integrations" component={() => <DashboardRoute component={Integrations} />} />
      <Route path="/settings" component={() => <DashboardRoute component={Settings} />} />
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
