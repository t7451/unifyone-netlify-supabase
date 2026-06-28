export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Render an `ask_kai` MCP result into displayable text. MCP tool results are
 * commonly `{ content: [{ type: "text", text }] }`, but may also be a plain
 * string or an object with `answer`/`text`. Fall back to pretty JSON.
 */
export function formatKaiAnswer(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (answer && typeof answer === "object") {
    const obj = answer as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      const text = obj.content
        .map(part =>
          part && typeof part === "object" && "text" in part
            ? String((part as Record<string, unknown>).text ?? "")
            : ""
        )
        .filter(Boolean)
        .join("\n")
        .trim();
      if (text) return text;
    }
    if (typeof obj.answer === "string") return obj.answer;
    if (typeof obj.text === "string") return obj.text;
  }
  return JSON.stringify(answer, null, 2);
}

export function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function recordsFrom(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordFrom) : [];
}

export function getString(source: unknown, keys: string[], fallback = "—") {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return fallback;
}

export function getNumber(source: unknown, keys: string[], fallback = 0) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return fallback;
}

export function getBoolean(source: unknown, keys: string[], fallback = false) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

export function getDateLabel(source: unknown, keys: string[]) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
    }
  }
  return "—";
}

export function formatCurrency(value: number) {
  const normalized = value > 1000 ? value / 100 : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(normalized);
}

export function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function healthForTenant(tenant: unknown) {
  const explicit = getNumber(tenant, ["healthScore", "overallHealthScore"], -1);
  const status = getString(tenant, ["status"], "active");
  const subscription = getString(tenant, ["subscriptionStatus"], "active");
  const syncEnabled = getBoolean(tenant, ["shopifySyncEnabled"], false);
  const score =
    explicit >= 0
      ? Math.min(100, Math.max(0, explicit))
      : Math.max(
          35,
          94 -
            (status === "suspended" || status === "cancelled" ? 35 : 0) -
            (subscription === "past_due" ? 25 : 0) -
            (!syncEnabled ? 8 : 0)
        );
  if (score >= 80)
    return { score, label: "Healthy", className: "bg-emerald-500" };
  if (score >= 60) return { score, label: "Watch", className: "bg-amber-500" };
  return { score, label: "Critical", className: "bg-red-500" };
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
