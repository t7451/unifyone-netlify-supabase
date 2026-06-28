import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { trackActivation } from "@/lib/userTracking";
import { useDebounce } from "@/hooks/useDebounce";
import { EMPTY_FORM } from "./Products.constants";
import { getErrors } from "./Products.utils";
import type {
  BulkAction,
  PaginatedResponse,
  ProductForm,
  ProductListItem,
  ProductStatus,
} from "./Products.types";

export function useProducts() {
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
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const utils = trpc.useUtils();
  const debouncedSearch = useDebounce(search, 300);
  const normalizedSearch = debouncedSearch.trim();
  const hasActiveFilters =
    normalizedSearch.length > 0 || statusFilter !== "all";

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, statusFilter]);

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

  return {
    // filter state
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    limit,
    setLimit,
    normalizedSearch,
    hasActiveFilters,
    // selection / bulk
    selectedIds,
    setSelectedIds,
    bulkAction,
    setBulkAction,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    allVisibleSelected,
    isBulkPending,
    toggleSelection,
    toggleSelectAllVisible,
    // dialogs / forms
    createOpen,
    setCreateOpen,
    editProduct,
    setEditProduct,
    deleteProduct,
    setDeleteProduct,
    form,
    setForm,
    editForm,
    setEditForm,
    createTouched,
    setCreateTouched,
    editTouched,
    setEditTouched,
    getErrors,
    // queries / mutations
    products,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkUpdateStatusMutation,
    bulkArchiveMutation,
    bulkDeleteMutation,
    // handlers
    handleCreate,
    handleEdit,
    handleUpdate,
    // derived data
    productList,
    totalProducts,
    totalPages,
    lowStockCount,
    activeProductCount,
    draftProductCount,
  };
}
