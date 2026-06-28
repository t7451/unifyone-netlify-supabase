import type { ProductStatus } from "./Products.types";

export const STATUS_COLORS: Record<ProductStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  archived: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const EMPTY_FORM = {
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
