import type { EMPTY_FORM } from "./Products.constants";

export type ProductStatus = "active" | "draft" | "archived";

export interface ProductInventory {
  quantity: number;
  lowStockThreshold: number;
}

export interface ProductListItem {
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

export interface CategoryOption {
  id: number;
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductForm = typeof EMPTY_FORM;

export type BulkAction = "active" | "draft" | "archive" | "delete" | null;
