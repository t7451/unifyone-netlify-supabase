import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AnnouncementBanner,
  AdminAnnouncementComposer,
} from "@/components/AnnouncementBanner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  Megaphone,
  Webhook,
  Users,
  ShoppingCart,
  CreditCard,
  UserPlus,
  Share2,
  Target,
  Save,
  Trash2,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Zap,
  Mail,
  Slack,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Supported trigger events ──────────────────────────────────────────────────
const TRIGGER_EVENTS = [
  {
    event: "order.created",
    label: "Order Created",
    icon: ShoppingCart,
    color: "text-cyan-400",
  },
  {
    event: "order.status_changed",
    label: "Order Status Changed",
    icon: ShoppingCart,
    color: "text-blue-400",
  },
  {
    event: "payment.received",
    label: "Payment Received",
    icon: CreditCard,
    color: "text-emerald-400",
  },
  {
    event: "lead.submitted",
    label: "Lead Submitted",
    icon: Target,
    color: "text-orange-400",
  },
  {
    event: "team.invite_accepted",
    label: "Team Invite Accepted",
    icon: UserPlus,
    color: "text-indigo-400",
  },
  {
    event: "social.post_published",
    label: "Social Post Published",
    icon: Share2,
    color: "text-pink-400",
  },
];

// ── Notification type icon map ─────────────────────────────────────────────────
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
  return `${Math.floor(hrs / 24)}d ago`;
}

type DateGroup = "Today" | "Yesterday" | "This Week" | "Older";

function getDateGroup(date: Date | string): DateGroup {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This Week";
  return "Older";
}

const DATE_GROUP_ORDER: DateGroup[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Older",
];

