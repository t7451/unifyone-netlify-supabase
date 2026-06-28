import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  CreditCard,
  Users,
  Share2,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type {
  DateGroup,
  NotificationDisplayType,
  NotificationType,
} from "./Notifications.types";

// ── Supported trigger events ──────────────────────────────────────────────────
export const TRIGGER_EVENTS = [
  {
    event: "order.created",
    label: "Order Created",
    icon: ShoppingCart,
    color: "text-cyan-400",
  },
  {
    event: "order.status_changed",
    label: "Order Status Changed",
    icon: ShoppingCart,
    color: "text-blue-400",
  },
  {
    event: "payment.received",
    label: "Payment Received",
    icon: CreditCard,
    color: "text-emerald-400",
  },
  {
    event: "lead.submitted",
    label: "Lead Submitted",
    icon: Target,
    color: "text-orange-400",
  },
  {
    event: "team.invite_accepted",
    label: "Team Invite Accepted",
    icon: UserPlus,
    color: "text-indigo-400",
  },
  {
    event: "social.post_published",
    label: "Social Post Published",
    icon: Share2,
    color: "text-pink-400",
  },
];

export const NOTIFICATION_TYPE_OPTIONS: NotificationType[] = [
  "info",
  "success",
  "warning",
  "error",
  "order",
  "payment",
  "team",
  "social",
  "lead",
];

// ── Notification type icon map ─────────────────────────────────────────────────
export const TYPE_ICONS: Record<
  NotificationDisplayType,
  { icon: LucideIcon; color: string; background: string }
> = {
  info: {
    icon: Info,
    color: "text-blue-300",
    background: "bg-blue-500/10 ring-1 ring-blue-500/20",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-300",
    background: "bg-emerald-500/10 ring-1 ring-emerald-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-300",
    background: "bg-amber-500/10 ring-1 ring-amber-500/20",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-300",
    background: "bg-red-500/10 ring-1 ring-red-500/20",
  },
  order: {
    icon: ShoppingCart,
    color: "text-cyan-300",
    background: "bg-cyan-500/10 ring-1 ring-cyan-500/20",
  },
  payment: {
    icon: CreditCard,
    color: "text-violet-300",
    background: "bg-violet-500/10 ring-1 ring-violet-500/20",
  },
  team: {
    icon: Users,
    color: "text-indigo-300",
    background: "bg-indigo-500/10 ring-1 ring-indigo-500/20",
  },
  social: {
    icon: Share2,
    color: "text-pink-300",
    background: "bg-pink-500/10 ring-1 ring-pink-500/20",
  },
  lead: {
    icon: Target,
    color: "text-orange-300",
    background: "bg-orange-500/10 ring-1 ring-orange-500/20",
  },
  system: {
    icon: Bell,
    color: "text-slate-300",
    background: "bg-slate-500/10 ring-1 ring-slate-500/20",
  },
};

export const DATE_GROUP_ORDER: DateGroup[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Older",
];
