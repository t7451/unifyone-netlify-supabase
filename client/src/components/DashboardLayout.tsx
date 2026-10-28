import { BrandMark, BrandLockup } from "@/components/Brand";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Zap,
  Settings,
  Building2,
  ChevronDown,
  CreditCard,
  UserPlus,
  Bell,
  DollarSign,
  Navigation,
  Sparkles,
  Star,
  X,
  Package,
  ShoppingCart,
  Users,
  Users2,
  Tag,
  BarChart3,
  TrendingUp,
  LineChart,
  Trophy,
  Gift,
  Share2,
  Target,
  Workflow,
  Palette,
  Handshake,
  RefreshCcw,
  Route,
  Wallet,
  ReceiptText,
  Clock3,
} from "lucide-react";
import { AIChatBox } from "@/components/AIChatBox";
import type { Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { SubscriptionWidget } from "./SubscriptionWidget";
import { NotificationCenter } from "./NotificationCenter";
import { Button } from "./ui/button";
import { useSignupTracker } from "@/hooks/useSignupTracker";
import "./workspace.css";

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string };
type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
  /** De-emphasized (smaller, dimmed) — used for the optional commerce group. */
  muted?: boolean;
};

// Gig-operator core — the front door. Operator-gated on the server.
const gigCoreItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/overview" },
  { icon: Navigation, label: "Track work", path: "/gig-command" },
  { icon: DollarSign, label: "Earnings & mileage", path: "/money-manager" },
  { icon: Wallet, label: "Connected accounts", path: "/connected-money" },
  { icon: TrendingUp, label: "Work insights", path: "/work-insights" },
  { icon: ReceiptText, label: "Work expenses", path: "/work-expenses" },
  { icon: Clock3, label: "Work history", path: "/work-history" },
  { icon: Route, label: "Route planner", path: "/tools/route-pulse" },
];

// Gig-operator growth/engagement tools. Also operator-gated (Revenue Command /
// Revenue Streams depend on the gated `revenueStreams` router), so this group
// only ever renders for gig-first tenants.
const gigGrowthItems: NavItem[] = [
  { icon: LineChart, label: "Revenue Command", path: "/revenue-command" },
  { icon: TrendingUp, label: "Revenue Streams", path: "/revenue-streams" },
  { icon: Trophy, label: "Achievements", path: "/achievements" },
  { icon: Gift, label: "Rewards", path: "/rewards" },
  { icon: Users2, label: "Friends", path: "/friends" },
];

// Cross-product / account items — shown regardless of product.
const accountMenuItems: NavItem[] = [
  { icon: Star, label: "Plans", path: "/gig-worker-plans" },
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Zap, label: "Integrations", path: "/integrations" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: UserPlus, label: "Team", path: "/team" },
];

