export const SCOPE_OPTIONS = [
  "read",
  "write",
  "orders",
  "products",
  "analytics",
  "admin",
];

export const EXPIRY_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
];

export const SOURCE_COLORS: Record<string, string> = {
  stripe: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  shopify: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  n8n: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  internal: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  processed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-gray-400",
};

export const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  tsx: "text-blue-400",
  json: "text-amber-400",
};
