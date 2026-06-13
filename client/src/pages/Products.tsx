import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PaginationControls } from "@/components/PaginationControls";
import { QueryErrorState } from "@/components/QueryErrorState";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trackActivation } from "@/lib/userTracking";
import { useDebounce } from "@/hooks/useDebounce";

type ProductStatus = "active" | "draft" | "archived";

interface ProductInventory {
  quantity: number;
  lowStockThreshold: number;
}

interface ProductListItem {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | string;
  compareAtPrice: number | string | null;
  status: ProductStatus;
  categoryId?: number | null;
  imageUrl?: string | null;
  inventory?: ProductInventory | null;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_COLORS: Record<ProductStatus, string> = {
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
  status: "draft" as ProductStatus,
  initialStock: "0",
  lowStockThreshold: "5",
  weight: "",
  categoryId: "none",
  imageUrl: "",
};

type ProductForm = typeof EMPTY_FORM;

const isValidImageUrl = (value: string) => {
  if (!value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

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
  const categoryList = (categories.data ?? []) as CategoryOption[];
  const [imgBroken, setImgBroken] = useState(false);
  const showImagePreview = isValidImageUrl(form.imageUrl) && !imgBroken;

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
        {errors?.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name}</p>
        )}
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
          {errors?.price && (
            <p className="text-red-400 text-xs mt-1">{errors.price}</p>
          )}
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
            onValueChange={value =>
              setForm({ ...form, status: value as ProductStatus })
            }
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
              {categoryList.map(category => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
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
        <div className="mt-1 flex items-start gap-3">
          <Input
            value={form.imageUrl}
            onChange={e => {
              setForm({ ...form, imageUrl: e.target.value });
              setImgBroken(false);
            }}
            placeholder="https://example.com/image.jpg"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
          {showImagePreview && (
            <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white/5 shrink-0">
              <img
                src={form.imageUrl}
                alt="Product preview"
                className="h-full w-full object-cover"
                onError={() => setImgBroken(true)}
              />
            </div>
          )}
        </div>
        {form.imageUrl && !showImagePreview && (
          <p className="mt-2 text-xs text-gray-500">
            Enter a valid image URL to preview the thumbnail.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductListItem | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductListItem | null>(
    null
  );
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>(
    {}
  );
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<
    "active" | "draft" | "archive" | "delete" | null
  >(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const utils = trpc.useUtils();
  const debouncedSearch = useDebounce(search, 300);
  const normalizedSearch = debouncedSearch.trim();
  const hasActiveFilters =
    normalizedSearch.length > 0 || statusFilter !== "all";

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, statusFilter]);

  const getErrors = (f: ProductForm, touched: Record<string, boolean>) => {
    const nameTouched = touched.name ?? false;
    const priceTouched = touched.price ?? false;
    const priceNum = Number(f.price);
    return {
      name:
        nameTouched && !f.name.trim() ? "Product name is required" : undefined,
      price:
        priceTouched && !f.price
          ? "Price is required"
          : priceTouched && priceNum <= 0
            ? "Price must be greater than 0"
            : undefined,
    };
  };

  const products = trpc.products.list.useQuery({
    search: normalizedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit,
  });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      // Funnel: creating a product is a core activation action for new tenants.
      trackActivation("product_created");
      toast.success("Product created successfully");
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setCreateTouched({});
      utils.products.list.invalidate();
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated");
      setEditProduct(null);
      setEditTouched({});
      utils.products.list.invalidate();
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteProduct(null);
      utils.products.list.invalidate();
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const bulkUpdateStatusMutation = trpc.products.bulkUpdateStatus.useMutation({
    onSuccess: data => {
      toast.success(`Updated ${data.updatedCount} product(s)`);
      setSelectedIds([]);
      setBulkAction(null);
      utils.products.list.invalidate();
    },
    onError: error => {
      setBulkAction(null);
      toast.error(error.message || "Something went wrong");
    },
  });

  const bulkArchiveMutation = trpc.products.bulkArchive.useMutation({
    onSuccess: data => {
      toast.success(`Archived ${data.updatedCount} product(s)`);
      setSelectedIds([]);
      setBulkAction(null);
      utils.products.list.invalidate();
    },
    onError: error => {
      setBulkAction(null);
      toast.error(error.message || "Something went wrong");
    },
  });

  const bulkDeleteMutation = trpc.products.bulkDelete.useMutation({
    onSuccess: data => {
      toast.success(`Deleted ${data.deletedCount} product(s)`);
      setSelectedIds([]);
      setBulkAction(null);
      setBulkDeleteConfirmOpen(false);
      utils.products.list.invalidate();
    },
    onError: error => {
      setBulkAction(null);
      toast.error(error.message || "Something went wrong");
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

  const handleEdit = (product: ProductListItem) => {
    setEditProduct(product);
    setEditTouched({});
    setEditForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      compareAtPrice: String(product.compareAtPrice ?? ""),
      sku: product.sku ?? "",
      barcode: "",
      status: product.status ?? "draft",
      initialStock: String(product.inventory?.quantity ?? 0),
      lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 5),
      weight: "",
      categoryId: String(product.categoryId ?? "none"),
      imageUrl: product.imageUrl ?? "",
    });
  };

  const handleUpdate = () => {
    const allTouched = { name: true, price: true };
    setEditTouched(allTouched);
    if (!editProduct) return;
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

  const productResponse = products.data as
    | PaginatedResponse<ProductListItem>
    | undefined;
  const productList = productResponse?.items ?? [];
  const totalProducts = productResponse?.total ?? 0;
  const totalPages = productResponse?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const lowStockCount = productList.filter(
    product =>
      product.inventory &&
      product.inventory.quantity <= product.inventory.lowStockThreshold
  ).length;
  const activeProductCount = productList.filter(
    product => product.status === "active"
  ).length;
  const draftProductCount = productList.filter(
    product => product.status === "draft"
  ).length;
  const allVisibleSelected =
    productList.length > 0 &&
    productList.every(p => selectedIds.includes(p.id));
  const isBulkPending =
    bulkUpdateStatusMutation.isPending ||
    bulkArchiveMutation.isPending ||
    bulkDeleteMutation.isPending;

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
    <DashboardPageShell
      eyebrow="Catalog operations"
      title="Products"
      description="Control merchandising, inventory health, draft cleanup, and bulk catalog operations from one working surface."
      actions={
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
              onTouch={field =>
                setCreateTouched(prev => ({ ...prev, [field]: true }))
              }
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
                disabled={
                  createMutation.isPending ||
                  !form.name ||
                  !form.price ||
                  Number(form.price) <= 0
                }
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
      }
      meta={
        <>
          <Badge variant="outline" className="border-white/10 bg-white/5">
            {totalProducts} product{totalProducts === 1 ? "" : "s"}
          </Badge>
          {hasActiveFilters ? (
            <Badge
              variant="outline"
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
            >
              Filtered view
            </Badge>
          ) : null}
          {lowStockCount > 0 ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-300"
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              {lowStockCount} low stock
            </Badge>
          ) : null}
        </>
      }
      stats={[
        {
          label: "Visible active",
          value: activeProductCount.toLocaleString(),
          helper: "Published products on this page",
          icon: Package,
          tone: "emerald",
        },
        {
          label: "Draft cleanup",
          value: draftProductCount.toLocaleString(),
          helper: "Draft products in the current view",
          icon: Edit,
          tone: "slate",
        },
        {
          label: "Inventory alerts",
          value: lowStockCount.toLocaleString(),
          helper:
            lowStockCount > 0
              ? "Restock or archive low-stock SKUs"
              : "No low-stock alerts visible",
          icon: AlertTriangle,
          tone: lowStockCount > 0 ? "amber" : "emerald",
        },
        {
          label: "Bulk selection",
          value: selectedIds.length.toLocaleString(),
          helper: "Selected for operational action",
          icon: BarChart3,
          tone: selectedIds.length > 0 ? "cyan" : "slate",
        },
      ]}
    >
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products…"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value: ProductStatus | "all") => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPage(1);
              }}
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Clear filters
            </Button>
          )}
        </div>
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
              bulkUpdateStatusMutation.mutate({
                ids: selectedIds,
                status: "active",
              });
            }}
          >
            {bulkAction === "active" && bulkUpdateStatusMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Updating...
              </>
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
              bulkUpdateStatusMutation.mutate({
                ids: selectedIds,
                status: "draft",
              });
            }}
          >
            {bulkAction === "draft" && bulkUpdateStatusMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Updating...
              </>
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
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Archiving...
              </>
            ) : (
              "Archive Selected"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkPending}
            className="border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => setBulkDeleteConfirmOpen(true)}
          >
            {bulkAction === "delete" && bulkDeleteMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Selected"
            )}
          </Button>
        </div>
      )}

      {!products.isLoading && !products.isError && totalProducts > 0 && (
        <PaginationControls
          page={page}
          limit={limit}
          total={totalProducts}
          totalPages={totalPages}
          itemLabel="products"
          onPageChange={setPage}
          onLimitChange={value => {
            setLimit(value);
            setPage(1);
          }}
          disabled={products.isRefetching}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete {selectedIds.length} product
              {selectedIds.length === 1 ? "" : "s"}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">
            This will permanently delete the selected products and their
            inventory records. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteConfirmOpen(false)}
              disabled={bulkDeleteMutation.isPending}
              className="border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 hover:bg-red-500 text-white"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                setBulkAction("delete");
                bulkDeleteMutation.mutate({ ids: selectedIds });
              }}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Product Grid */}
      {products.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-border bg-card/70">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="mt-1 h-4 w-4 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.isError ? (
        <div className="py-20 text-center">
          <QueryErrorState
            icon={Package}
            title="Failed to load products"
            message={products.error?.message}
            onRetry={() => products.refetch()}
            isRetrying={products.isRefetching}
          />
        </div>
      ) : productList.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-5 rounded-full border border-white/10 bg-white/5 p-4">
              <Package className="h-10 w-10 text-[#00D9FF]" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {hasActiveFilters ? "No matching products" : "No products yet"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              {hasActiveFilters
                ? "Try clearing your filters or searching for a different product name or SKU."
                : "Build your catalog with pricing, inventory, and imagery so your team can start selling faster."}
            </p>
            {!hasActiveFilters && (
              <Button
                className="mt-6 bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add your first product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productList.map(product => {
            const isLowStock =
              product.inventory &&
              product.inventory.quantity <= product.inventory.lowStockThreshold;
            const hasDiscount =
              product.compareAtPrice &&
              Number(product.compareAtPrice) > Number(product.price);

            return (
              <Card
                key={product.id}
                className="group border-border bg-card transition-all hover:border-[#00D9FF]/30 hover:shadow-lg hover:shadow-[#00D9FF]/5"
              >
                <CardContent className="relative p-5">
                  <div className="absolute right-5 top-5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 border border-white/10 text-gray-400 hover:bg-[#00D9FF]/5 hover:text-white"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => setDeleteProduct(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="mb-4 flex items-start gap-3 pr-20">
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleSelection(product.id)}
                      className="mt-1 border-white/30 data-[state=checked]:border-[#00D9FF] data-[state=checked]:bg-[#00D9FF] data-[state=checked]:text-[#0A1128]"
                      aria-label={`Select ${product.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-white">
                            {product.name}
                          </h3>
                          {product.sku && (
                            <p className="mt-0.5 font-mono text-xs text-gray-500">
                              {product.sku}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-xs capitalize",
                            STATUS_COLORS[product.status]
                          )}
                        >
                          {product.status}
                        </Badge>
                      </div>

                      {product.description && (
                        <p className="mt-3 line-clamp-2 text-xs text-gray-400">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {product.imageUrl && isValidImageUrl(product.imageUrl) && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#00D9FF]">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        ${Number(product.compareAtPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {product.inventory && (
                    <div
                      className={cn(
                        "mb-4 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                        isLowStock
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-gray-400"
                      )}
                    >
                      {isLowStock ? (
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                      ) : (
                        <BarChart3 className="h-3 w-3 shrink-0" />
                      )}
                      <span>{product.inventory.quantity} in stock</span>
                      {isLowStock && (
                        <span className="font-medium text-amber-500">
                          — Low Stock
                        </span>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full border border-white/10 text-gray-300 transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5 hover:text-white"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Edit product
                  </Button>
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
            onTouch={field =>
              setEditTouched(prev => ({ ...prev, [field]: true }))
            }
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
                updateMutation.isPending ||
                !editForm.name ||
                !editForm.price ||
                Number(editForm.price) <= 0
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
              onClick={() =>
                deleteProduct && deleteMutation.mutate({ id: deleteProduct.id })
              }
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
    </DashboardPageShell>
  );
}
