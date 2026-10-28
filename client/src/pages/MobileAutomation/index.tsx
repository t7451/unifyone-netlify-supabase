import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Radio,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Globe,
  TrendingUp,
  Activity,
  Calendar,
  Bell,
  Send,
  Users,
  Plus,
  Zap,
  Play,
  Trash2,
  Link2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { AUDIENCE_LABELS, CRON_PRESETS } from "./MobileAutomation.constants";
import { formatRelative } from "./MobileAutomation.utils";
import type {
  Attribution,
  CapiEvent,
  PushSchedule,
  Schedule,
} from "./MobileAutomation.types";
import {
  useAttributionTab,
  useCapiLogTab,
  usePushScheduleTab,
  useSchedulerTab,
} from "./useMobileAutomation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string | null | undefined) {
  if (!status) return <Badge variant="secondary">Never run</Badge>;
  if (status === "success")
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
        Success
      </Badge>
    );
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      Failed
    </Badge>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SchedulerTab() {
  const {
    open,
    setOpen,
    form,
    setForm,
    schedules,
    isLoading,
    create,
    update,
    del,
    trigger,
  } = useSchedulerTab();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            n8n Workflow Schedules
          </h3>
          <p className="text-sm text-muted-foreground">
            Trigger n8n webhooks on a cron schedule — no server required
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Create Workflow Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  className="bg-card border-border mt-1"
                  placeholder="Daily rewards sync"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  className="bg-card border-border mt-1"
                  placeholder="Syncs rewards data to Meta CAPI"
                  value={form.description}
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>n8n Webhook URL</Label>
                <Input
                  className="bg-card border-border mt-1"
                  placeholder="https://your-n8n.app.n8n.cloud/webhook/..."
                  value={form.webhookUrl}
                  onChange={e =>
                    setForm(f => ({ ...f, webhookUrl: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Cron Expression</Label>
                <Input
                  className="bg-card border-border mt-1 font-mono"
                  placeholder="0 9 * * *"
                  value={form.cronExpression}
                  onChange={e =>
                    setForm(f => ({ ...f, cronExpression: e.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {CRON_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() =>
                        setForm(f => ({ ...f, cronExpression: p.value }))
                      }
                      className="text-xs px-2 py-0.5 rounded bg-muted/40 hover:bg-white/15 text-muted-foreground transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                disabled={
                  !form.name || !form.cronExpression || create.isPending
                }
                onClick={() =>
                  create.mutate({
                    ...form,
                    webhookUrl: form.webhookUrl || undefined,
                  })
                }
              >
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card className="bg-card border-border text-center py-12">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No schedules yet. Create one to automate your n8n workflows.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(schedules as Schedule[]).map(s => (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {s.name}
                      </span>
                      {statusBadge(s.lastRunStatus)}
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-border text-muted-foreground"
                      >
                        {s.cronExpression}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {s.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last:{" "}
                        {formatRelative(s.lastRunAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {s.triggerCount ?? 0}{" "}
                        triggers
                      </span>
                      {s.nextRunAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Next:{" "}
                          {new Date(s.nextRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {s.lastRunError && (
                      <p className="text-xs text-red-400 mt-1 font-mono">
                        {s.lastRunError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={v =>
                        update.mutate({ id: s.id, enabled: v })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-muted-foreground hover:bg-muted/40 h-8 px-2"
                      disabled={trigger.isPending}
                      onClick={() => trigger.mutate({ id: s.id })}
                      title="Trigger now"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      onClick={() => del.mutate({ id: s.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AttributionTab() {
  const { stats, list } = useAttributionTab();

  const sourceColors: Record<string, string> = {
    unifyone_app: "text-primary",
    meta_ads: "text-blue-400",
    organic: "text-emerald-400",
    referral: "text-amber-400",
    unknown: "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Clicks",
            value: stats?.total ?? 0,
            icon: Link2,
            color: "text-primary",
          },
          {
            label: "Converted",
            value: stats?.converted ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Conv. Rate",
            value: `${stats?.conversionRate ?? 0}%`,
            icon: TrendingUp,
            color: "text-amber-400",
          },
          {
            label: "Sources",
            value: stats?.bySource?.length ?? 0,
            icon: Globe,
            color: "text-blue-400",
          },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border">
            <CardContent className="p-4">
              <k.icon className={`w-5 h-5 ${k.color} mb-1`} />
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.bySource && stats.bySource.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Attribution by Source (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.bySource.map(s => (
                <div key={s.source} className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium w-32 truncate ${sourceColors[s.source] ?? "text-muted-foreground"}`}
                  >
                    {s.source}
                  </span>
                  <div className="flex-1 bg-muted/40 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.total > 0 ? (s.total / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {s.total} ({s.rate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Recent Deep Link Clicks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!list?.rows?.length ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              No deep link clicks recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-3">Source</th>
                    <th className="text-left py-2 pr-3">Campaign</th>
                    <th className="text-left py-2 pr-3">Path</th>
                    <th className="text-left py-2 pr-3">Converted</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(list.rows as Attribution[]).map(r => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800 hover:bg-muted/40/20"
                    >
                      <td className="py-2 pr-3">
                        <span
                          className={`font-medium ${sourceColors[r.source ?? "unknown"] ?? "text-muted-foreground"}`}
                        >
                          {r.source ?? "unknown"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {r.campaign ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground font-mono text-xs">
                        {r.deepLinkPath ?? "/"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.converted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {formatRelative(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CapiLogTab() {
  const { summary, log } = useCapiLogTab();

  const eventColor: Record<string, string> = {
    PageView: "text-muted-foreground",
    Lead: "text-blue-400",
    Purchase: "text-emerald-400",
    CompleteRegistration: "text-primary",
    GigShiftCompleted: "text-amber-400",
    MileageLogged: "text-cyan-400",
    RewardsKeyEarned: "text-pink-400",
    AppDownloadIntent: "text-orange-400",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Radio className="w-5 h-5 text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {summary?.total ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Total CAPI Events</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <BarChart3 className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {summary?.byEvent?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Distinct Event Types
            </p>
          </CardContent>
        </Card>
        {summary?.byEvent?.[0] && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {summary.byEvent[0].count}
              </p>
              <p className="text-xs text-muted-foreground">
                Top: {summary.byEvent[0].eventName}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {summary?.byEvent && summary.byEvent.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Events by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.byEvent.map(e => (
                <div
                  key={e.eventName}
                  className="flex items-center gap-1.5 bg-muted/40/50 rounded-full px-3 py-1"
                >
                  <span
                    className={`text-xs font-medium ${eventColor[e.eventName] ?? "text-muted-foreground"}`}
                  >
                    {e.eventName}
                  </span>
                  <Badge variant="secondary" className="text-xs h-4 px-1">
                    {e.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Recent CAPI Events
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Server-side events sent to Meta Graph API for deduplication with
            client Pixel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!log?.events?.length ? (
            <div className="text-center py-8">
              <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No CAPI events recorded yet.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Events fire automatically on shift completion, mileage logs, and
                lead submissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-3">Event</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Source URL</th>
                    <th className="text-left py-2">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {(log.events as CapiEvent[]).map(e => (
                    <tr
                      key={e.id}
                      className="border-b border-slate-800 hover:bg-muted/40/20"
                    >
                      <td className="py-2 pr-3">
                        <span
                          className={`font-medium ${eventColor[e.eventName] ?? "text-muted-foreground"}`}
                        >
                          {e.eventName}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {e.status === "sent" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                            Sent
                          </Badge>
                        ) : e.status === "failed" ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Skipped
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs font-mono truncate max-w-[180px]">
                        {e.eventSourceUrl ?? "—"}
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {formatRelative(e.sentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PushScheduleTab() {
  const {
    open,
    setOpen,
    form,
    setForm,
    schedules,
    isLoading,
    create,
    update,
    del,
    sendNow,
    pushSummary,
  } = usePushScheduleTab();

  function pushStatusBadge(status: string) {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
            Sent
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
            Scheduled
          </Badge>
        );
      case "recurring":
        return (
          <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
            Recurring
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Draft
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Mobile Push Scheduling
          </h3>
          <p className="text-sm text-muted-foreground">
            Schedule push notifications for your mobile app users
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> New Push
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Schedule Push
                Notification
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  className="bg-card border-border mt-1"
                  placeholder="New rewards available!"
                  value={form.title}
                  onChange={e =>
                    setForm(f => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Message Body</Label>
                <textarea
                  className="w-full bg-card border border-border rounded-md p-2 mt-1 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={3}
                  placeholder="Check out your new rewards and claim them before they expire..."
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div>
                <Label>Target Audience</Label>
                <select
                  className="w-full bg-card border border-border rounded-md p-2 mt-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={form.targetAudience}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      targetAudience: e.target.value as typeof f.targetAudience,
                    }))
                  }
                >
                  <option value="all">All Users</option>
                  <option value="active_users">Active Users (7d)</option>
                  <option value="inactive_users">Inactive Users (30d+)</option>
                  <option value="new_users">New Users (this week)</option>
                  <option value="custom">Custom Segment</option>
                </select>
              </div>
              <div>
                <Label>Deep Link Path (optional)</Label>
                <Input
                  className="bg-card border-border mt-1 font-mono"
                  placeholder="unifyone://rewards"
                  value={form.deepLinkPath}
                  onChange={e =>
                    setForm(f => ({ ...f, deepLinkPath: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.recurring}
                  onCheckedChange={v => setForm(f => ({ ...f, recurring: v }))}
                />
                <Label className="text-sm">Recurring schedule</Label>
              </div>
              {form.recurring ? (
                <div>
                  <Label>Cron Expression</Label>
                  <Input
                    className="bg-card border-border mt-1 font-mono"
                    placeholder="0 10 * * *"
                    value={form.cronExpression}
                    onChange={e =>
                      setForm(f => ({ ...f, cronExpression: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {CRON_PRESETS.map(p => (
                      <button
                        key={p.value}
                        onClick={() =>
                          setForm(f => ({ ...f, cronExpression: p.value }))
                        }
                        className="text-xs px-2 py-0.5 rounded bg-muted/40 hover:bg-white/15 text-muted-foreground transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Scheduled Date/Time</Label>
                  <Input
                    type="datetime-local"
                    className="bg-card border-border mt-1"
                    value={form.scheduledAt}
                    onChange={e =>
                      setForm(f => ({ ...f, scheduledAt: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                disabled={!form.title || !form.body || create.isPending}
                onClick={() =>
                  create.mutate({
                    title: form.title,
                    body: form.body,
                    targetAudience: form.targetAudience,
                    recurring: form.recurring,
                    ...(form.scheduledAt
                      ? {
                          scheduledAt: new Date(form.scheduledAt).toISOString(),
                        }
                      : {}),
                    ...(form.cronExpression
                      ? { cronExpression: form.cronExpression }
                      : {}),
                    ...(form.deepLinkPath
                      ? { deepLinkPath: form.deepLinkPath }
                      : {}),
                  })
                }
              >
                {create.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Bell className="w-5 h-5 text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {pushSummary.total}
            </p>
            <p className="text-xs text-muted-foreground">Total Schedules</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Send className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {pushSummary.totalSends}
            </p>
            <p className="text-xs text-muted-foreground">Total Sends</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Users className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">
              {pushSummary.active}
            </p>
            <p className="text-xs text-muted-foreground">Active Schedules</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card className="bg-card border-border text-center py-12">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No push notifications scheduled yet.
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Create a schedule to start sending mobile push notifications.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(schedules as PushSchedule[]).map(s => (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {s.title}
                      </span>
                      {pushStatusBadge(s.status)}
                      <Badge
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        {AUDIENCE_LABELS[s.targetAudience] ?? s.targetAudience}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {s.body}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" /> {s.sentCount} sends
                      </span>
                      {s.lastSentAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last:{" "}
                          {formatRelative(s.lastSentAt)}
                        </span>
                      )}
                      {s.scheduledAt && !s.recurring && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {new Date(s.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      {s.cronExpression && s.recurring && (
                        <span className="flex items-center gap-1 font-mono">
                          <RefreshCw className="w-3 h-3" /> {s.cronExpression}
                        </span>
                      )}
                      {s.deepLinkPath && (
                        <span className="flex items-center gap-1 font-mono">
                          <Link2 className="w-3 h-3" /> {s.deepLinkPath}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={v =>
                        update.mutate({ id: s.id, enabled: v })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-muted-foreground hover:bg-muted/40 h-8 px-2"
                      disabled={sendNow.isPending}
                      onClick={() => sendNow.mutate({ id: s.id })}
                      title="Send now"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      onClick={() => del.mutate({ id: s.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MobileAutomation() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Sign in to access Mobile Automation
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-primary" />
              Mobile Automation
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Optional advanced add-on — n8n workflow scheduling, deep link
              attribution, and Meta CAPI event monitoring for users marketing a
              side store or brand
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30">
              <Radio className="w-3 h-3 mr-1" /> CAPI Active
            </Badge>
            <a
              href="https://n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-muted-foreground flex items-center gap-1 transition"
            >
              n8n Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" /> UnifyOne Deep Link Scheme
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use{" "}
                  <code className="bg-card px-1 rounded text-primary">
                    unifyone://
                  </code>{" "}
                  in your Meta Ads to route users directly into the app with
                  attribution.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Home", path: "unifyone://home" },
                  { label: "Rewards", path: "unifyone://rewards" },
                  { label: "Gig Command", path: "unifyone://gig-command" },
                ].map(l => (
                  <button
                    key={l.label}
                    onClick={() => {
                      navigator.clipboard.writeText(l.path);
                    }}
                    className="text-xs bg-card hover:bg-muted/40 text-muted-foreground px-2.5 py-1 rounded border border-border transition font-mono"
                    title={`Copy ${l.path}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="scheduler">
          <TabsList className="bg-card border border-border">
            <TabsTrigger
              value="scheduler"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs sm:text-sm"
            >
              <Zap className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">n8n </span>Schedules
            </TabsTrigger>
            <TabsTrigger
              value="attribution"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs sm:text-sm"
            >
              <Link2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Deep Link </span>Attribution
            </TabsTrigger>
            <TabsTrigger
              value="capi"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs sm:text-sm"
            >
              <Radio className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
              CAPI Log
            </TabsTrigger>
            <TabsTrigger
              value="push"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs sm:text-sm"
            >
              <Bell className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Push </span>Notify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduler" className="mt-4">
            <SchedulerTab />
          </TabsContent>
          <TabsContent value="attribution" className="mt-4">
            <AttributionTab />
          </TabsContent>
          <TabsContent value="capi" className="mt-4">
            <CapiLogTab />
          </TabsContent>
          <TabsContent value="push" className="mt-4">
            <PushScheduleTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
