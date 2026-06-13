import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  CreditCard,
  Users,
  Share2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// ── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: "text-blue-400" },
  success: { icon: CheckCircle2, color: "text-emerald-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
  error: { icon: AlertCircle, color: "text-red-400" },
  order: { icon: ShoppingCart, color: "text-cyan-400" },
  payment: { icon: CreditCard, color: "text-purple-400" },
  team: { icon: Users, color: "text-indigo-400" },
  social: { icon: Share2, color: "text-pink-400" },
  lead: { icon: Target, color: "text-orange-400" },
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── NotificationCenter ────────────────────────────────────────────────────────
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // No polling interval — SSE events (useServerEvents hook at app root) invalidate
  // these queries instantly when new notifications arrive. Falls back to stale
  // data in serverless environments; a manual refetch on panel open keeps it fresh.
  const {
    data: notifs = [],
    isLoading,
    refetch: refetchList,
  } = trpc.notifications.list.useQuery({ limit: 30 }, { staleTime: 60_000 });
  const { data: unread, refetch: refetchCount } =
    trpc.notifications.unreadCount.useQuery(undefined, {
      staleTime: 60_000,
    });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = unread?.count ?? 0;

  const handleNotifClick = (notif: (typeof notifs)[0]) => {
    if (!notif.read) markRead.mutate({ id: notif.id });
    if (notif.link) {
      setOpen(false);
      if (notif.link.startsWith("http")) {
        window.open(notif.link, "_blank");
      } else {
        navigate(notif.link);
      }
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
        onClick={() => {
          const opening = !open;
          setOpen(opening);
          if (opening) {
            refetchList();
            refetchCount();
          }
        }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-black leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-cyan-500/20 text-cyan-400 border-0 text-xs px-1.5 py-0"
                >
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <ScrollArea className="max-h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                Loading…
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifs.map(n => {
                  const typeInfo = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                        n.read
                          ? "hover:bg-white/5"
                          : "bg-cyan-500/5 hover:bg-cyan-500/10"
                      )}
                      onClick={() => handleNotifClick(n)}
                    >
                      {/* Icon */}
                      <div
                        className={cn("mt-0.5 flex-shrink-0", typeInfo.color)}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm leading-tight truncate",
                              n.read
                                ? "text-slate-300"
                                : "text-white font-medium"
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-cyan-400 mt-1" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-600">
                            {timeAgo(n.createdAt)}
                          </span>
                          {n.link && (
                            <ExternalLink className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </div>

                      {/* Actions (visible on hover) */}
                      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-white/10"
                            onClick={e => {
                              e.stopPropagation();
                              markRead.mutate({ id: n.id });
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/10"
                          onClick={e => {
                            e.stopPropagation();
                            deleteNotif.mutate({ id: n.id });
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifs.length > 0 && (
            <>
              <Separator className="bg-white/10" />
              <div className="px-4 py-2 text-center">
                <span className="text-xs text-slate-600">
                  Showing last {notifs.length} notifications
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
