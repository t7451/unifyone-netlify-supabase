import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-300",
    iconColor: "text-blue-400",
    closeColor: "text-blue-400 hover:text-blue-200",
  },
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-300",
    iconColor: "text-emerald-400",
    closeColor: "text-emerald-400 hover:text-emerald-200",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-300",
    iconColor: "text-amber-400",
    closeColor: "text-amber-400 hover:text-amber-200",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-300",
    iconColor: "text-red-400",
    closeColor: "text-red-400 hover:text-red-200",
  },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;

const LS_KEY = "unifyone_dismissed_announcements";

function getDismissedIds(): Set<number> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<number>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
}

// ── AnnouncementBanner ────────────────────────────────────────────────────────
export function AnnouncementBanner() {
  const utils = trpc.useUtils();
  const { data: announcements = [] } =
    trpc.notifications.listAnnouncements.useQuery(undefined, {
      refetchInterval: 60_000,
    });

  const dismiss = trpc.notifications.dismissAnnouncement.useMutation({
    onSuccess: () => utils.notifications.listAnnouncements.invalidate(),
  });

  // Local dismissed state backed by localStorage
  const [localDismissed, setLocalDismissed] = useState<Set<number>>(() =>
    getDismissedIds()
  );

  useEffect(() => {
    saveDismissedIds(localDismissed);
  }, [localDismissed]);

  const handleDismiss = (id: number, isServerDismissible: boolean) => {
    setLocalDismissed(prev => new Set([...Array.from(prev), id]));
    if (isServerDismissible) {
      dismiss.mutate({ announcementId: id });
    }
  };

  // Only show banner-type announcements with non-empty content, not locally dismissed
  const banners = announcements.filter(
    a =>
      a.type === "banner" &&
      (a.title?.trim() || a.body?.trim()) &&
      !localDismissed.has(a.id)
  );

  if (banners.length === 0) return null;

  return (
    <div className="mb-4 flex w-full flex-col gap-1.5">
      {banners.map(announcement => {
        const severity = (announcement.severity as Severity) ?? "info";
        const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
        const Icon = config.icon;

        return (
          <div
            key={announcement.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm",
              config.bg
            )}
          >
            <Icon
              className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.iconColor)}
            />
            <div className="flex-1 min-w-0">
              {announcement.title?.trim() && (
                <span className={cn("font-semibold mr-2", config.text)}>
                  {announcement.title}
                </span>
              )}
              {announcement.body?.trim() && (
                <span className={cn("opacity-80", config.text)}>
                  {announcement.body}
                </span>
              )}
            </div>
            {/* Always show dismiss button — server-side if dismissible, local-only otherwise */}
            <button
              type="button"
              onClick={() =>
                handleDismiss(
                  announcement.id,
                  announcement.dismissible ?? false
                )
              }
              className={cn(
                "flex-shrink-0 p-0.5 rounded transition-colors",
                config.closeColor
              )}
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── AdminAnnouncementComposer ─────────────────────────────────────────────────
// Inline admin panel for creating/managing announcements
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

export function AdminAnnouncementComposer() {
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "banner" as "banner" | "toast" | "modal",
    severity: "info" as Severity,
    dismissible: true,
    endsAt: "",
  });

  const { data: allAnnouncements = [], isLoading } =
    trpc.notifications.listAllAnnouncements.useQuery();

  const create = trpc.notifications.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("Announcement created — now visible to all users.");
      setForm({
        title: "",
        body: "",
        type: "banner",
        severity: "info",
        dismissible: true,
        endsAt: "",
      });
      utils.notifications.listAllAnnouncements.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const toggle = trpc.notifications.toggleAnnouncement.useMutation({
    onSuccess: () => utils.notifications.listAllAnnouncements.invalidate(),
  });

  const deleteAnn = trpc.notifications.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("Announcement deleted.");
      utils.notifications.listAllAnnouncements.invalidate();
    },
  });

  const handleCreate = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    create.mutate({
      ...form,
      endsAt: form.endsAt || undefined,
    });
  };

  const severityBadgeClass: Record<Severity, string> = {
    info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-base">Create Announcement</CardTitle>
          </div>
          <CardDescription>
            Broadcast a message to all users across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Scheduled maintenance on March 10"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Body</Label>
              <Textarea
                placeholder="Provide details about the announcement..."
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={v =>
                  setForm(f => ({ ...f, type: v as typeof form.type }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner (top of page)</SelectItem>
                  <SelectItem value="toast">Toast (popup)</SelectItem>
                  <SelectItem value="modal">Modal (overlay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={v =>
                  setForm(f => ({ ...f, severity: v as Severity }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (blue)</SelectItem>
                  <SelectItem value="success">Success (green)</SelectItem>
                  <SelectItem value="warning">Warning (amber)</SelectItem>
                  <SelectItem value="error">Error (red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch
                checked={form.dismissible}
                onCheckedChange={v => setForm(f => ({ ...f, dismissible: v }))}
              />
              <Label className="cursor-pointer">Users can dismiss</Label>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={create.isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            {create.isPending ? "Publishing…" : "Publish Announcement"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing announcements */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Active & Past Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : allAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {allAnnouncements.map(a => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {a.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border",
                          severityBadgeClass[a.severity as Severity] ??
                            severityBadgeClass.info
                        )}
                      >
                        {a.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-white/20 text-slate-400"
                      >
                        {a.type}
                      </Badge>
                      {!a.active && (
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-500"
                        >
                          inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {a.body}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Created {new Date(a.createdAt).toLocaleDateString()}
                      {a.endsAt &&
                        ` · Expires ${new Date(a.endsAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-white"
                      onClick={() =>
                        toggle.mutate({ id: a.id, active: !a.active })
                      }
                      title={a.active ? "Deactivate" : "Activate"}
                    >
                      {a.active ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-red-400"
                      onClick={() => deleteAnn.mutate({ id: a.id })}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
