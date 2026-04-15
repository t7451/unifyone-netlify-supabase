import { useLocation } from "wouter";
import {
  Building2,
  User,
  Bell,
  Shield,
  Palette,
  Wrench,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const settingsNav = [
  {
    label: "General",
    path: "/settings",
    icon: Building2,
    description: "Store name, domain, and branding",
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

  const currentNav =
    settingsNav.find(n => n.path === location) ?? settingsNav[0];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-[#00D9FF]" />
          Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your store, account, and preferences
        </p>
      </div>

      {/* Mobile: dropdown nav */}
      {isMobile ? (
        <div className="space-y-4">
          <Select value={currentNav.path} onValueChange={v => setLocation(v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <currentNav.icon className="w-4 h-4 text-[#00D9FF]" />
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
          <nav className="w-56 shrink-0 space-y-1">
            {settingsNav.map(nav => {
              const isActive = location === nav.path;
              return (
                <button
                  key={nav.path}
                  onClick={() => setLocation(nav.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                    isActive
                      ? "bg-[#00D9FF]/10 border border-[#00D9FF]/20"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <nav.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-[#00D9FF]" : "text-gray-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-white" : "text-gray-400"
                      )}
                    >
                      {nav.label}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {nav.description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-[#00D9FF] shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      )}
    </div>
  );
}
