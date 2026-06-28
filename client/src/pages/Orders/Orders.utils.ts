import { downloadCsv } from "@/lib/downloadCsv";
import type { OrderItem, OrderSummary } from "./Orders.types";

export const emptyItem = (): OrderItem => ({
  productName: "",
  productSku: "",
  quantity: 1,
  unitPrice: 0,
});

/**
 * Export the given orders to a CSV download using the shared downloadCsv
 * helper. Header order and cell formatting match the original Orders page.
 */
export function exportOrdersToCsv(orderList: OrderSummary[]) {
  downloadCsv(
    `orders-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Order ID",
      "Customer Name",
      "Customer Email",
      "Total",
      "Status",
      "Payment Status",
      "Created Date",
    ],
    orderList.map(order => [
      order.orderNumber || order.id,
      order.customerName ?? "Guest",
      order.customerEmail ?? "",
      Number(order.total).toFixed(2),
      order.status,
      order.paymentStatus,
      new Date(order.createdAt).toLocaleString(),
    ])
  );
}
