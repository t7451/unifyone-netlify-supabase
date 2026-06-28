import type { ProductForm } from "./Products.types";

export const isValidImageUrl = (value: string) => {
  if (!value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const getErrors = (f: ProductForm, touched: Record<string, boolean>) => {
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
