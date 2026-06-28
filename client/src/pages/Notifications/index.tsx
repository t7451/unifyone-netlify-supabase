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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Megaphone,
  Webhook,
  Users,
  Save,
  Trash2,
  CheckCheck,
  Zap,
  Mail,
  Slack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DATE_GROUP_ORDER,
  NOTIFICATION_TYPE_OPTIONS,
  TRIGGER_EVENTS,
  TYPE_ICONS,
} from "./Notifications.constants";
import { timeAgo } from "./Notifications.utils";
import type {
  NotificationDisplayType,
  NotificationType,
} from "./Notifications.types";
import {
  useAdminBroadcast,
  useNotificationList,
  useTriggerConfig,
} from "./useNotifications";

// ── NotificationList (Tier 1 full view) ──────────────────────────────────────
function NotificationList() {
  const {
    isLoading,
    unread,
    markRead,
    markAllRead,
    deleteNotif,
    grouped,
    notifs,
  } = useNotificationList();

  return (
    <div className="space-y-4">
      {/* Header with prominent Mark All Read button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Your Notifications</h3>
          {(unread?.count ?? 0) > 0 && (
            <Badge className="border-cyan-500/30 bg-cyan-500/20 text-xs text-cyan-400">
              {unread?.count} unread
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="h-9 bg-cyan-500 px-4 text-xs font-semibold text-black hover:bg-cyan-400 disabled:bg-cyan-500/40 disabled:text-black/70"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || (unread?.count ?? 0) === 0}
        >
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
          {markAllRead.isPending ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {["Today", "Yesterday", "This Week"].map(group => (
            <div key={group} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-px flex-1" />
              </div>
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`${group}-${index}`}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <Bell className="h-7 w-7 text-cyan-300" />
          </div>
          <p className="text-lg font-semibold text-white">All caught up!</p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            You&apos;ll see order updates, payment alerts, and team activity
            here.
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
                  const notificationType: NotificationDisplayType =
                    NOTIFICATION_TYPE_OPTIONS.includes(
                      n.type as NotificationType
                    )
                      ? (n.type as NotificationDisplayType)
                      : "system";
                  const typeInfo = TYPE_ICONS[notificationType];
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group flex gap-3 rounded-xl border p-4 transition-colors",
                        n.read
                          ? "border-white/5 bg-white/[0.03] hover:bg-white/[0.05]"
                          : "border-cyan-500/20 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.1]"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                          typeInfo.background
                        )}
                      >
                        <Icon className={cn("h-4 w-4", typeInfo.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
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
  const {
    form,
    setForm,
    broadcastForm,
    setBroadcastForm,
    sendToUser,
    broadcast,
    tenantId,
  } = useAdminBroadcast();

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
                onValueChange={value =>
                  setForm(current => ({
                    ...current,
                    type: value as NotificationType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
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
                userId: parseInt(form.userId, 10),
                type: form.type,
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
                onValueChange={value =>
                  setBroadcastForm(current => ({
                    ...current,
                    type: value as NotificationType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
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
                type: broadcastForm.type,
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
  const {
    tenantId,
    triggers,
    isLoading,
    upsert,
    deleteTrigger,
    configs,
    setConfigs,
    handleSave,
  } = useTriggerConfig();

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
