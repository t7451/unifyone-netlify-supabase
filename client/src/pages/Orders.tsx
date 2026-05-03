import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRealtimeOrders } from "@/lib/supabaseRealtime";
import { RealtimeStatus } from "@/components/RealtimeStatus";
import { QueryErrorState } from "@/components/QueryErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  DollarSign,
  User,
  CreditCard,
  Download,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  shipped: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  processing: <RefreshCw className="w-3.5 h-3.5" />,
  shipped: <Truck className="w-3.5 h-3.5" />,
  delivered: <Package className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  refunded: <RefreshCw className="w-3.5 h-3.5" />,
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  refunded: "bg-gray-500/20 text-gray-400",
  partial: "bg-blue-500/20 text-blue-400",
};

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partial",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderItem {
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem = (): OrderItem => ({
  productName: "",
  productSku: "",
  quantity: 1,
  unitPrice: 0,
});

export default function Orders() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();
  const tenantList = trpc.tenant.list.useQuery();
  const tenantId = (tenantList.data?.[0] as any)?.id;

  // Supabase Realtime: auto-refresh orders list on any change
  useRealtimeOrders(tenantId, () => {
    utils.orders.list.invalidate();
  });

  // Create form state
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [itemsTouched, setItemsTouched] = useState<boolean[]>([]);
  // Payment provider reference — required so every order is backed by a real
  // provider object (Stripe ids are verified live against the Stripe API).
  const [paymentProvider, setPaymentProvider] = useState<
    | "stripe_payment_intent"
    | "stripe_checkout_session"
    | "paypal"
    | "square"
    | "shopify"
  >("stripe_payment_intent");
  const [paymentRefId, setPaymentRefId] = useState("");
  const [squareOrderRefId, setSquareOrderRefId] = useState("");

  const orders = trpc.orders.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const orderDetail = trpc.orders.get.useQuery(
    { id: selectedOrder?.id },
    { enabled: !!selectedOrder?.id && showDetail }
  );

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      const queryInput = {
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      };
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update
      await utils.orders.list.cancel(queryInput);
      const previous = utils.orders.list.getData(queryInput);
      // Optimistically apply the new status immediately
      utils.orders.list.setData(queryInput, prev =>
        prev?.map(o => (o.id === id ? { ...o, status } : o))
      );
      return { previous, queryInput };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back on failure
      if (ctx?.previous !== undefined) {
        utils.orders.list.setData(ctx.queryInput, ctx.previous);
      }
      toast.error("Failed to update order status");
    },
    onSuccess: () => {
      toast.success("Order status updated");
      if (showDetail) utils.orders.get.invalidate({ id: selectedOrder?.id });
    },
    onSettled: (_data, _err, _vars, ctx) => {
      // Always revalidate to stay in sync with the server
      if (ctx) utils.orders.list.invalidate(ctx.queryInput);
    },
  });

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully");
      utils.orders.list.invalidate();
      setShowCreate(false);
      resetCreateForm();
    },
    onError: e => toast.error(e.message),
  });

  const resetCreateForm = () => {
    setCustomerEmail("");
    setCustomerName("");
    setItems([emptyItem()]);
    setShippingAmount(0);
    setTaxAmount(0);
    setNotes("");
    setItemsTouched([]);
    setPaymentProvider("stripe_payment_intent");
    setPaymentRefId("");
    setSquareOrderRefId("");
  };

  const buildPaymentInput = () => {
    const id = paymentRefId.trim();
    if (!id) return null;
    switch (paymentProvider) {
      case "stripe_payment_intent":
        return {
          provider: "stripe_payment_intent" as const,
          paymentIntentId: id,
        };
      case "stripe_checkout_session":
        return { provider: "stripe_checkout_session" as const, sessionId: id };
      case "paypal":
        return { provider: "paypal" as const, orderId: id };
      case "square":
        return {
          provider: "square" as const,
          paymentId: id,
          orderId: squareOrderRefId.trim() || undefined,
        };
      case "shopify":
        return { provider: "shopify" as const, orderId: id };
    }
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (
    i: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setItems(prev =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const orderTotal = subtotal + shippingAmount + taxAmount;

  const handleCreate = () => {
    if (items.some(i => !i.productName || i.quantity < 1)) {
      // Mark all items as touched so validation errors appear immediately
      setItemsTouched(Array<boolean>(items.length).fill(true));
      toast.error("All items need a name and quantity ≥ 1");
      return;
    }
    const payment = buildPaymentInput();
    if (!payment) {
      toast.error(
        "Paste a payment provider id (Stripe ids are verified live)."
      );
      return;
    }
    createOrder.mutate({
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      items: items.map(i => ({
        productName: i.productName,
        productSku: i.productSku || undefined,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      shippingAmount,
      taxAmount,
      notes: notes || undefined,
      payment,
    });
  };

  const openDetail = (order: any) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const exportToCSV = () => {
    const rows = orders.data ?? [];
    if (!rows.length) return toast.error("No orders to export");
    const headers = [
      "Order #",
      "Customer",
      "Email",
      "Status",
      "Payment",
      "Total",
      "Created",
    ];
    type OrderRow = {
      orderNumber?: string | number;
      id: number;
      customerName?: string;
      customerEmail?: string;
      status: string;
      paymentStatus?: string;
      totalAmount?: number | string;
      createdAt: Date | string;
    };
    const csvRows = [
      headers.join(","),
      ...(rows as OrderRow[]).map(o =>
        [
          o.orderNumber ?? o.id,
          JSON.stringify(o.customerName ?? ""),
          JSON.stringify(o.customerEmail ?? ""),
          o.status,
          o.paymentStatus ?? "",
          `$${Number(o.totalAmount ?? 0).toFixed(2)}`,
          new Date(o.createdAt).toLocaleDateString(),
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">
              {orders.data?.length ?? 0} order
              {(orders.data?.length ?? 0) !== 1 ? "s" : ""}
            </p>
            <RealtimeStatus />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order number or customer..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-white/3">
                {[
                  "Order",
                  "Customer",
                  "Items",
                  "Total",
                  "Status",
                  "Payment",
                  "Date",
                  "Actions",
                ].map(h => (
                  <th
                    key={h}
                    className="text-left text-gray-400 text-xs font-medium px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.isError ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <QueryErrorState
                      icon={ShoppingCart}
                      title="Failed to load orders"
                      message={orders.error?.message}
                      onRetry={() => orders.refetch()}
                      isRetrying={orders.isRefetching}
                      size="sm"
                    />
                  </td>
                </tr>
              ) : (orders.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">
                      {search || statusFilter !== "all"
                        ? "No orders found"
                        : "No orders yet"}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Create your first order to get started"}
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90"
                      onClick={() => setShowCreate(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Create Order
                    </Button>
                  </td>
                </tr>
              ) : (
                (orders.data ?? []).map((o: any) => (
                  <tr
                    key={o.id}
                    className="border-b border-border hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#00D9FF] font-mono text-xs">
                        {o.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm">
                        {o.customerName ?? "Guest"}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {o.customerEmail ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {o.itemCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      ${Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize flex items-center gap-1 w-fit ${STATUS_COLORS[o.status] ?? ""}`}
                      >
                        {STATUS_ICONS[o.status]}
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${PAYMENT_COLORS[o.paymentStatus] ?? ""}`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-[#00D9FF]"
                          aria-label={`View details for order ${o.orderNumber}`}
                          onClick={() => openDetail(o)}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                        {(o.paymentStatus === "pending" ||
                          o.paymentStatus === "failed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                            aria-label={`Pay now for order ${o.orderNumber}`}
                            onClick={() =>
                              navigate(
                                `/checkout?orderId=${o.id}&amount=${Number(o.total).toFixed(2)}&desc=Order+${encodeURIComponent(o.orderNumber)}`
                              )
                            }
                          >
                            <CreditCard
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            Pay
                          </Button>
                        )}
                        <Select
                          value={o.status}
                          onValueChange={v =>
                            updateStatus.mutate({
                              id: o.id,
                              status: v as OrderStatus,
                            })
                          }
                        >
                          <SelectTrigger
                            className="w-28 h-7 bg-white/5 border-white/10 text-gray-300 text-xs"
                            aria-label={`Change status for order ${o.orderNumber}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0F172A] border-white/10">
                            {ORDER_STATUSES.map(s => (
                              <SelectItem
                                key={s}
                                value={s}
                                className="text-xs capitalize"
                              >
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Order Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#00D9FF]" />
              Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          {orderDetail.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#00D9FF]" />
            </div>
          ) : orderDetail.data ? (
            <div className="space-y-5">
              {/* Status + Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-xs mb-2">Order Status</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={`capitalize ${STATUS_COLORS[(orderDetail.data as any).status] ?? ""}`}
                    >
                      {(orderDetail.data as any).status}
                    </Badge>
                  </div>
                  <Select
                    value={(orderDetail.data as any).status}
                    onValueChange={v =>
                      updateStatus.mutate({
                        id: (orderDetail.data as any).id,
                        status: v as OrderStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-8 bg-white/5 border-white/10 text-gray-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F172A] border-white/10">
                      {ORDER_STATUSES.map(s => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-xs capitalize"
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-xs mb-2">Payment Status</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full capitalize ${PAYMENT_COLORS[(orderDetail.data as any).paymentStatus] ?? ""}`}
                    >
                      {(orderDetail.data as any).paymentStatus}
                    </span>
                  </div>
                  <Select
                    value={(orderDetail.data as any).paymentStatus}
                    onValueChange={v =>
                      updateStatus.mutate({
                        id: (orderDetail.data as any).id,
                        status: (orderDetail.data as any).status,
                        paymentStatus: v as any,
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-8 bg-white/5 border-white/10 text-gray-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F172A] border-white/10">
                      {PAYMENT_STATUSES.map(s => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-xs capitalize"
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order Timeline */}
              {(() => {
                const currentStatus = (orderDetail.data as any)
                  .status as string;
                const timelineSteps: Array<{
                  key: string;
                  label: string;
                  icon: React.ReactNode;
                }> = [
                  {
                    key: "pending",
                    label: "Order Placed",
                    icon: <Clock className="w-4 h-4" />,
                  },
                  {
                    key: "processing",
                    label: "Processing",
                    icon: <RefreshCw className="w-4 h-4" />,
                  },
                  {
                    key: "shipped",
                    label: "Shipped",
                    icon: <Truck className="w-4 h-4" />,
                  },
                  {
                    key: "delivered",
                    label: "Delivered",
                    icon: <CheckCircle className="w-4 h-4" />,
                  },
                ];
                const cancelledOrRefunded =
                  currentStatus === "cancelled" || currentStatus === "refunded";
                const statusOrder = [
                  "pending",
                  "confirmed",
                  "processing",
                  "shipped",
                  "delivered",
                ];
                const currentIdx = statusOrder.indexOf(currentStatus);
                return (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-gray-400 text-xs mb-4">Order Timeline</p>
                    {cancelledOrRefunded ? (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" />
                        <span className="capitalize font-medium">
                          {currentStatus}
                        </span>
                      </div>
                    ) : (
                      <ol className="relative ml-2">
                        {timelineSteps.map((step, idx) => {
                          const stepIdx = statusOrder.indexOf(step.key);
                          const isCompleted = currentIdx >= stepIdx;
                          const isCurrent =
                            currentStatus === step.key ||
                            (step.key === "pending" &&
                              currentStatus === "confirmed" &&
                              currentIdx <= 1);
                          return (
                            <li
                              key={step.key}
                              className="flex items-start gap-3 mb-4 last:mb-0 relative"
                            >
                              {idx < timelineSteps.length - 1 && (
                                <span
                                  className={`absolute left-3.5 top-7 w-px h-6 -translate-x-1/2 ${isCompleted ? "bg-[#00D9FF]/60" : "bg-white/10"}`}
                                />
                              )}
                              <span
                                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${
                                  isCurrent
                                    ? "bg-[#00D9FF] border-[#00D9FF] text-[#0A1128]"
                                    : isCompleted
                                      ? "bg-[#00D9FF]/20 border-[#00D9FF]/40 text-[#00D9FF]"
                                      : "bg-white/5 border-white/10 text-gray-500"
                                }`}
                              >
                                {step.icon}
                              </span>
                              <div className="pt-0.5">
                                <span
                                  className={`text-sm font-medium ${
                                    isCurrent
                                      ? "text-[#00D9FF]"
                                      : isCompleted
                                        ? "text-white"
                                        : "text-gray-500"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                {isCurrent && (
                                  <span className="ml-2 text-xs bg-[#00D9FF]/15 text-[#00D9FF] px-1.5 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                );
              })()}

              {/* Customer */}
              {((orderDetail.data as any).customerName ||
                (orderDetail.data as any).customerEmail) && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-xs mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> Customer
                  </p>
                  <p className="text-white font-medium">
                    {(orderDetail.data as any).customerName ?? "—"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {(orderDetail.data as any).customerEmail ?? "—"}
                  </p>
                </div>
              )}

              {/* Line Items */}
              {(orderDetail.data as any).items?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Line Items</p>
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="text-left text-gray-400 text-xs px-3 py-2">
                            Product
                          </th>
                          <th className="text-right text-gray-400 text-xs px-3 py-2">
                            Qty
                          </th>
                          <th className="text-right text-gray-400 text-xs px-3 py-2">
                            Unit Price
                          </th>
                          <th className="text-right text-gray-400 text-xs px-3 py-2">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(orderDetail.data as any).items.map(
                          (item: any, i: number) => (
                            <tr
                              key={i}
                              className="border-b border-white/5 last:border-0"
                            >
                              <td className="px-3 py-2">
                                <div className="text-white">
                                  {item.productName}
                                </div>
                                {item.productSku && (
                                  <div className="text-gray-500 text-xs">
                                    {item.productSku}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-300">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-300">
                                ${Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-white font-medium">
                                $
                                {(
                                  item.quantity * Number(item.unitPrice)
                                ).toFixed(2)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>
                    $
                    {Number((orderDetail.data as any).subtotal ?? 0).toFixed(2)}
                  </span>
                </div>
                {Number((orderDetail.data as any).taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Tax</span>
                    <span>
                      ${Number((orderDetail.data as any).taxAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                {Number((orderDetail.data as any).shippingAmount) > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Shipping</span>
                    <span>
                      $
                      {Number((orderDetail.data as any).shippingAmount).toFixed(
                        2
                      )}
                    </span>
                  </div>
                )}
                <Separator className="bg-white/10" />
                <div className="flex justify-between text-white font-bold">
                  <span>Total</span>
                  <span className="text-[#00D9FF]">
                    ${Number((orderDetail.data as any).total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {(orderDetail.data as any).notes && (
                <div className="p-3 rounded-lg bg-white/3 border border-white/10">
                  <p className="text-gray-400 text-xs mb-1">Notes</p>
                  <p className="text-gray-300 text-sm">
                    {(orderDetail.data as any).notes}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Created{" "}
                  {new Date(
                    (orderDetail.data as any).createdAt
                  ).toLocaleString()}
                </span>
                <span>ID #{(orderDetail.data as any).id}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Order not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog
        open={showCreate}
        onOpenChange={v => {
          setShowCreate(v);
          if (!v) resetCreateForm();
        }}
      >
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00D9FF]" /> Create Manual Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Customer Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-300 text-sm">Line Items</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-xs h-7"
                  onClick={addItem}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        value={item.productName}
                        onChange={e =>
                          updateItem(i, "productName", e.target.value)
                        }
                        onBlur={() =>
                          setItemsTouched(prev => {
                            const next = [...prev];
                            next[i] = true;
                            return next;
                          })
                        }
                        placeholder="Product name *"
                        className={`bg-white/5 border-white/10 text-white text-sm ${itemsTouched[i] && !item.productName ? "border-red-500/70" : ""}`}
                      />
                      {itemsTouched[i] && !item.productName && (
                        <p className="text-red-400 text-xs mt-0.5">Required</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={item.productSku}
                        onChange={e =>
                          updateItem(i, "productSku", e.target.value)
                        }
                        placeholder="SKU"
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e =>
                          updateItem(
                            i,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        placeholder="Qty"
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={e =>
                          updateItem(
                            i,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Price"
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {items.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                          onClick={() => removeItem(i)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping, Tax, Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Shipping ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={shippingAmount}
                  onChange={e =>
                    setShippingAmount(parseFloat(e.target.value) || 0)
                  }
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Tax ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={taxAmount}
                  onChange={e => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Notes (optional)</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes..."
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>

            {/* Payment provider reference (required) */}
            <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <CreditCard className="w-4 h-4 text-[#00D9FF]" />
                Payment reference
              </div>
              <p className="text-xs text-gray-400">
                Required. Stripe ids are verified live against the Stripe API
                before the order is created.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Provider</Label>
                  <Select
                    value={paymentProvider}
                    onValueChange={v =>
                      setPaymentProvider(v as typeof paymentProvider)
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe_payment_intent">
                        Stripe PaymentIntent (pi_…)
                      </SelectItem>
                      <SelectItem value="stripe_checkout_session">
                        Stripe Checkout Session (cs_…)
                      </SelectItem>
                      <SelectItem value="paypal">PayPal Order</SelectItem>
                      <SelectItem value="square">Square Payment</SelectItem>
                      <SelectItem value="shopify">Shopify Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Provider id</Label>
                  <Input
                    value={paymentRefId}
                    onChange={e => setPaymentRefId(e.target.value)}
                    placeholder={
                      paymentProvider === "stripe_payment_intent"
                        ? "pi_..."
                        : paymentProvider === "stripe_checkout_session"
                          ? "cs_..."
                          : "id"
                    }
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
              </div>
              {paymentProvider === "square" && (
                <div>
                  <Label className="text-gray-300 text-xs">
                    Square order id (optional)
                  </Label>
                  <Input
                    value={squareOrderRefId}
                    onChange={e => setSquareOrderRefId(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tax</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              {shippingAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Shipping</span>
                  <span>${shippingAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="bg-white/10" />
              <div className="flex justify-between text-white font-bold">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-[#00D9FF]" />
                  Total
                </span>
                <span className="text-[#00D9FF]">${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="border border-white/10 text-gray-300 hover:text-white"
              onClick={() => {
                setShowCreate(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createOrder.isPending ||
                items.some(i => !i.productName) ||
                !paymentRefId.trim()
              }
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
            >
              {createOrder.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Create Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
