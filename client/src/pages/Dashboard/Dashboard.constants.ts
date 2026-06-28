import { CreditCard, Navigation, PackagePlus, Wallet } from "lucide-react";

import type { FeatureCategory } from "@/lib/featureCatalog";

import type { StarterAction } from "./Dashboard.types";

export const ONBOARDING_STORAGE_PREFIX = "unifyone:onboarding:v2";

export const categoryToneClasses: Record<FeatureCategory["tone"], string> = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  slate: "border-slate-400/25 bg-slate-400/10 text-slate-200",
};

export const STATUS_COLORS: Record<string, string> = {
  delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  shipped: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  confirmed: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  processing: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
  refunded: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export const STARTER_ACTIONS: StarterAction[] = [
  {
    title: "Track your first shift",
    description:
      "Start a GPS-tracked gig shift to see your real $/hour, mileage, and tax deduction.",
    href: "/gig-command",
    icon: Navigation,
  },
  {
    title: "Open your money manager",
    description:
      "Pull your earnings together across every platform and see where the money goes.",
    href: "/money-manager",
    icon: Wallet,
  },
  {
    title: "Add your first product",
    description:
      "Selling too? Create a product so orders and revenue can start flowing.",
    href: "/products",
    icon: PackagePlus,
  },
  {
    title: "Connect a payment method",
    description: "Link Stripe or PayPal to start collecting paid orders.",
    href: "/integrations",
    icon: CreditCard,
  },
];
