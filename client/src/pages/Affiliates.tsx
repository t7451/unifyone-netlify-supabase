import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Link2,
  Plus,
  Zap,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Form ─────────────────────────────────────────────────────────────────────

type AffiliateFormData = {
  name: string;
  category: string;
  platform: string;
  commissionRate: string;
  commissionType: string;
  cookieDuration: string;
  affiliateLink: string;
  monthlyEarnings: string;
  pendingPayout: string;
  instantPayout: boolean;
  active: boolean;
  notes: string;
};

const EMPTY_FORM: AffiliateFormData = {
  name: "",
  category: "",
  platform: "",
  commissionRate: "0",
  commissionType: "percentage",
  cookieDuration: "30",
  affiliateLink: "",
  monthlyEarnings: "0",
  pendingPayout: "0",
  instantPayout: false,
  active: true,
  notes: "",
};

function AffiliateDialog({
  open,
  onClose,
  onSave,
  initial,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: AffiliateFormData) => void;
  initial?: AffiliateFormData;
  saving: boolean;
}) {
  const [form, setForm] = useState<AffiliateFormData>(initial ?? EMPTY_FORM);
  const set = (k: keyof AffiliateFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Program" : "Add Affiliate Program"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs">Program Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Shopify Partners" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. E-commerce" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Platform</Label>
              <Input value={form.platform} onChange={(e) => set("platform", e.target.value)} placeholder="e.g. Shopify" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Commission Rate</Label>
              <Input type="number" min="0" max="100" step="0.1" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Commission Type</Label>
              <Select value={form.commissionType} onValueChange={(v) => set("commissionType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cookie Duration (days)</Label>
              <Input type="number" min="0" value={form.cookieDuration} onChange={(e) => set("cookieDuration", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Monthly Earnings ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.monthlyEarnings} onChange={(e) => set("monthlyEarnings", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Pending Payout ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.pendingPayout} onChange={(e) => set("pendingPayout", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Affiliate Link</Label>
            <Input value={form.affiliateLink} onChange={(e) => set("affiliateLink", e.target.value)} placeholder="https://..." className="mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={form.instantPayout} onCheckedChange={(v) => set("instantPayout", v)} id="instant-payout" />
              <Label htmlFor="instant-payout" className="text-xs cursor-pointer">Instant Payout</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} id="active-toggle" />
              <Label htmlFor="active-toggle" className="text-xs cursor-pointer">Active</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes..." className="mt-1 resize-none" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {initial ? "Save Changes" : "Add Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Affiliates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<AffiliateFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: programs, isLoading, refetch } = trpc.affiliates.list.useQuery();
  const { data: summary } = trpc.affiliates.getSummary.useQuery();
  const createMutation = trpc.affiliates.create.useMutation();
  const updateMutation = trpc.affiliates.update.useMutation();
  const deleteMutation = trpc.affiliates.delete.useMutation();

  const handleSave = async (form: AffiliateFormData) => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || undefined,
        platform: form.platform || undefined,
        commissionRate: parseFloat(form.commissionRate) || 0,
        commissionType: form.commissionType as "percentage" | "flat" | "recurring",
        cookieDuration: parseInt(form.cookieDuration) || 30,
        affiliateLink: form.affiliateLink || undefined,
        monthlyEarnings: parseFloat(form.monthlyEarnings) || 0,
        pendingPayout: parseFloat(form.pendingPayout) || 0,
        instantPayout: form.instantPayout,
        active: form.active,
        notes: form.notes || undefined,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success("Program updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Affiliate program added");
      }
      refetch();
      setDialogOpen(false);
      setEditingId(null);
      setEditingForm(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this affiliate program?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Program removed");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (p: typeof programs extends (infer T)[] | undefined ? T : never) => {
    if (!p) return;
    setEditingId((p as { id: number }).id);
    const prog = p as {
      id: number; name: string; category?: string | null; platform?: string | null;
      commissionRate: string | number; commissionType: string; cookieDuration: number;
      affiliateLink?: string | null; monthlyEarnings: string | number;
      pendingPayout: string | number; instantPayout: boolean; active: boolean; notes?: string | null;
    };
    setEditingForm({
      name: prog.name,
      category: prog.category ?? "",
      platform: prog.platform ?? "",
      commissionRate: String(prog.commissionRate),
      commissionType: prog.commissionType,
      cookieDuration: String(prog.cookieDuration),
      affiliateLink: prog.affiliateLink ?? "",
      monthlyEarnings: String(prog.monthlyEarnings),
      pendingPayout: String(prog.pendingPayout),
      instantPayout: prog.instantPayout,
      active: prog.active,
      notes: prog.notes ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-teal-400" />
            Affiliate Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all affiliate programs, commissions, and payout tracking.
          </p>
        </div>
        <Button
          onClick={() => { setEditingId(null); setEditingForm(null); setDialogOpen(true); }}
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Program
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Earnings</p>
            <p className="text-2xl font-bold text-teal-400 mt-1">
              ${(summary?.totalMonthly ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Payout</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              ${(summary?.totalPending ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Programs</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{summary?.activeCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Instant Payout
            </p>
            <p className="text-2xl font-bold mt-1">{summary?.instantPayoutCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Program List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading programs...
        </div>
      ) : !programs?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">No affiliate programs yet</p>
            <p className="text-sm mt-1 mb-4">Add your first program to start tracking commissions.</p>
            <Button
              onClick={() => { setEditingId(null); setEditingForm(null); setDialogOpen(true); }}
              variant="outline"
              className="border-teal-500/40 text-teal-400"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {programs.map((prog) => (
            <Card key={prog.id} className={`transition-colors ${!prog.active ? "opacity-60" : "hover:border-teal-500/30"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{prog.name}</p>
                      {prog.active ? (
                        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <XCircle className="w-3 h-3 mr-1" />Inactive
                        </Badge>
                      )}
                      {prog.instantPayout && (
                        <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                          <Zap className="w-3 h-3 mr-1" />Instant
                        </Badge>
                      )}
                      {prog.category && (
                        <span className="text-xs text-muted-foreground">{prog.category}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-teal-400 font-bold">
                        <TrendingUp className="w-4 h-4" />
                        ${parseFloat(String(prog.monthlyEarnings)).toLocaleString()}/mo
                      </span>
                      {parseFloat(String(prog.pendingPayout)) > 0 && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Clock className="w-4 h-4" />
                          ${parseFloat(String(prog.pendingPayout)).toLocaleString()} pending
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {prog.commissionRate}%{" "}
                        {prog.commissionType === "recurring" ? "recurring" : prog.commissionType === "flat" ? "flat" : "commission"}
                      </span>
                      {prog.cookieDuration > 0 && (
                        <span className="text-muted-foreground">{prog.cookieDuration}d cookie</span>
                      )}
                      {prog.platform && (
                        <span className="text-muted-foreground">via {prog.platform}</span>
                      )}
                    </div>
                    {prog.affiliateLink && (
                      <a
                        href={prog.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-400 hover:underline flex items-center gap-1 mt-1 truncate max-w-sm"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        {prog.affiliateLink}
                      </a>
                    )}
                    {prog.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{prog.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(prog)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDelete(prog.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AffiliateDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingId(null); setEditingForm(null); }}
        onSave={handleSave}
        initial={editingForm ?? undefined}
        saving={saving}
      />
    </div>
  );
}
