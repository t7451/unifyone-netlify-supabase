import { DashboardPageShell } from "@/components/DashboardPageShell";
import { useLocation } from "wouter";
import {
  Building2,
  User,
  Bell,
  Shield,
  Palette,
  Wrench,
  ChevronRight,
  CreditCard,
  Users,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const buildSettingsNav = (isCommerce: boolean) => [
  {
    label: "General",
    path: "/settings",
    icon: Building2,
    description: isCommerce
      ? "Store name, domain, and branding"
      : "Workspace name, domain, and branding",
  },
  {
    label: "Account",
    path: "/settings/account",
    icon: User,
    description: "Profile, email, and account info",
  },
  {
    label: "Notifications",
    path: "/settings/notifications",
    icon: Bell,
    description: "Email, push, and alert preferences",
  },
  {
    label: "Security",
    path: "/settings/security",
    icon: Shield,
    description: "Password and session management",
  },
  {
    label: "Billing",
    path: "/billing",
    icon: CreditCard,
    description: "Subscription, invoices, and payment methods",
  },
  {
    label: "Team",
    path: "/team",
    icon: Users,
    description: "Invite teammates and manage roles",
  },
  {
    label: "AI & API Keys",
    path: "/settings/api-keys",
    icon: KeyRound,
    description: "Bring your own AI provider keys",
  },
  {
    label: "Appearance",
    path: "/settings/appearance",
    icon: Palette,
    description: "Theme and display preferences",
  },
  {
    label: "Advanced",
    path: "/settings/advanced",
    icon: Wrench,
    description: "Developer tools and system config",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isCommerce = (user?.primaryProduct ?? "gig") === "commerce";
  const settingsNav = buildSettingsNav(isCommerce);

  const currentNav =
    settingsNav.find(n => n.path === location) ?? settingsNav[0];

  return (
    <DashboardPageShell
      eyebrow="Your account"
      title="Settings"
      description={`Manage your ${isCommerce ? "store" : "workspace"}, account, and preferences.`}
    >
      {/* Mobile: dropdown nav */}
      {isMobile ? (
        <div className="space-y-4">
          <Select value={currentNav.path} onValueChange={v => setLocation(v)}>
            <SelectTrigger
              aria-label="Settings section"
              className="min-h-11 bg-background border-border text-foreground"
            >
              <SelectValue>
                <span className="flex items-center gap-2">
                  <currentNav.icon className="w-4 h-4 text-primary" />
                  {currentNav.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {settingsNav.map(nav => (
                <SelectItem key={nav.path} value={nav.path}>
                  <span className="flex items-center gap-2">
                    <nav.icon className="w-4 h-4" />
                    {nav.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {children}
        </div>
      ) : (
        /* Desktop: sidebar + content */
        <div className="flex gap-6">
          {/* Sidebar navigation */}
          <nav
            className="w-56 shrink-0 space-y-1"
            aria-label="Settings sections"
          >
            {settingsNav.map(nav => {
              const isActive = location === nav.path;
              return (
                <button
                  key={nav.path}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setLocation(nav.path)}
                  className={cn(
                    "min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/40 border border-transparent"
                  )}
                >
                  <nav.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {nav.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {nav.description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      )}
    </DashboardPageShell>
  );
}
