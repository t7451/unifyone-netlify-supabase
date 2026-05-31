import {
  Truck,
  ShoppingBag,
  CreditCard,
  Package,
  Sparkles,
} from "lucide-react";

const GROUPS = [
  {
    label: "Gig & delivery",
    items: [
      "DoorDash",
      "Uber Eats",
      "Instacart",
      "Amazon Flex",
      "Grubhub",
      "Spark",
    ],
    icon: Truck,
  },
  {
    label: "Commerce",
    items: ["Shopify", "WooCommerce", "Square Online", "BigCommerce"],
    icon: ShoppingBag,
  },
  {
    label: "Payments",
    items: ["Stripe", "PayPal", "Square", "Shopify Payments"],
    icon: CreditCard,
  },
  {
    label: "Fulfillment & ops",
    items: ["ShipStation", "n8n", "Zapier"],
    icon: Package,
  },
  {
    label: "AI providers",
    items: ["Anthropic Claude", "OpenAI GPT-4", "Google Gemini", "300+ models"],
    icon: Sparkles,
  },
];

export function IntegrationsGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {GROUPS.map(g => (
        <div
          key={g.label}
          className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-card"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <g.icon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-ink-900">{g.label}</h3>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {g.items.map(i => (
              <li
                key={i}
                className="rounded-full border border-ink-900/10 bg-ink-900/[.02] px-3 py-1 text-xs font-medium text-ink-700"
              >
                {i}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