// ── NotificationList (Tier 1 full view) ──────────────────────────────────────
function NotificationList() {
  const utils = trpc.useUtils();
  const { data: notifs = [], isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
  });
  const { data: unread } = trpc.notifications.unreadCount.useQuery();

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

  // Group notifications by date
  const grouped = notifs.reduce<Record<DateGroup, typeof notifs>>(
    (acc, n) => {
      const group = getDateGroup(n.createdAt);
      acc[group].push(n);
      return acc;
    },
    { Today: [], Yesterday: [], "This Week": [], Older: [] }
  );

  return (
    <div className="space-y-4">
      {/* Header with prominent Mark All Read button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Your Notifications</h3>
          {(unread?.count ?? 0) > 0 && (
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              {unread?.count} unread
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60 font-medium"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || (unread?.count ?? 0) === 0}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
          {markAllRead.isPending ? "Marking…" : "Mark all read"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {/* Skeleton with date header + items */}
          {[3, 2, 2].map((count, gi) => (
            <div key={gi} className="space-y-2">
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-lg border border-white/5 bg-white/5 animate-pulse"
                >
                  <div className="h-4 w-4 mt-0.5 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-white/10" />
                    <div className="h-3 w-1/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="relative mb-4">
            <Bell className="h-14 w-14 opacity-10" />
            <CheckCircle2 className="h-6 w-6 text-emerald-400 absolute -bottom-1 -right-1" />
          </div>
          <p className="text-base font-medium text-slate-300">
            You&apos;re all caught up!
          </p>
          <p className="text-sm mt-1.5 text-slate-500 text-center max-w-xs">
            No new notifications. Activity from orders, payments, and team
            events will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {DATE_GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-1">
                {/* Date separator header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {items.map(n => {
                  const typeInfo = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group flex gap-3 p-3 rounded-lg border transition-colors",
                        n.read
                          ? "border-white/5 bg-white/3 hover:bg-white/5"
                          : "border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/8"
                      )}
                    >
                      <div
                        className={cn("mt-0.5 flex-shrink-0", typeInfo.color)}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p
                            className={cn(
                              "text-sm leading-tight",
                              n.read
                                ? "text-slate-300"
                                : "text-white font-medium"
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-cyan-400 mt-1.5" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-600 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-cyan-400"
                            onClick={() => markRead.mutate({ id: n.id })}
                            title="Mark as read"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-400"
                          onClick={() => deleteNotif.mutate({ id: n.id })}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AdminBroadcast (Tier 2) ───────────────────────────────────────────────────
function AdminBroadcast() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    userId: "",
    type: "info" as string,
    title: "",
    body: "",
    link: "",
  });
  const [broadcastForm, setBroadcastForm] = useState({
    type: "info" as string,
    title: "",
    body: "",
  });

  const sendToUser = trpc.notifications.sendToUser.useMutation({
    onSuccess: () => {
      toast.success("Notification sent to user.");
      setForm({ userId: "", type: "info", title: "", body: "", link: "" });
    },
    onError: e => toast.error(e.message),
  });

  const broadcast = trpc.notifications.broadcastToTenant.useMutation({
    onSuccess: data => {
      toast.success(`Broadcast sent to ${data.sent} user(s).`);
      setBroadcastForm({ type: "info", title: "", body: "" });
    },
    onError: e => toast.error(e.message),
  });

  const tenantId = user?.tenantId;

  return (
    <div className="space-y-6">
      {/* Send to specific user */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-base">Send to Specific User</CardTitle>
          </div>
          <CardDescription>
            Push a targeted notification to a specific user by their ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>User ID</Label>
              <Input
                placeholder="e.g. 42"
                type="number"
                value={form.userId}
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={v => setForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TYPE_ICONS).map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Notification title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Body (optional)</Label>
              <Input
                placeholder="Additional details"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Link (optional)</Label>
              <Input
                placeholder="/dashboard or https://..."
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              />
            </div>
          </div>
          <Button
            onClick={() => {
              if (!form.userId || !form.title) {
                toast.error("User ID and title are required.");
                return;
              }
              sendToUser.mutate({
                userId: parseInt(form.userId),
                type: form.type as any,
                title: form.title,
                body: form.body || undefined,
                link: form.link || undefined,
              });
            }}
            disabled={sendToUser.isPending}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            <Bell className="h-4 w-4 mr-2" />
            {sendToUser.isPending ? "Sending…" : "Send Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Broadcast to all tenant users */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-base">
              Broadcast to All Tenant Users
            </CardTitle>
          </div>
          <CardDescription>
            Send a notification to every user in your current tenant workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={broadcastForm.type}
                onValueChange={v => setBroadcastForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TYPE_ICONS).map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. New feature available!"
                value={broadcastForm.title}
                onChange={e =>
                  setBroadcastForm(f => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Body (optional)</Label>
              <Input
                placeholder="Brief description"
                value={broadcastForm.body}
                onChange={e =>
                  setBroadcastForm(f => ({ ...f, body: e.target.value }))
                }
              />
            </div>
          </div>
          <Button
            onClick={() => {
              if (!tenantId) {
                toast.error("No active tenant.");
                return;
              }
              if (!broadcastForm.title) {
                toast.error("Title is required.");
                return;
              }
              broadcast.mutate({
                tenantId,
                type: broadcastForm.type as any,
                title: broadcastForm.title,
                body: broadcastForm.body || undefined,
              });
            }}
            disabled={broadcast.isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
          >
            <Megaphone className="h-4 w-4 mr-2" />
            {broadcast.isPending ? "Broadcasting…" : "Broadcast to All Users"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── TriggerConfig (Tier 4) ────────────────────────────────────────────────────
function TriggerConfig() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const utils = trpc.useUtils();

  const { data: triggers = [], isLoading } =
    trpc.notifications.listTriggers.useQuery(
      { tenantId: tenantId! },
      { enabled: !!tenantId }
    );

  const upsert = trpc.notifications.upsertTrigger.useMutation({
    onSuccess: () => {
      toast.success("Trigger configuration saved.");
      utils.notifications.listTriggers.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteTrigger = trpc.notifications.deleteTrigger.useMutation({
    onSuccess: () => utils.notifications.listTriggers.invalidate(),
  });

  // Local state for each event's config
  const [configs, setConfigs] = useState<
    Record<
      string,
      {
        inAppEnabled: boolean;
        n8nEnabled: boolean;
        n8nWebhookUrl: string;
        zapierEnabled: boolean;
        mailchimpEnabled: boolean;
        slackEnabled: boolean;
        slackWebhookUrl: string;
        emailEnabled: boolean;
        emailRecipients: string;
      }
    >
  >(() => {
    const defaults: Record<string, any> = {};
    TRIGGER_EVENTS.forEach(e => {
      defaults[e.event] = {
        inAppEnabled: true,
        n8nEnabled: false,
        n8nWebhookUrl: "",
        zapierEnabled: false,
        mailchimpEnabled: false,
        slackEnabled: false,
        slackWebhookUrl: "",
        emailEnabled: false,
        emailRecipients: "",
      };
    });
    return defaults;
  });

  // Sync from DB when triggers load
  const [synced, setSynced] = useState(false);
  if (!synced && triggers.length > 0) {
    const updated = { ...configs };
    triggers.forEach(t => {
      updated[t.event] = {
        inAppEnabled: t.inAppEnabled ?? true,
        n8nEnabled: t.n8nEnabled,
        n8nWebhookUrl: t.n8nWebhookUrl ?? "",
        zapierEnabled: t.zapierEnabled,
        mailchimpEnabled: t.mailchimpEnabled,
        slackEnabled: t.slackEnabled,
        slackWebhookUrl: t.slackWebhookUrl ?? "",
        emailEnabled: t.emailEnabled,
        emailRecipients: t.emailRecipients ?? "",
      };
    });
    setConfigs(updated);
    setSynced(true);
  }

  const handleSave = (event: string) => {
    if (!tenantId) {
      toast.error("No active tenant.");
      return;
    }
    upsert.mutate({ tenantId, event, ...configs[event] });
  };

  if (!tenantId) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No active tenant. Please complete onboarding first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Webhook className="h-5 w-5 text-cyan-400" />
        <h3 className="font-semibold text-white">
          Event Trigger Configuration
        </h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Configure which channels receive notifications when each platform event
        fires. Changes are saved per-event.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {TRIGGER_EVENTS.map(({ event, label, icon: EventIcon, color }) => {
            const cfg = configs[event] ?? {};
            const existingTrigger = triggers.find(t => t.event === event);

            return (
              <Card key={event} className="border-white/10 bg-white/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 flex-shrink-0", color)}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500 font-mono">
                              {event}
                            </p>
                            {(() => {
                              const active = [
                                cfg.inAppEnabled && "In-app",
                                cfg.n8nEnabled && "n8n",
                                cfg.zapierEnabled && "Zapier",
                                cfg.mailchimpEnabled && "Mailchimp",
                                cfg.slackEnabled && "Slack",
                                cfg.emailEnabled && "Email",
                              ].filter(Boolean);
                              return active.length > 0 ? (
                                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] px-1.5 py-0">
                                  {active.length} channel
                                  {active.length !== 1 ? "s" : ""} active
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {existingTrigger && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-red-400"
                              onClick={() =>
                                deleteTrigger.mutate({ id: existingTrigger.id })
                              }
                              title="Remove config"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-7 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                            onClick={() => handleSave(event)}
                            disabled={upsert.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Channel toggles */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                        {/* In-App */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.inAppEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], inAppEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-xs text-slate-300">
                              In-app
                            </span>
                          </div>
                        </div>

                        {/* n8n */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.n8nEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], n8nEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-orange-400" />
                            <span className="text-xs text-slate-300">
                              n8n webhook
                            </span>
                          </div>
                        </div>

                        {/* Zapier */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.zapierEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], zapierEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-xs text-slate-300">
                              Zapier
                            </span>
                          </div>
                        </div>

                        {/* Mailchimp */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.mailchimpEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], mailchimpEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-xs text-slate-300">
                              Mailchimp
                            </span>
                          </div>
                        </div>

                        {/* Slack */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.slackEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], slackEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Slack className="h-3.5 w-3.5 text-purple-400" />
                            <span className="text-xs text-slate-300">
                              Slack
                            </span>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cfg.emailEnabled}
                            onCheckedChange={v =>
                              setConfigs(c => ({
                                ...c,
                                [event]: { ...c[event], emailEnabled: v },
                              }))
                            }
                          />
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-xs text-slate-300">
                              Email alerts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Conditional inputs */}
                      {cfg.n8nEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-slate-400">
                            n8n Webhook URL
                          </Label>
                          <Input
                            placeholder="https://your-n8n.example.com/webhook/..."
                            value={cfg.n8nWebhookUrl}
                            onChange={e =>
                              setConfigs(c => ({
                                ...c,
                                [event]: {
                                  ...c[event],
                                  n8nWebhookUrl: e.target.value,
                                },
                              }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                      {cfg.slackEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-slate-400">
                            Slack Webhook URL
                          </Label>
                          <Input
                            placeholder="https://hooks.slack.com/services/..."
                            value={cfg.slackWebhookUrl}
                            onChange={e =>
                              setConfigs(c => ({
                                ...c,
                                [event]: {
                                  ...c[event],
                                  slackWebhookUrl: e.target.value,
                                },
                              }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                      {cfg.emailEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-slate-400">
                            Email Recipients (comma-separated)
                          </Label>
                          <Input
                            placeholder="admin@example.com, ops@example.com"
                            value={cfg.emailRecipients}
                            onChange={e =>
                              setConfigs(c => ({
                                ...c,
                                [event]: {
                                  ...c[event],
                                  emailRecipients: e.target.value,
                                },
                              }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Notifications Page ───────────────────────────────────────────────────
export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Notification Center</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your in-app alerts, admin broadcasts, announcements, and
          event-driven webhook triggers.
        </p>
      </div>

      {/* Active announcement banners */}
      <AnnouncementBanner />

      {/* Tabs */}
      <Tabs defaultValue="inbox">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger
            value="inbox"
            className="data-[state=active]:bg-white/10"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Inbox
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="broadcast"
                className="data-[state=active]:bg-white/10"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Broadcast
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="data-[state=active]:bg-white/10"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Announcements
              </TabsTrigger>
            </>
          )}
          <TabsTrigger
            value="triggers"
            className="data-[state=active]:bg-white/10"
          >
            <Webhook className="h-3.5 w-3.5 mr-1.5" />
            Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <NotificationList />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="broadcast" className="mt-4">
              <AdminBroadcast />
            </TabsContent>
            <TabsContent value="announcements" className="mt-4">
              <AdminAnnouncementComposer />
            </TabsContent>
          </>
        )}

        <TabsContent value="triggers" className="mt-4">
          <TriggerConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
