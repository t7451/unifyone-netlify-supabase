import { SOCIAL_PROOF } from "./Home.constants";

export function formatSocialProofValue(
  value: number,
  format: (typeof SOCIAL_PROOF)[number]["format"]
): string {
  if (format === "currencyCompact") {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M+`;
    }
    return `$${new Intl.NumberFormat("en-US").format(value)}`;
  }

  if (format === "uptime") {
    return `${(value / 10).toFixed(1)}%`;
  }

  const formatted = new Intl.NumberFormat("en-US").format(value);
  return format === "countPlus" ? `${formatted}+` : formatted;
}
