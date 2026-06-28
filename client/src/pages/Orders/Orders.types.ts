import type { ORDER_STATUSES, PAYMENT_STATUSES } from "./Orders.constants";

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  total: number | string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  createdAt: Date | string;
  itemCount?: number | null;
}

export interface OrderDetailItem {
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: number | string;
}

export interface OrderDetailData extends OrderSummary {
  subtotal?: number | string | null;
  taxAmount?: number | string | null;
  shippingAmount?: number | string | null;
  notes?: string | null;
  items?: OrderDetailItem[];
}

export interface OrderItem {
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentProvider =
  | "stripe_payment_intent"
  | "stripe_checkout_session"
  | "paypal"
  | "square"
  | "shopify";