// Optional commerce capability. Every path is backed only by procedures that
// stay open to every authenticated tenant (no operatorProcedure), so it's safe
// to surface to commerce-first tenants. Operator-gated pages live in the gig
// groups above, not here.
const commerceMenuItems: NavItem[] = [
  { icon: Package, label: "Products", path: "/products" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
  { icon: Users, label: "Customers", path: "/customers" },
  { icon: Tag, label: "Discounts", path: "/discounts" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Share2, label: "Social", path: "/social" },
  { icon: Target, label: "Leads", path: "/leads" },
  { icon: Workflow, label: "Automations", path: "/automations" },
  { icon: Palette, label: "Themes", path: "/my-themes" },
  { icon: Handshake, label: "Affiliates", path: "/affiliates" },
  { icon: RefreshCcw, label: "Sync Monitor", path: "/sync-monitor" },
];

// Flat list of every nav item, for active-page title resolution.
const allNavItems: NavItem[] = [
  ...gigCoreItems,
  ...gigGrowthItems,
  ...accountMenuItems,
  ...commerceMenuItems,
];

/**
 * Ordered, labeled nav sections for a workspace's primary product. Gig-first
 * (the default) leads with the gig groups and keeps commerce as an optional,
 * de-emphasized group; commerce-first tenants get commerce first and NO gig
 * groups (those routes are operator-gated → FORBIDDEN for them).
 */
function navSectionsForProduct(isCommerceFirst: boolean): NavSection[] {
  if (isCommerceFirst) {
    return [
      { key: "commerce", label: "Commerce", items: commerceMenuItems },
      { key: "account", label: "Account", items: accountMenuItems },
    ];
  }
  return [
    { key: "gig", label: "Your work", items: gigCoreItems },
    { key: "account", label: "Account", items: accountMenuItems },
    { key: "grow", label: "More tools", items: gigGrowthItems, muted: true },
    {
      key: "commerce",
      label: "Commerce · optional",
      items: commerceMenuItems,
      muted: true,
    },
  ];
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH
        ? saved
        : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const { loading, user } = useAuth();
  // Fires a deduped CompleteRegistration (Pixel + CAPI) on first dashboard
  // load when the OAuth callback appended `?signup=1` for a new account.
  useSignupTracker();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    } catch {
      /* Navigation remains usable when browser storage is unavailable. */
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (!user) return;
    const root = document.documentElement;
    const previous = root.getAttribute("data-workspace-brand");
    root.setAttribute("data-workspace-brand", "unifyone");
    return () => {
      if (previous === null) root.removeAttribute("data-workspace-brand");
      else root.setAttribute("data-workspace-brand", previous);
    };
  }, [user]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to
              launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="workspace-shell"
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:ring-2 focus:ring-primary"
      >
        Skip to content
      </a>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  // Drive nav emphasis from the workspace's primary product: gig-operators
  // (default) see gig tools primary + commerce de-emphasized; commerce-first
  // tenants get the inverse. Account items stay primary either way.
  const isCommerceFirst = (user?.primaryProduct ?? "gig") === "commerce";
  const navSections = navSectionsForProduct(isCommerceFirst);
  const [location] = useLocation();
  const { state, toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const isCollapsed = state === "collapsed" && !isMobile;
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = allNavItems.find(item => item.path === location);
  const tenantQuery = trpc.tenant.list.useQuery(undefined, { retry: false });
  const tenantName =
    (tenantQuery.data && tenantQuery.data.length > 0
      ? tenantQuery.data[0].name
      : null) ?? (isCommerceFirst ? "My Store" : "My Workspace");

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader
            className={`h-16 justify-center ${isCollapsed ? "px-0" : ""}`}
            style={{ borderBottom: "1px solid #343a3d" }}
          >
            <div
              className={`flex items-center gap-2 transition-all w-full ${isCollapsed ? "justify-center" : "px-2"}`}
            >
              <button
                onClick={toggleSidebar}
                className="h-11 w-11 rounded-lg hover:bg-accent flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39450] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111416] shrink-0 hover:opacity-70"
                aria-label="Toggle navigation"
              >
                {isCollapsed ? (
                  <BrandMark size={28} />
                ) : (
                  <PanelLeft className="h-4 w-4" style={{ color: "#b5bab7" }} />
                )}
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <BrandLockup
                    size={24}
                    byline={false}
                    className="min-w-0 flex-1 overflow-hidden !gap-1.5 [&_.brand-wordmark]:!text-[17px] [&_.brand-wordmark]:truncate"
                  />
                  <NotificationCenter />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          {!isCollapsed && (
            <div className="px-3 pb-2 pt-2">
              <Link
                href="/settings"
                aria-label={`Open settings for ${tenantName}`}
                className="w-full min-h-11 rounded-lg flex items-center gap-2 px-2 py-1.5 transition-colors text-left hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ borderBottom: "1px solid #343a3d" }}
              >
                <Building2
                  className="w-3 h-3 shrink-0"
                  style={{ color: "#f39450" }}
                />
                <span
                  className="text-sm font-medium truncate flex-1"
                  style={{ color: "#f4f2ed" }}
                >
                  {tenantName}
                </span>
                <ChevronDown
                  className="w-3 h-3 shrink-0"
                  style={{ color: "#b5bab7" }}
                />
              </Link>
            </div>
          )}
          {/* Product-aware, labeled nav groups. Each section stacks in normal
              flow inside the scrollable SidebarContent, so the list scrolls
              cleanly and groups never overlap regardless of item count. */}
          <SidebarContent className="gap-0 pb-2">
            {navSections.map((section, sIdx) => {
              const muted = section.muted ?? false;
              const containsActivePage = section.items.some(
                item => location === item.path
              );
              const expanded =
                !muted || (expandedSections[section.key] ?? containsActivePage);
              if (muted && isCollapsed && !isMobile && !containsActivePage)
                return null;
              return (
                <div key={section.key}>
                  {!isCollapsed && (
                    <div
                      className={
                        sIdx === 0
                          ? "mx-2 mb-1 mt-2 px-2"
                          : "mx-2 mb-1 mt-3 px-2 pt-3"
                      }
                      style={
                        sIdx === 0
                          ? undefined
                          : { borderTop: "1px solid #343a3d" }
                      }
                    >
                      {muted ? (
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between text-left text-xs font-semibold text-[#b5bab7] hover:text-[#f4f2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-expanded={expanded}
                          aria-controls={`nav-${section.key}`}
                          onClick={() =>
                            setExpandedSections(previous => ({
                              ...previous,
                              [section.key]: !expanded,
                            }))
                          }
                        >
                          {section.label}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <span className="block text-xs font-semibold uppercase tracking-wider text-[#b5bab7]">
                          {section.label}
                        </span>
                      )}
                    </div>
                  )}
                  <SidebarMenu
                    id={`nav-${section.key}`}
                    hidden={!expanded}
                    className={`${expanded ? "" : "hidden"} px-2 py-1`}
                  >
                    {section.items.map(item => {
                      const isActive =
                        location === item.path ||
                        (item.path === "/settings" &&
                          location.startsWith("/settings/"));
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={
                              muted ? `${item.label} (optional)` : item.label
                            }
                            className="min-h-11 rounded-lg font-normal transition-colors"
                            style={
                              isActive
                                ? {
                                    backgroundColor: "rgba(243,148,80,0.14)",
                                    borderLeft: "2px solid #f39450",
                                    borderBottom: "1px solid #343a3d",
                                  }
                                : {
                                    borderLeft: "2px solid transparent",
                                    borderBottom: "1px solid transparent",
                                  }
                            }
                          >
                            <Link
                              href={item.path}
                              aria-current={isActive ? "page" : undefined}
                              onClick={() => setOpenMobile(false)}
                            >
                              <item.icon
                                className="h-4 w-4"
                                style={{
                                  color: isActive
                                    ? "#f39450"
                                    : muted
                                      ? "#b5bab7"
                                      : "#b5bab7",
                                }}
                              />
                              <span
                                className="font-medium"
                                style={{
                                  color: isActive
                                    ? "#f39450"
                                    : muted
                                      ? "#a2aaa7"
                                      : "#f4f2ed",
                                  fontSize: "0.875rem",
                                  letterSpacing: "0",
                                }}
                              >
                                {item.label}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              );
            })}
          </SidebarContent>

          {!isCollapsed && (
            <div className="px-3 pb-2">
              <SubscriptionWidget />
            </div>
          )}

          <SidebarFooter className={isCollapsed ? "p-1" : "p-3"}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="min-h-11 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div
            className="flex h-14 items-center justify-between px-2 sticky top-0 z-40"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.14)",
              backgroundColor: "rgba(17,20,22,0.96)",
            }}
          >
            <div className="flex items-center gap-2">
              <SidebarTrigger
                className="h-11 w-11"
                style={{ color: "#b5bab7" }}
              />
              <span
                className="text-sm font-medium tracking-wide"
                style={{ color: "#f4f2ed" }}
              >
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
            <div className="flex items-center gap-1 pr-2">
              <NotificationCenter />
            </div>
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className={`${!isCommerceFirst ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-28" : "pb-6 md:pb-28"} min-h-screen min-w-0 flex-1 bg-background`}
        >
          {children}
        </main>
      </SidebarInset>
      {!isCommerceFirst && (
        <nav
          aria-label="Primary worker navigation"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#111416]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          {gigCoreItems.slice(0, 4).map(item => (
            <Link
              key={item.path}
              href={item.path}
              aria-current={location === item.path ? "page" : undefined}
              onClick={() => setOpenMobile(false)}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${location === item.path ? "bg-[#f39450]/10 text-[#f39450]" : "text-[#b5bab7] hover:bg-white/5 hover:text-[#f4f2ed]"}`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>
                {item.path === "/money-manager"
                  ? "Earnings"
                  : item.path === "/connected-money"
                    ? "Accounts"
                    : item.path === "/gig-command"
                      ? "Track work"
                      : item.label}
              </span>
            </Link>
          ))}
        </nav>
      )}
      <FloatingAIWidget />
    </>
  );
}

// ─── Floating AI Chat Widget ─────────────────────────────────────────────────
function FloatingAIWidget() {
  const { user } = useAuth();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [location] = useLocation();

  // Derive context from current route (strip leading /)
  const context = location.replace(/^\//, "") || "general";

  const { data: suggestionsData } = trpc.ai.getSuggestions.useQuery(
    { context },
    { enabled: !!user }
  );

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: data => {
      setConversationId(data.conversationId);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      if (!open) setUnread(n => n + 1);
    },
    onError: err => {
      const message = err.message || "";
      // Only treat as a credit error when the message explicitly mentions
      // insufficient credits — avoids conflating with other FORBIDDEN causes
      // such as tenantProcedure blocking a user with no tenant context.
      const isCreditError = /insufficient|credit/i.test(message);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: isCreditError
            ? "You need Kai credits to continue. Visit the AI Assistant page to purchase a credit pack."
            : "Sorry, I encountered an error. Please try again.",
        },
      ]);
    },
  });

  const handleSend = (content: string) => {
    setMessages(prev => [...prev, { role: "user", content }]);
    chatMutation.mutate({ message: content, context, conversationId });
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  if (!user || isMobile) return null;

  const contextLabel = context.replace(/-/g, " ") || "general";

  return (
    <div
      className={`fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-6 ${user.primaryProduct === "commerce" ? "bottom-6" : "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6"}`}
    >
      {/* Chat panel */}
      {open && (
        <div
          className="w-[calc(100vw-2rem)] max-w-96 rounded-xl flex flex-col overflow-hidden shadow-xl"
          style={{
            height: "min(480px, calc(100dvh - 13rem))",
            border: "1px solid #414b50",
            backgroundColor: "#1c2022",
          }}
        >
          {/* Widget header */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.14)",
              backgroundColor: "#252c2f",
            }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#f39450" }} />
            <span
              className="font-semibold text-sm flex-1 font-[Inter,Arial,sans-serif]"
              style={{ color: "#f39450" }}
            >
              Kai
            </span>
            <span
              className="min-w-0 truncate text-xs capitalize tracking-wide"
              style={{ color: "#b5bab7" }}
            >
              {contextLabel}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="ml-2 flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" style={{ color: "#b5bab7" }} />
            </button>
          </div>
          {/* Chat box */}
          <div className="flex-1 overflow-hidden p-2">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={chatMutation.isPending}
              placeholder="Ask Kai anything…"
              height="100%"
              className="h-full"
              emptyStateMessage={`Hi ${user.name?.split(" ")[0] ?? "there"}! How can I help you?`}
              suggestedPrompts={suggestionsData?.suggestions?.slice(0, 2)}
            />
          </div>
        </div>
      )}

      {/* Floating assistant button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative h-11 w-11 rounded-xl shadow-sm hover:opacity-90 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ backgroundColor: "#f39450", border: "1px solid #ffad74" }}
        aria-label="Open AI Assistant"
      >
        {open ? (
          <X className="h-4 w-4" style={{ color: "#111416" }} />
        ) : (
          <Sparkles
            className="h-5 w-5"
            style={{ color: "#111416" }}
            aria-hidden="true"
          />
        )}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full px-0.5 text-xs flex items-center justify-center font-bold"
            style={{
              backgroundColor: "#111416",
              color: "#f39450",
              border: "1px solid #f39450",
              fontSize: "0.5rem",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
