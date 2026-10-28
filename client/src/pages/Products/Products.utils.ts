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

export type ProductErrors = Partial<Record<keyof ProductForm, string>>;
export const getErrors = (
  form: ProductForm,
  touched: Record<string, boolean>
): ProductErrors => {
  const errors: ProductErrors = {};
  if (touched.name && !form.name.trim())
    errors.name = "Product name is required";
  for (const key of ["price", "compareAtPrice"] as const) {
    if (!touched[key]) continue;
    if (!form[key].trim() && key === "compareAtPrice") continue;
    if (
      !form[key].trim() ||
      !Number.isFinite(Number(form[key])) ||
      Number(form[key]) < 0
    )
      errors[key] =
        `${key === "price" ? "Price" : "Compare-at price"} must be a finite amount of zero or more`;
  }
  for (const key of ["initialStock", "lowStockThreshold"] as const) {
    if (
      touched[key] &&
      (!form[key].trim() ||
        !Number.isSafeInteger(Number(form[key])) ||
        Number(form[key]) < 0)
    )
      errors[key] =
        `${key === "initialStock" ? "Stock quantity" : "Low stock alert"} must be a whole number of zero or more`;
  }
  if (
    touched.imageUrl &&
    form.imageUrl.trim() &&
    !isValidImageUrl(form.imageUrl)
  )
    errors.imageUrl = "Image URL must use http or https";
  return errors;
};
