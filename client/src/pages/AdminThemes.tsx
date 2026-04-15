import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Edit, Archive, Eye, Package, Star, Download, Sparkles,
  CheckCircle2, Clock, FileText, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  pending_review: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  archived: "bg-red-500/15 text-red-400 border-red-500/20",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  pending_review: <Clock className="w-3 h-3" />,
  published: <CheckCircle2 className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

// ── Theme form ────────────────────────────────────────────────────────────────
type ThemeFormData = {
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  priceType: "free" | "paid" | "subscription";
  price: string;
  stripePriceId: string;
  previewUrl: string;
  thumbnailUrl: string;
  downloadUrl: string;
  industry: string;
  complexity: "starter" | "standard" | "advanced";
  status: "draft" | "pending_review" | "published" | "archived";
  featured: boolean;
  tags: string;
  features: string;
  techStack: string;
};

const EMPTY_FORM: ThemeFormData = {
  name: "", slug: "", description: "", longDescription: "",
  priceType: "free", price: "0.00", stripePriceId: "",
  previewUrl: "", thumbnailUrl: "", downloadUrl: "",
  industry: "", complexity: "standard",
  status: "draft", featured: false,
  tags: "", features: "", techStack: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ThemeFormDialog({
  open, onClose, editTheme,
}: {
  open: boolean;
  onClose: () => void;
  editTheme?: any;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ThemeFormData>(() =>
    editTheme ? {
      name: editTheme.name ?? "",
      slug: editTheme.slug ?? "",
      description: editTheme.description ?? "",
      longDescription: editTheme.longDescription ?? "",
      priceType: editTheme.priceType ?? "free",
      price: editTheme.price ?? "0.00",
      stripePriceId: editTheme.stripePriceId ?? "",
      previewUrl: editTheme.previewUrl ?? "",
      thumbnailUrl: editTheme.thumbnailUrl ?? "",
      downloadUrl: editTheme.downloadUrl ?? "",
      industry: editTheme.industry ?? "",
      complexity: editTheme.complexity ?? "standard",
      status: editTheme.status ?? "draft",
      featured: editTheme.featured ?? false,
      tags: (editTheme.tags ?? []).join(", "),
      features: (editTheme.features ?? []).join("\n"),
      techStack: (editTheme.techStack ?? []).join(", "),
    } : EMPTY_FORM
  );

  const set = (key: keyof ThemeFormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const createMutation = trpc.themes.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Theme created");
      utils.themes.adminList.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Failed to create theme", { description: e.message }),
  });

  const updateMutation = trpc.themes.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Theme updated");
      utils.themes.adminList.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Failed to update theme", { description: e.message }),
  });

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || undefined,
      longDescription: form.longDescription || undefined,
      priceType: form.priceType,
      price: form.price,
      stripePriceId: form.stripePriceId || undefined,
      previewUrl: form.previewUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      downloadUrl: form.downloadUrl || undefined,
      industry: form.industry || undefined,
      complexity: form.complexity,
      status: form.status,
      featured: form.featured,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      features: form.features.split("\n").map(f => f.trim()).filter(Boolean),
      techStack: form.techStack.split(",").map(t => t.trim()).filter(Boolean),
      screenshotUrls: [],
    };

    if (editTheme) {
      updateMutation.mutate({ id: editTheme.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0A1128] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editTheme ? "Edit Theme" : "Upload New Theme"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Theme Name *</Label>
              <Input
                value={form.name}
                onChange={e => {
                  set("name", e.target.value);
                  if (!editTheme) set("slug", slugify(e.target.value));
                }}
                placeholder="e.g. Horizon Commerce"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Slug *</Label>
              <Input
                value={form.slug}
                onChange={e => set("slug", e.target.value)}
                placeholder="horizon-commerce"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Short Description</Label>
            <Input
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="One-line summary shown on cards"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Long Description</Label>
            <Textarea
              value={form.longDescription}
              onChange={e => set("longDescription", e.target.value)}
              placeholder="Detailed description shown on the theme detail page"
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Price Type</Label>
              <Select value={form.priceType} onValueChange={v => set("priceType", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1A3A] border-white/10">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid (one-time)</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.priceType !== "free" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Price (USD)</Label>
                  <Input
                    value={form.price}
                    onChange={e => set("price", e.target.value)}
                    placeholder="29.00"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Stripe Price ID</Label>
                  <Input
                    value={form.stripePriceId}
                    onChange={e => set("stripePriceId", e.target.value)}
                    placeholder="price_..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
              </>
            )}
          </div>

          {/* URLs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Thumbnail URL (CDN)</Label>
              <Input
                value={form.thumbnailUrl}
                onChange={e => set("thumbnailUrl", e.target.value)}
                placeholder="https://cdn.example.com/theme-thumbnail.png"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Live Preview URL</Label>
              <Input
                value={form.previewUrl}
                onChange={e => set("previewUrl", e.target.value)}
                placeholder="https://preview.example.com/theme"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Download URL (S3/CDN)</Label>
              <Input
                value={form.downloadUrl}
                onChange={e => set("downloadUrl", e.target.value)}
                placeholder="https://cdn.example.com/theme.zip"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Complexity</Label>
              <Select value={form.complexity} onValueChange={v => set("complexity", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1A3A] border-white/10">
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Industry</Label>
              <Input
                value={form.industry}
                onChange={e => set("industry", e.target.value)}
                placeholder="e.g. E-commerce, SaaS, Portfolio"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Tags (comma-separated)</Label>
            <Input
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="dark, minimal, responsive, tailwind"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Features (one per line)</Label>
            <Textarea
              value={form.features}
              onChange={e => set("features", e.target.value)}
              placeholder={"Responsive design\nDark mode support\nStripe integration\nSEO optimized"}
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Tech Stack (comma-separated)</Label>
            <Input
              value={form.techStack}
              onChange={e => set("techStack", e.target.value)}
              placeholder="React, Tailwind CSS, TypeScript, Vite"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>

          {/* Status + featured */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1A3A] border-white/10">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Featured</Label>
              <Select value={form.featured ? "yes" : "no"} onValueChange={v => set("featured", v === "yes")}>
                <SelectTrigger className="bg-white/5 border-white/10 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1A3A] border-white/10">
                  <SelectItem value="no">Not featured</SelectItem>
                  <SelectItem value="yes">Featured ⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.name}
            className="bg-gradient-to-r from-[#00D9FF] to-blue-500 text-[#060D1F] font-semibold"
          >
            {isPending ? "Saving…" : editTheme ? "Save Changes" : "Upload Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Admin Themes Page ────────────────────────────────────────────────────
export default function AdminThemes() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editTheme, setEditTheme] = useState<any>(null);
  const [reviewTab, setReviewTab] = useState<"themes" | "reviews">("themes");

  const utils = trpc.useUtils();
  const { data: themes = [], isLoading } = trpc.themes.adminList.useQuery();
  const { data: pendingReviews = [] } = trpc.themes.adminListReviews.useQuery({ status: "pending" });

  const archiveMutation = trpc.themes.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Theme archived");
      utils.themes.adminList.invalidate();
    },
    onError: (e) => toast.error("Failed to archive", { description: e.message }),
  });

  const approveReview = trpc.themes.adminUpdateReview.useMutation({
    onSuccess: () => {
      toast.success("Review approved");
      utils.themes.adminListReviews.invalidate();
    },
  });

  const rejectReview = trpc.themes.adminUpdateReview.useMutation({
    onSuccess: () => {
      toast.success("Review rejected");
      utils.themes.adminListReviews.invalidate();
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Theme Store Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Manage templates, pricing, and reviews</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/themes")}
            className="border-white/10 bg-white/5 text-slate-300 gap-2"
          >
            <Eye className="w-4 h-4" />
            View Store
          </Button>
          <Button
            onClick={() => { setEditTheme(null); setShowForm(true); }}
            className="bg-gradient-to-r from-[#00D9FF] to-blue-500 text-[#060D1F] font-semibold gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Theme
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Themes", value: themes.length, icon: Package, color: "text-[#00D9FF]" },
          { label: "Published", value: themes.filter((t: any) => t.status === "published").length, icon: Globe, color: "text-emerald-400" },
          { label: "Pending Review", value: pendingReviews.length, icon: Clock, color: "text-amber-400" },
          { label: "Featured", value: themes.filter((t: any) => t.featured).length, icon: Sparkles, color: "text-purple-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0D1A3A] border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-1 w-fit">
        {(["themes", "reviews"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setReviewTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
              reviewTab === tab ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
            )}
          >
            {tab === "reviews" && pendingReviews.length > 0 ? (
              <span className="flex items-center gap-1.5">
                Reviews
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {pendingReviews.length}
                </span>
              </span>
            ) : (
              tab === "themes" ? "Themes" : "Reviews"
            )}
          </button>
        ))}
      </div>

      {/* Themes table */}
      {reviewTab === "themes" && (
        <div className="bg-[#0D1A3A] border border-white/8 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading themes…</div>
          ) : themes.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No themes yet. Upload your first template.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Installs</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((theme: any) => (
                  <tr key={theme.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {theme.thumbnailUrl ? (
                          <img src={theme.thumbnailUrl} alt={theme.name} className="w-10 h-7 object-cover rounded border border-white/10" />
                        ) : (
                          <div className="w-10 h-7 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                            <Package className="w-3 h-3 text-slate-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-white">{theme.name}</span>
                            {theme.featured && <Sparkles className="w-3 h-3 text-amber-400" />}
                          </div>
                          <span className="text-xs text-slate-500">{theme.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {theme.priceType === "free" ? (
                        <span className="text-emerald-400 text-xs font-semibold">Free</span>
                      ) : (
                        <span className="text-[#00D9FF] text-xs font-semibold">${theme.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border w-fit", STATUS_STYLES[theme.status] ?? STATUS_STYLES.draft)}>
                        {STATUS_ICONS[theme.status]}
                        {theme.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Download className="w-3 h-3" />
                        {theme.installCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditTheme(theme); setShowForm(true); }}
                          className="h-7 px-2 border-white/10 bg-white/5 text-slate-300 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {theme.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => archiveMutation.mutate({ id: theme.id })}
                            className="h-7 px-2 border-red-500/20 bg-red-500/5 text-red-400 hover:text-red-300"
                          >
                            <Archive className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reviews moderation */}
      {reviewTab === "reviews" && (
        <div className="space-y-3">
          {pendingReviews.length === 0 ? (
            <div className="bg-[#0D1A3A] border border-white/8 rounded-xl p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No pending reviews. All caught up!</p>
            </div>
          ) : (
            pendingReviews.map((review: any) => (
              <div key={review.id} className="bg-[#0D1A3A] border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-600")} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">Theme #{review.themeId}</span>
                    </div>
                    {review.title && <p className="text-sm font-medium text-white mb-1">{review.title}</p>}
                    {review.body && <p className="text-sm text-slate-400 line-clamp-3">{review.body}</p>}
                    <p className="text-xs text-slate-600 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approveReview.mutate({ id: review.id, status: "approved" })}
                      className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectReview.mutate({ id: review.id, status: "rejected" })}
                      className="h-7 border-red-500/20 bg-red-500/5 text-red-400 text-xs"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <ThemeFormDialog
          open={showForm}
          onClose={() => { setShowForm(false); setEditTheme(null); }}
          editTheme={editTheme}
        />
      )}
    </div>
  );
}
