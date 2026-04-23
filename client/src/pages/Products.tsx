import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  BarChart3,
} from "lucide-react";
import { QueryErrorState } from "@/components/QueryErrorState";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  archived: "bg-red-500/20 text-red-400 border-red-500/30",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
  sku: "",
  barcode: "",
  status: "draft" as "active" | "draft" | "archived",
  initialStock: "0",
  lowStockThreshold: "5",
  weight: "",
  categoryId: "none",
  imageUrl: "",
};

type ProductForm = typeof EMPTY_FORM;

function ProductFormFields({
  form,
  setForm,
  errors,
  onTouch,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  errors?: { name?: string; price?: string };
  onTouch?: (field: string) => void;
}) {
  const categories = trpc.products.categories.useQuery();
  const [imgBroken, setImgBroken] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300 text-sm">Product Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          onBlur={() => onTouch?.("name")}
          placeholder="e.g. Premium Widget Pro"
          className={`bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50 ${errors?.name ? "border-red-500/70" : ""}`}
        />
        {errors?.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Description</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Product description..."
          rows={3}
          className="bg-white/5 border-white/10 text-white mt-1 resize-none focus:border-[#00D9FF]/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">Price *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              onBlur={() => onTouch?.("price")}
              placeholder="0.00"
              className={`bg-white/5 border-white/10 text-white pl-7 focus:border-[#00D9FF]/50 ${errors?.price ? "border-red-500/70" : ""}`}
            />
          </div>
          {errors?.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Compare-at Price</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.compareAtPrice}
              onChange={e =>
                setForm({ ...form, compareAtPrice: e.target.value })
              }
              placeholder="0.00"
              className="bg-white/5 border-white/10 text-white pl-7 focus:border-[#00D9FF]/50"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">SKU</Label>
          <Input
            value={form.sku}
            onChange={e => setForm({ ...form, sku: e.target.value })}
            placeholder="SKU-001"
            className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
          />
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Barcode</Label>
          <Input
            value={form.barcode}
            onChange={e => setForm({ ...form, barcode: e.target.value })}
            placeholder="UPC / EAN"
            className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">Status</Label>
          <Select
            value={form.status}
            onValueChange={v => setForm({ ...form, status: v as any })}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/10">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Category</Label>
          <Select
            value={form.categoryId}
            onValueChange={v => setForm({ ...form, categoryId: v })}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/10">
              <SelectItem value="none">None</SelectItem>
              {(categories.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Inventory
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-gray-300 text-sm">Stock Quantity</Label>
            <Input
              type="number"
              min="0"
              value={form.initialStock}
              onChange={e => setForm({ ...form, initialStock: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
            />
          </div>
          <div>
            <Label className="text-gray-300 text-sm">Low Stock Alert</Label>
            <Input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={e =>
                setForm({ ...form, lowStockThreshold: e.target.value })
              }
              className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
            />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Weight (lbs)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.weight}
          onChange={e => setForm({ ...form, weight: e.target.value })}
          placeholder="0.00"
          className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
        />
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Image URL</Label>
        <Input
          value={form.imageUrl}
          onChange={e => {
            setForm({ ...form, imageUrl: e.target.value });
            setImgBroken(false);
          }}
          placeholder="https://example.com/image.jpg"
          className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
        />
        {form.imageUrl && !imgBroken && (
          <div className="mt-2">
            <img
              src={form.imageUrl}
              alt="Product preview"
              className="w-24 h-24 object-cover rounded-lg border border-white/10"
              onError={() => setImgBroken(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteProduct, setDeleteProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<"active" | "draft" | "archive" | null>(null);
  const utils = trpc.useUtils();

  const getErrors = (f: ProductForm, touched: Record<string, boolean>) => ({
    name: touched.name && !f.name.trim() ? "Product name is required" : undefined,
    price: touched.price && !f.price ? "Price is required"
      : touched.price && Number(f.price) <= 0 ? "Price must be greater than 0"
      : undefined,
  });

  const products = trpc.products.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setCreateTouched({});
      utils.products.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated");
      setEditProduct(null);
      setEditTouched({});
      utils.products.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteProduct(null);
      utils.products.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const bulkUpdateStatusMutation = trpc.products.bulkUpdateStatus.useMutation({
    onSuccess: data => {
      toast.success(`Updated ${data.updatedCount} product(s)`);
      setSelectedIds([]);
      setBulkAction(null);
      utils.products.list.invalidate();
    },
    onError: e => {
      setBulkAction(null);
      toast.error(e.message);
    },
  });

  const bulkArchiveMutation = trpc.products.bulkArchive.useMutation({
    onSuccess: data => {
      toast.success(`Archived ${data.updatedCount} product(s)`);
      setSelectedIds([]);
      setBulkAction(null);
      utils.products.list.invalidate();
    },
    onError: e => {
      setBulkAction(null);
      toast.error(e.message);
    },
  });

  const handleCreate = () => {
    const allTouched = { name: true, price: true };
    setCreateTouched(allTouched);
    if (!form.name || !form.price || Number(form.price) <= 0)
      return toast.error("Name and a valid price are required");

    const parsedCategoryId =
      form.categoryId && form.categoryId !== "none"
        ? Number(form.categoryId)
        : undefined;

    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice
        ? Number(form.compareAtPrice)
        : undefined,
      sku: form.sku || undefined,
      status: form.status,
      initialStock: Number(form.initialStock),
      lowStockThreshold: Number(form.lowStockThreshold),
      categoryId: Number.isFinite(parsedCategoryId)
        ? parsedCategoryId
        : undefined,
      imageUrl: form.imageUrl || undefined,
    });
  };

  const handleEdit = (p: any) => {
    setEditProduct(p);
    setEditTouched({});
    setEditForm({
      name: p.name ?? "",
      description: p.description ?? "",
      price: String(p.price ?? ""),
      compareAtPrice: String(p.compareAtPrice ?? ""),
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      status: p.status ?? "draft",
      initialStock: String(p.inventory?.quantity ?? 0),
      lowStockThreshold: String(p.inventory?.lowStockThreshold ?? 5),
      weight: String(p.weight ?? ""),
      categoryId: String(p.categoryId ?? ""),
      imageUrl: p.imageUrl ?? "",
    });
  };

  const handleUpdate = () => {
    const allTouched = { name: true, price: true };
    setEditTouched(allTouched);
    if (!editForm.name || !editForm.price || Number(editForm.price) <= 0)
      return toast.error("Name and a valid price are required");

    const parsedCategoryId =
      editForm.categoryId && editForm.categoryId !== "none"
        ? Number(editForm.categoryId)
        : undefined;

    updateMutation.mutate({
      id: editProduct.id,
      name: editForm.name,
      description: editForm.description || undefined,
      price: Number(editForm.price),
      compareAtPrice: editForm.compareAtPrice
        ? Number(editForm.compareAtPrice)
        : undefined,
      sku: editForm.sku || undefined,
      status: editForm.status,
      categoryId: Number.isFinite(parsedCategoryId)
        ? parsedCategoryId
        : undefined,
      imageUrl: editForm.imageUrl || undefined,
    });
  };

  const productList = (products.data ?? []) as any[];
  const lowStockCount = productList.filter(
    (p: any) =>
      p.inventory && p.inventory.quantity <= p.inventory.lowStockThreshold
  ).length;
  const allVisibleSelected =
    productList.length > 0 &&
    productList.every(p => selectedIds.includes(p.id));
  const isBulkPending =
    bulkUpdateStatusMutation.isPending || bulkArchiveMutation.isPending;

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev =>
        prev.filter(id => !productList.some(p => p.id === id))
      );
      return;
    }
    setSelectedIds(prev =>
      Array.from(new Set([...prev, ...productList.map(p => p.id)]))
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-1">
            {productList.length} products
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-400">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">
                New Product
              </DialogTitle>
            </DialogHeader>
            <ProductFormFields
              form={form}
              setForm={setForm}
              errors={getErrors(form, createTouched)}
              onTouch={field => setCreateTouched(prev => ({ ...prev, [field]: true }))}
            />
            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name || !form.price || Number(form.price) <= 0}
                className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-white/10">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={toggleSelectAllVisible}
          disabled={productList.length === 0}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          {allVisibleSelected ? "Clear Visible" : "Select Visible"}
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-sm text-gray-300 mr-2">
            {selectedIds.length} selected
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkPending}
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={() => {
              setBulkAction("active");
              bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: "active" });
            }}
          >
            {bulkAction === "active" && bulkUpdateStatusMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Updating...</>
            ) : (
              "Mark Active"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkPending}
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            onClick={() => {
              setBulkAction("draft");
              bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: "draft" });
            }}
          >
            {bulkAction === "draft" && bulkUpdateStatusMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Updating...</>
            ) : (
              "Mark Draft"
            )}
          </Button>
          <Button
            size="sm"
            disabled={isBulkPending}
            className="bg-red-500/90 hover:bg-red-500 text-white"
            onClick={() => {
              setBulkAction("archive");
              bulkArchiveMutation.mutate({ ids: selectedIds });
            }}
          >
            {bulkAction === "archive" && bulkArchiveMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Archiving...</>
            ) : (
              "Archive Selected"
            )}
          </Button>
        </div>
      )}
      {/* Product Grid */}
      {products.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : products.isError ? (
        <div className="text-center py-20">
          <QueryErrorState
            icon={Package}
            title="Failed to load products"
            message={products.error?.message}
            onRetry={() => products.refetch()}
            isRetrying={products.isRefetching}
          />
        </div>
      ) : productList.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No products found</p>
          <p className="text-gray-500 text-sm mt-1">
            {search
              ? "Try a different search term."
              : "Add your first product to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productList.map((p: any) => {
            const isLowStock =
              p.inventory &&
              p.inventory.quantity <= p.inventory.lowStockThreshold;
            const hasDiscount =
              p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
            return (
              <Card
                key={p.id}
                className="bg-card border-border hover:border-[#00D9FF]/30 transition-all group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelection(p.id)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent accent-[#00D9FF]"
                        aria-label={`Select ${p.name}`}
                      />
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold truncate">
                          {p.name}
                        </h3>
                        {p.sku && (
                          <p className="text-gray-500 text-xs mt-0.5 font-mono">
                            {p.sku}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-2 text-xs shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {p.status}
                    </Badge>
                  </div>

                  {p.description && (
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-[#00D9FF]">
                      ${Number(p.price).toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span className="text-gray-500 text-sm line-through">
                        ${Number(p.compareAtPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {p.inventory && (
                    <div
                      className={`flex items-center gap-1.5 text-xs mb-4 px-2 py-1 rounded-md ${isLowStock ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-gray-400"}`}
                    >
                      {isLowStock && (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      )}
                      <BarChart3 className="w-3 h-3 shrink-0" />
                      <span>{p.inventory.quantity} in stock</span>
                      {isLowStock && (
                        <span className="text-amber-500 font-medium">
                          — Low Stock
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-gray-400 hover:text-white border border-white/10 hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5 transition-colors"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => handleEdit(p)}
                    >
                      <Edit className="w-3 h-3 mr-1.5" aria-hidden="true" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 transition-colors"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setDeleteProduct(p)}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog
        open={!!editProduct}
        onOpenChange={open => !open && setEditProduct(null)}
      >
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Edit className="w-4 h-4 text-[#00D9FF]" />
              Edit Product
            </DialogTitle>
          </DialogHeader>
          <ProductFormFields
            form={editForm}
            setForm={setEditForm}
            errors={getErrors(editForm, editTouched)}
            onTouch={field => setEditTouched(prev => ({ ...prev, [field]: true }))}
          />
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => setEditProduct(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                updateMutation.isPending || !editForm.name || !editForm.price || Number(editForm.price) <= 0
              }
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deleteProduct}
        onOpenChange={open => !open && setDeleteProduct(null)}
      >
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-gray-300">
              Are you sure you want to delete{" "}
              <span className="text-white font-semibold">
                "{deleteProduct?.name}"
              </span>
              ?
            </p>
            <p className="text-gray-500 text-sm mt-2">
              This will permanently remove the product and its inventory
              records. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => setDeleteProduct(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteMutation.mutate({ id: deleteProduct.id })}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
