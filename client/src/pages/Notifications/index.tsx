import { DashboardPageShell } from "@/components/DashboardPageShell";
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
    error,
    refetch,
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
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Notifications</h3>
          {(unread?.count ?? 0) > 0 && (
            <Badge className="border-primary/30 bg-primary/20 text-xs text-primary">
              {unread?.count} unread
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="min-h-11 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/70"
          onClick={() => markAllRead.mutate()}
          disabled={
            !!error || markAllRead.isPending || (unread?.count ?? 0) === 0
          }
        >
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
          {markAllRead.isPending ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-card p-5 space-y-3"
        >
          <p className="font-medium">Could not load notifications</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Retry notifications
          </Button>
        </div>
      ) : isLoading ? (
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
                  className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            All caught up!
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
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
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </span>
                  <div className="flex-1 h-px bg-muted/40" />
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
                          ? "border-border/70 bg-white/[0.03] hover:bg-white/[0.05]"
                          : "border-primary/20 bg-primary/[0.06] hover:bg-primary/[0.1]"
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
                                ? "text-muted-foreground"
                                : "text-foreground font-medium"
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-600 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-muted-foreground hover:text-primary"
                            onClick={() => markRead.mutate({ id: n.id })}
                            disabled={markRead.isPending}
                            title="Mark as read"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteNotif.mutate({ id: n.id })}
                          disabled={deleteNotif.isPending}
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
      <Card className="border-border bg-muted/40">
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
            className="bg-indigo-500 hover:bg-indigo-600 text-foreground"
          >
            <Bell className="h-4 w-4 mr-2" />
            {sendToUser.isPending ? "Sending…" : "Send Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Broadcast to all tenant users */}
      <Card className="border-border bg-muted/40">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
    error,
    refetch,
    upsert,
    deleteTrigger,
    configs,
    setConfigs,
    handleSave,
  } = useTriggerConfig();

  if (!tenantId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No active tenant. Please complete onboarding first.</p>
      </div>
    );
  }

  if (error)
    return (
      <div
        role="alert"
        className="rounded-xl border border-border bg-card p-5 space-y-3"
      >
        <p>Could not load trigger configuration</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry triggers
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Webhook className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          Event Trigger Configuration
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure which channels receive notifications when each platform event
        fires. Changes are saved per-event.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {TRIGGER_EVENTS.map(({ event, label, icon: EventIcon, color }) => {
            const cfg = configs[event] ?? {};
            const existingTrigger = triggers.find(t => t.event === event);

            return (
              <Card key={event} className="border-border bg-muted/40">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 flex-shrink-0", color)}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground font-mono">
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
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
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
                              className="h-11 w-11 text-muted-foreground hover:text-red-400"
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
                            className="min-h-11 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
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
                            <Bell className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground">
                              Email alerts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Conditional inputs */}
                      {cfg.n8nEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
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
                            className="min-h-11 text-xs"
                          />
                        </div>
                      )}
                      {cfg.slackEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
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
                            className="min-h-11 text-xs"
                          />
                        </div>
                      )}
                      {cfg.emailEnabled && (
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
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
                            className="min-h-11 text-xs"
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
    <DashboardPageShell
      eyebrow="Your account"
      title="Notification Center"
      description="Manage your in-app alerts, admin broadcasts, announcements, and event-driven webhook triggers."
    >
      {/* Active announcement banners */}
      <AnnouncementBanner />

      {/* Tabs */}
      <Tabs defaultValue="inbox">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 border border-border bg-muted p-1">
          <TabsTrigger
            value="inbox"
            className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Inbox
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="broadcast"
                className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Broadcast
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Announcements
              </TabsTrigger>
            </>
          )}
          <TabsTrigger
            value="triggers"
            className="min-h-11 data-[state=active]:bg-background data-[state=active]:text-foreground"
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
    </DashboardPageShell>
  );
}
