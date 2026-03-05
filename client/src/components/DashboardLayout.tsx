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
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, ShoppingBag, ShoppingCart, BarChart3, Zap, Settings, Building2, ChevronDown, CreditCard, UserPlus, Share2, Gift, Target, Workflow, Bell, Store, Package, Key, TrendingUp, Link2, Activity, Plug, DollarSign, Trophy, UserRound, Navigation, Smartphone, Sparkles, X } from "lucide-react";
import { AIChatBox } from "@/components/AIChatBox";
import type { Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { SubscriptionWidget } from './SubscriptionWidget';
import { NotificationCenter } from './NotificationCenter';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: ShoppingBag, label: "Products", path: "/products" },
  { icon: ShoppingCart, label: "Orders", path: "/orders" },
  { icon: Users, label: "Customers", path: "/customers" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Zap, label: "Integrations", path: "/integrations" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: UserPlus, label: "Team", path: "/team" },
  { icon: Share2, label: "Social", path: "/social" },
  { icon: Gift, label: "Promote & Earn", path: "/referrals" },
  { icon: Target, label: "Leads", path: "/leads" },
  { icon: Workflow, label: "Automations", path: "/automations" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Store, label: "Theme Store", path: "/themes" },
  { icon: Package, label: "My Themes", path: "/my-themes" },
  { icon: Key, label: "Rewards Keys", path: "/rewards" },
  { icon: TrendingUp, label: "Revenue Streams", path: "/revenue-streams" },
  { icon: Link2, label: "Affiliate Hub", path: "/affiliates" },
  { icon: Activity, label: "Sync Monitor", path: "/sync-monitor" },
  { icon: Plug, label: "Connect Shopify", path: "/shopify/install" },
  { icon: DollarSign, label: "Money Manager", path: "/money-manager" },
  { icon: Navigation, label: "Gig Command", path: "/gig-command" },
  { icon: Trophy, label: "Achievements", path: "/achievements" },
  { icon: UserRound, label: "Friends & Social", path: "/friends" },
  { icon: Smartphone, label: "Mobile Automation", path: "/mobile-automation" },
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },
];

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
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
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
              Access to this dashboard requires authentication. Continue to launch the login flow.
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
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
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
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const tenantQuery = trpc.tenant.list.useQuery(undefined, { retry: false });
  const tenantName = (tenantQuery.data && tenantQuery.data.length > 0 ? tenantQuery.data[0].name : null) ?? "My Store";

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
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold tracking-tight truncate text-[#00D9FF] flex-1">
                    UnifyOne
                  </span>
                  <NotificationCenter />
                </div>
              ) : null}
              {isCollapsed ? (
                <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#00D9FF]" />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          {!isCollapsed && (
            <div className="px-3 pb-2">
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-left">
                <Building2 className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
                <span className="text-xs font-medium text-gray-300 truncate flex-1">{tenantName}</span>
                <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
              </button>
            </div>
          )}
          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {!isCollapsed && (
            <div className="px-3 pb-2">
              <SubscriptionWidget />
            </div>
          )}

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
                  className="cursor-pointer text-destructive focus:text-destructive"
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
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 pr-2">
              <NotificationCenter />
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
      <FloatingAIWidget />
    </>
  );
}

// ─── Floating AI Chat Widget ─────────────────────────────────────────────────
function FloatingAIWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [location] = useLocation();

  // Derive context from current route (strip leading /)
  const context = location.replace(/^\//, "") || "general";

  const { data: suggestionsData } = trpc.manusAI.getSuggestions.useQuery(
    { context },
    { enabled: !!user }
  );

  const chatMutation = trpc.manusAI.chat.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (!open) setUnread(n => n + 1);
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
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

  if (!user) return null;

  const contextLabel = context.replace(/-/g, " ") || "general";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "480px" }}
        >
          {/* Widget header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-sm flex-1">Manus AI</span>
            <span className="text-xs opacity-70 capitalize">{contextLabel}</span>
            <button
              onClick={() => setOpen(false)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Chat box */}
          <div className="flex-1 overflow-hidden p-2">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={chatMutation.isPending}
              placeholder="Ask Manus anything…"
              height="100%"
              className="h-full"
              emptyStateMessage={`Hi ${user.name?.split(" ")[0] ?? "there"}! How can I help you?`}
              suggestedPrompts={suggestionsData?.suggestions?.slice(0, 2)}
            />
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
