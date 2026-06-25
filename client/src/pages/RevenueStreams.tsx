import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSearch } from "wouter";
import { DEALFLOW_APP_URL } from "@/lib/dealflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Plus,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Zap,
  Users,
  Box,
  Download,
  Repeat,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  affiliate: {
    label: "Affiliate",
    icon: Link2,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  saas: {
    label: "SaaS",
    icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  consulting: {
    label: "Consulting",
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  physical: {
    label: "Physical",
    icon: Box,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  digital: {
    label: "Digital",
    icon: Download,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  passive: {
    label: "Passive",
    icon: Repeat,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  active: { label: "Active", icon: CheckCircle2, color: "text-emerald-400" },
  pending: { label: "Pending", icon: Clock, color: "text-yellow-400" },
  inactive: {
    label: "Inactive",
    icon: XCircle,
    color: "text-muted-foreground",
  },
  broken: { label: "Broken", icon: AlertTriangle, color: "text-red-400" },
};

// ─── Stream Form ──────────────────────────────────────────────────────────────

type StreamFormData = {
  name: string;
  type: string;
  platform: string;
  monthlyValue: string;
  commissionRate: string;
  status: string;
  affiliateLink: string;
  cookieDuration: string;
  notes: string;
};

const EMPTY_FORM: StreamFormData = {
  name: "",
  type: "affiliate",
  platform: "",
  monthlyValue: "0",
  commissionRate: "",
  status: "active",
  affiliateLink: "",
  cookieDuration: "",
  notes: "",
};

function StreamDialog({
  open,
  onClose,
  onSave,
  initial,
  isEditing,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: StreamFormData) => void;
  initial?: StreamFormData;
  isEditing: boolean;
  saving: boolean;
}) {
  const [form, setForm] = useState<StreamFormData>(initial ?? EMPTY_FORM);
  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_FORM);
  }, [initial, open]);
  const set = (k: keyof StreamFormData, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Stream" : "Add Income Stream"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Stream Name *</Label>
              <Input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. Shopify Affiliate Program"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Platform</Label>
              <Input
                value={form.platform}
                onChange={e => set("platform", e.target.value)}
                placeholder="e.g. Shopify, Amazon"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly Value ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyValue}
                onChange={e => set("monthlyValue", e.target.value)}
                className="mt-1"
              />
            </div>
            {form.type === "affiliate" && (
              <>
                <div>
                  <Label className="text-xs">Commission Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.commissionRate}
                    onChange={e => set("commissionRate", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cookie Duration (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.cookieDuration}
                    onChange={e => set("cookieDuration", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Affiliate Link</Label>
                  <Input
                    value={form.affiliateLink}
                    onChange={e => set("affiliateLink", e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Optional notes..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEditing ? "Save Changes" : "Add Stream"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RevenueStreams() {
  const search = useSearch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<{
    id: number;
    form: StreamFormData;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: streams,
    isLoading,
    refetch,
  } = trpc.revenueStreams.list.useQuery();
  const { data: summary } = trpc.revenueStreams.getSummary.useQuery();
  const createMutation = trpc.revenueStreams.create.useMutation();
  const updateMutation = trpc.revenueStreams.update.useMutation();
  const deleteMutation = trpc.revenueStreams.delete.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("preset") !== "dealflow") return;
    setEditingStream({
      id: 0,
      form: {
        name: "DealFlow Referral Engine",
        type: "affiliate",
        platform: "1commerce.world",
        monthlyValue: "0",
        commissionRate: "",
        status: "active",
        affiliateLink: DEALFLOW_APP_URL,
        cookieDuration: "30",
        notes:
          "External DealFlow acquisition engine for referral bonuses, affiliate offers, and high-intent category traffic.",
      },
    });
    setDialogOpen(true);
  }, [search]);

  const handleSave = async (form: StreamFormData) => {
    setSaving(true);
    try {
      if (editingStream) {
        if (editingStream.id > 0) {
          await updateMutation.mutateAsync({
            id: editingStream.id,
            name: form.name,
            type: form.type as
              | "affiliate"
              | "saas"
              | "consulting"
              | "physical"
              | "digital"
              | "passive",
            platform: form.platform || undefined,
            monthlyValue: parseFloat(form.monthlyValue) || 0,
            commissionRate: form.commissionRate
              ? parseFloat(form.commissionRate)
              : undefined,
            status: form.status as "active" | "pending" | "inactive" | "broken",
            affiliateLink: form.affiliateLink || undefined,
            cookieDuration: form.cookieDuration
              ? parseInt(form.cookieDuration)
              : undefined,
            notes: form.notes || undefined,
          });
          toast.success("Stream updated");
        } else {
          await createMutation.mutateAsync({
            name: form.name,
            type: form.type as
              | "affiliate"
              | "saas"
              | "consulting"
              | "physical"
              | "digital"
              | "passive",
            platform: form.platform || undefined,
            monthlyValue: parseFloat(form.monthlyValue) || 0,
            commissionRate: form.commissionRate
              ? parseFloat(form.commissionRate)
              : undefined,
            status: form.status as "active" | "pending" | "inactive" | "broken",
            affiliateLink: form.affiliateLink || undefined,
            cookieDuration: form.cookieDuration
              ? parseInt(form.cookieDuration)
              : undefined,
            notes: form.notes || undefined,
          });
          toast.success("DealFlow income stream added");
        }
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          type: form.type as
            | "affiliate"
            | "saas"
            | "consulting"
            | "physical"
            | "digital"
            | "passive",
          platform: form.platform || undefined,
          monthlyValue: parseFloat(form.monthlyValue) || 0,
          commissionRate: form.commissionRate
            ? parseFloat(form.commissionRate)
            : undefined,
          status: form.status as "active" | "pending" | "inactive" | "broken",
          affiliateLink: form.affiliateLink || undefined,
          cookieDuration: form.cookieDuration
            ? parseInt(form.cookieDuration)
            : undefined,
          notes: form.notes || undefined,
        });
        toast.success("Income stream added");
      }
      refetch();
      setDialogOpen(false);
      setEditingStream(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this income stream?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Stream removed");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (stream: {
    id: number;
    name: string;
    type: string;
    platform?: string | null;
    monthlyValue: string | number;
    commissionRate?: string | number | null;
    status: string;
    affiliateLink?: string | null;
    cookieDuration?: number | null;
    notes?: string | null;
  }) => {
    setEditingStream({
      id: stream.id,
      form: {
        name: stream.name,
        type: stream.type,
        platform: stream.platform ?? "",
        monthlyValue: String(stream.monthlyValue),
        commissionRate:
          stream.commissionRate != null ? String(stream.commissionRate) : "",
        status: stream.status,
        affiliateLink: stream.affiliateLink ?? "",
        cookieDuration:
          stream.cookieDuration != null ? String(stream.cookieDuration) : "",
        notes: stream.notes ?? "",
      },
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-teal-400" />
            Income Streams
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track every income source that adds to your take-home — affiliate,
            SaaS, consulting, and more.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingStream(null);
            setDialogOpen(true);
          }}
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Stream
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Income</p>
            <p className="text-2xl font-bold text-teal-400 mt-1">
              $
              {(summary?.totalMonthly ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Streams</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">
              {summary?.activeCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Streams</p>
            <p className="text-2xl font-bold mt-1">
              {summary?.totalCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Needs Attention</p>
            <p
              className={`text-2xl font-bold mt-1 ${(summary?.brokenCount ?? 0) > 0 ? "text-red-400" : ""}`}
            >
              {summary?.brokenCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      {summary?.byType && Object.keys(summary.byType).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              Income by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary.byType).map(([type, value]) => {
                const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.passive;
                const Icon = cfg.icon;
                return (
                  <div
                    key={type}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <span className={`text-sm font-bold ${cfg.color}`}>
                      $
                      {Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stream List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading streams...
        </div>
      ) : !streams?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">No income streams yet</p>
            <p className="text-sm mt-1 mb-4">
              Add your first income source to start tracking.
            </p>
            <Button
              onClick={() => {
                setEditingStream(null);
                setDialogOpen(true);
              }}
              variant="outline"
              className="border-teal-500/40 text-teal-400"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Stream
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {streams.map(stream => {
            const typeCfg = TYPE_CONFIG[stream.type] ?? TYPE_CONFIG.passive;
            const statusCfg =
              STATUS_CONFIG[stream.status] ?? STATUS_CONFIG.inactive;
            const TypeIcon = typeCfg.icon;
            const StatusIcon = statusCfg.icon;

            return (
              <Card
                key={stream.id}
                className="hover:border-teal-500/30 transition-colors"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${typeCfg.bg} flex-shrink-0`}>
                    <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{stream.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {stream.platform && (
                            <span className="text-xs text-muted-foreground">
                              {stream.platform}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${typeCfg.color} border-current/30`}
                          >
                            {typeCfg.label}
                          </Badge>
                          <span
                            className={`flex items-center gap-1 text-xs ${statusCfg.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-teal-400">
                            $
                            {parseFloat(
                              String(stream.monthlyValue)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </p>
                          {stream.commissionRate && (
                            <p className="text-xs text-muted-foreground">
                              {stream.commissionRate}% commission
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(stream)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(stream.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {stream.affiliateLink && (
                      <a
                        href={stream.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-400 hover:underline flex items-center gap-1 mt-1 truncate max-w-sm"
                      >
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                        {stream.affiliateLink}
                      </a>
                    )}
                    {stream.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {stream.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <StreamDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingStream(null);
        }}
        onSave={handleSave}
        initial={editingStream?.form}
        isEditing={(editingStream?.id ?? 0) > 0}
        saving={saving}
      />
    </div>
  );
}
