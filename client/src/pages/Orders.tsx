import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRealtimeOrders } from "@/lib/supabaseRealtime";
import { RealtimeStatus } from "@/components/RealtimeStatus";
import { PaginationControls } from "@/components/PaginationControls";
import { QueryErrorState } from "@/components/QueryErrorState";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/downloadCsv";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/useMobile";
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
  Trash2,
  AlertTriangle,
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
const ORDER_FILTER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partial",
] as const;
const PAYMENT_FILTER_STATUSES = [
  "paid",
  "pending",
  "failed",
  "refunded",
] as const;
const ORDER_TIMELINE = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type OrderPaymentStatus = (typeof PAYMENT_STATUSES)[number];

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface OrderSummary {
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

interface OrderDetailItem {
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: number | string;
}

interface OrderDetailData extends OrderSummary {
  subtotal?: number | string | null;
  taxAmount?: number | string | null;
  shippingAmount?: number | string | null;
  notes?: string | null;
  items?: OrderDetailItem[];
}

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
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    OrderPaymentStatus | "all"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const utils = trpc.useUtils();
  const debouncedSearch = useDebounce(search, 300);
  const normalizedSearch = debouncedSearch.trim();
  const tenantList = trpc.tenant.list.useQuery();
  const tenantId = tenantList.data?.[0]?.id;

  const hasActiveFilters =
    normalizedSearch.length > 0 ||
    statusFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);
  const activeFilterCount = [
    normalizedSearch,
    statusFilter !== "all" ? statusFilter : "",
    paymentStatusFilter !== "all" ? paymentStatusFilter : "",
    dateFrom,
    dateTo,
  ].filter(Boolean).length;
  const queryInput = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      paymentStatus:
        paymentStatusFilter === "all" ? undefined : paymentStatusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit,
    }),
    [
      normalizedSearch,
      statusFilter,
      paymentStatusFilter,
      dateFrom,
      dateTo,
      page,
      limit,
    ]
  );

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, statusFilter, paymentStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [isMobile]);

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

  const orders = trpc.orders.list.useQuery(queryInput);
  const orderResponse = orders.data as
    | PaginatedResponse<OrderSummary>
    | undefined;
  const orderList = orderResponse?.items ?? [];
  const totalOrders = orderResponse?.total ?? 0;
  const totalPages = orderResponse?.totalPages ?? 1;
  const allVisibleSelected =
    orderList.length > 0 &&
    orderList.every(order => selectedIds.includes(order.id));
  const someVisibleSelected =
    orderList.some(order => selectedIds.includes(order.id)) &&
    !allVisibleSelected;
  const visibleRevenue = orderList.reduce(
    (total, order) => total + Number(order.total ?? 0),
    0
  );
  const paidVisibleCount = orderList.filter(
    order => order.paymentStatus === "paid"
  ).length;
  const openFulfillmentCount = orderList.filter(
    order =>
      !["delivered", "cancelled", "refunded"].includes(String(order.status))
  ).length;

  const selectedOrderId: number = selectedOrder?.id ?? 0;
  const orderDetail = trpc.orders.get.useQuery(
    { id: selectedOrderId },
    { enabled: selectedOrderId > 0 && showDetail }
  );
  const orderData = orderDetail.data as OrderDetailData | undefined;

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onMutate: async ({ id, status, paymentStatus }) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update
      await utils.orders.list.cancel(queryInput);
      const previous = utils.orders.list.getData(queryInput);
      // Optimistically apply the new status immediately
      utils.orders.list.setData(queryInput, prev =>
        prev
          ? {
              ...prev,
              items: prev.items.map(order =>
                order.id === id
                  ? {
                      ...order,
                      status,
                      paymentStatus: paymentStatus ?? order.paymentStatus,
                    }
                  : order
              ),
            }
          : prev
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
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const bulkDeleteOrders = trpc.orders.bulkDelete.useMutation({
    onSuccess: data => {
      toast.success(`Deleted ${data.deletedCount} order(s)`);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      utils.orders.list.invalidate();
      if (selectedOrder && selectedIds.includes(selectedOrder.id)) {
        setSelectedOrder(null);
        setShowDetail(false);
      }
    },
    onError: error => toast.error(error.message || "Something went wrong"),
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

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev =>
        prev.filter(id => !orderList.some(order => order.id === id))
      );
      return;
    }

    setSelectedIds(prev =>
      Array.from(new Set([...prev, ...orderList.map(order => order.id)]))
    );
  };

  const openDetail = (order: OrderSummary) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const exportToCSV = () => {
    if (!orderList.length) {
      toast.error("No orders to export");
      return;
    }

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
  };

  return (
    <DashboardPageShell
      eyebrow="Order operations"
      title="Orders"
      description="Prioritize fulfillment, payment exceptions, bulk cleanup, exports, and real-time order flow from the command queue."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={orderList.length === 0}
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
        </>
      }
      meta={
        <>
          <Badge variant="outline" className="border-white/10 bg-white/5">
            {totalOrders} order{totalOrders !== 1 ? "s" : ""}
          </Badge>
          <RealtimeStatus />
          {hasActiveFilters ? (
            <Badge
              variant="outline"
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
            >
              {activeFilterCount} active filter
              {activeFilterCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </>
      }
      stats={[
        {
          label: "Visible revenue",
          value: `$${visibleRevenue.toFixed(2)}`,
          helper: "Current page order value",
          icon: DollarSign,
          tone: "emerald",
        },
        {
          label: "Paid orders",
          value: paidVisibleCount.toLocaleString(),
          helper: "Paid orders in this view",
          icon: CreditCard,
          tone: "cyan",
        },
        {
          label: "Fulfillment queue",
          value: openFulfillmentCount.toLocaleString(),
          helper: "Not delivered, cancelled, or refunded",
          icon: Truck,
          tone: openFulfillmentCount > 0 ? "amber" : "emerald",
        },
        {
          label: "Selected",
          value: selectedIds.length.toLocaleString(),
          helper: "Ready for bulk operations",
          icon: Trash2,
          tone: selectedIds.length > 0 ? "rose" : "slate",
        },
      ]}
    >
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {isMobile && (
            <Button
              variant="outline"
              onClick={() => setMobileFiltersOpen(open => !open)}
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Filters
              {activeFilterCount > 0 && (
                <Badge className="bg-[#00D9FF]/15 text-[#00D9FF] hover:bg-[#00D9FF]/15">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={toggleSelectAllVisible}
            disabled={orderList.length === 0}
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            {allVisibleSelected ? "Clear Visible" : "Select Visible"}
          </Button>
        </div>

        {(!isMobile || mobileFiltersOpen) && (
          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by customer, order ID…"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={value =>
                setStatusFilter(value as OrderStatus | "all")
              }
            >
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#0F172A] border-white/10">
                <SelectItem value="all">All</SelectItem>
                {ORDER_FILTER_STATUSES.map(status => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="capitalize"
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={paymentStatusFilter}
              onValueChange={value =>
                setPaymentStatusFilter(value as OrderPaymentStatus | "all")
              }
            >
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-44">
                <SelectValue placeholder="All payments" />
              </SelectTrigger>
              <SelectContent className="bg-[#0F172A] border-white/10">
                <SelectItem value="all">All</SelectItem>
                {PAYMENT_FILTER_STATUSES.map(status => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="capitalize"
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-1 sm:w-[150px]">
              <Label className="text-xs text-gray-400">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-[150px]">
              <Label className="text-xs text-gray-400">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPaymentStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="mr-2 text-sm text-gray-300">
            {selectedIds.length} selected
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkDeleteOrders.isPending}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setBulkDeleteConfirmOpen(true)}
          >
            {bulkDeleteOrders.isPending ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete selected
              </>
            )}
          </Button>
        </div>
      )}

      <Dialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <DialogContent className="max-w-md border-white/10 bg-[#0F172A] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete {selectedIds.length} order
              {selectedIds.length === 1 ? "" : "s"}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            This permanently removes the selected orders and their line items.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10 text-gray-300"
              disabled={bulkDeleteOrders.isPending}
              onClick={() => setBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              disabled={bulkDeleteOrders.isPending}
              onClick={() => bulkDeleteOrders.mutate({ ids: selectedIds })}
            >
              {bulkDeleteOrders.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        {(orders.isLoading || orders.isError || orderList.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border bg-white/3">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    <Checkbox
                      checked={
                        allVisibleSelected ||
                        (someVisibleSelected ? "indeterminate" : false)
                      }
                      onCheckedChange={() => toggleSelectAllVisible()}
                      aria-label="Select all visible orders"
                      className="border-white/30 data-[state=checked]:border-[#00D9FF] data-[state=checked]:bg-[#00D9FF] data-[state=checked]:text-[#0A1128]"
                    />
                  </th>
                  {[
                    "Order",
                    "Customer",
                    "Items",
                    "Total",
                    "Status",
                    "Payment",
                    "Date",
                    "Actions",
                  ].map(header => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-10" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-8 w-40" />
                      </td>
                    </tr>
                  ))
                ) : orders.isError ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
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
                ) : (
                  orderList.map(order => (
                    <tr
                      key={order.id}
                      className="border-b border-border/60 transition-colors hover:bg-white/[0.03] last:border-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onCheckedChange={() => toggleSelection(order.id)}
                          aria-label={`Select order ${order.orderNumber}`}
                          className="border-white/30 data-[state=checked]:border-[#00D9FF] data-[state=checked]:bg-[#00D9FF] data-[state=checked]:text-[#0A1128]"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-xs text-[#00D9FF]">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-white">
                          {order.customerName ?? "Guest"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.customerEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 align-top">
                        {order.itemCount ?? "—"}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-white">
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex w-fit items-center gap-1 text-xs capitalize",
                            STATUS_COLORS[order.status]
                          )}
                        >
                          {STATUS_ICONS[order.status]}
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs capitalize",
                            PAYMENT_COLORS[order.paymentStatus]
                          )}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-[#00D9FF]"
                            aria-label={`View details for order ${order.orderNumber}`}
                            onClick={() => openDetail(order)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          {(order.paymentStatus === "pending" ||
                            order.paymentStatus === "failed") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              aria-label={`Pay now for order ${order.orderNumber}`}
                              onClick={() =>
                                navigate(
                                  `/checkout?orderId=${order.id}&amount=${Number(order.total).toFixed(2)}&desc=Order+${encodeURIComponent(order.orderNumber)}`
                                )
                              }
                            >
                              <CreditCard
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Pay
                            </Button>
                          )}
                          <Select
                            value={order.status}
                            onValueChange={value =>
                              updateStatus.mutate({
                                id: order.id,
                                status: value as OrderStatus,
                              })
                            }
                          >
                            <SelectTrigger
                              className="h-7 w-28 border-white/10 bg-white/5 text-xs text-gray-300"
                              aria-label={`Change status for order ${order.orderNumber}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-[#0F172A]">
                              {ORDER_STATUSES.map(status => (
                                <SelectItem
                                  key={status}
                                  value={status}
                                  className="text-xs capitalize"
                                >
                                  {status}
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
        )}

        {!orders.isLoading && !orders.isError && totalOrders > 0 && (
          <div className="border-t border-white/10 px-4 py-4 sm:px-6">
            <PaginationControls
              page={page}
              limit={limit}
              total={totalOrders}
              totalPages={totalPages}
              itemLabel="orders"
              onPageChange={setPage}
              onLimitChange={value => {
                setLimit(value);
                setPage(1);
              }}
              disabled={orders.isRefetching}
            />
          </div>
        )}

        {!orders.isLoading && !orders.isError && orderList.length === 0 && (
          <Card className="rounded-none border-0 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-5 rounded-full border border-white/10 bg-white/5 p-4">
                <ShoppingCart className="h-10 w-10 text-[#00D9FF]" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {hasActiveFilters ? "No orders found" : "No orders yet"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                {hasActiveFilters
                  ? "Try adjusting your filters to find the order you're looking for."
                  : "Orders will appear here as customers check out or when your team creates manual orders."}
              </p>
              {!hasActiveFilters && (
                <Button
                  size="sm"
                  className="mt-6 bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create your first order
                </Button>
              )}
            </CardContent>
          </Card>
        )}
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
              <Loader2 className="h-6 w-6 animate-spin text-[#00D9FF]" />
            </div>
          ) : orderData ? (
            <div className="space-y-5">
              {/* Status + Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-xs text-gray-400">Order Status</p>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        STATUS_COLORS[orderData.status]
                      )}
                    >
                      {orderData.status}
                    </Badge>
                  </div>
                  <Select
                    value={orderData.status}
                    onValueChange={value =>
                      updateStatus.mutate({
                        id: orderData.id,
                        status: value as OrderStatus,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-full border-white/10 bg-white/5 text-xs text-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0F172A]">
                      {ORDER_STATUSES.map(status => (
                        <SelectItem
                          key={status}
                          value={status}
                          className="text-xs capitalize"
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-xs text-gray-400">Payment Status</p>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs capitalize",
                        PAYMENT_COLORS[orderData.paymentStatus]
                      )}
                    >
                      {orderData.paymentStatus}
                    </span>
                  </div>
                  <Select
                    value={orderData.paymentStatus}
                    onValueChange={value =>
                      updateStatus.mutate({
                        id: orderData.id,
                        status: orderData.status,
                        paymentStatus: value as OrderPaymentStatus,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-full border-white/10 bg-white/5 text-xs text-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0F172A]">
                      {PAYMENT_STATUSES.map(status => (
                        <SelectItem
                          key={status}
                          value={status}
                          className="text-xs capitalize"
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order Timeline */}
              {(() => {
                const currentIndex = ORDER_TIMELINE.indexOf(
                  orderData.status as (typeof ORDER_TIMELINE)[number]
                );
                const terminalStatus =
                  orderData.status === "cancelled" ||
                  orderData.status === "refunded"
                    ? orderData.status
                    : null;
                const timelineMeta: Record<
                  (typeof ORDER_TIMELINE)[number],
                  { label: string; icon: React.ReactNode }
                > = {
                  pending: {
                    label: "Pending",
                    icon: <Clock className="h-4 w-4" />,
                  },
                  confirmed: {
                    label: "Confirmed",
                    icon: <CheckCircle className="h-4 w-4" />,
                  },
                  processing: {
                    label: "Processing",
                    icon: <RefreshCw className="h-4 w-4" />,
                  },
                  shipped: {
                    label: "Shipped",
                    icon: <Truck className="h-4 w-4" />,
                  },
                  delivered: {
                    label: "Delivered",
                    icon: <Package className="h-4 w-4" />,
                  },
                };

                return (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-400">Order Timeline</p>
                      {terminalStatus && (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium capitalize text-red-300">
                          {terminalStatus}
                        </span>
                      )}
                    </div>
                    <ol className="grid gap-3 md:grid-cols-5">
                      {ORDER_TIMELINE.map((status, index) => {
                        const isComplete = currentIndex >= index;
                        const isCurrent = orderData.status === status;
                        const meta = timelineMeta[status];

                        return (
                          <li key={status} className="relative">
                            <div
                              className={cn(
                                "flex h-full flex-col gap-3 rounded-xl border p-3 transition-colors",
                                isCurrent
                                  ? "border-[#00D9FF]/60 bg-[#00D9FF]/10"
                                  : isComplete
                                    ? "border-[#00D9FF]/30 bg-white/[0.04]"
                                    : "border-white/10 bg-white/[0.02]"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full border",
                                  isCurrent
                                    ? "border-[#00D9FF] bg-[#00D9FF] text-[#0A1128]"
                                    : isComplete
                                      ? "border-[#00D9FF]/40 bg-[#00D9FF]/15 text-[#00D9FF]"
                                      : "border-white/10 bg-white/5 text-gray-500"
                                )}
                              >
                                {meta.icon}
                              </span>
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    isCurrent
                                      ? "text-[#00D9FF]"
                                      : isComplete
                                        ? "text-white"
                                        : "text-gray-500"
                                  )}
                                >
                                  {meta.label}
                                </p>
                                {isCurrent && (
                                  <span className="mt-1 inline-flex rounded-full bg-[#00D9FF]/15 px-1.5 py-0.5 text-xs text-[#00D9FF]">
                                    Current
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })()}

              {/* Customer */}
              {(orderData.customerName || orderData.customerEmail) && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 flex items-center gap-1 text-xs text-gray-400">
                    <User className="h-3 w-3" /> Customer
                  </p>
                  <p className="font-medium text-white">
                    {orderData.customerName ?? "—"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {orderData.customerEmail ?? "—"}
                  </p>
                </div>
              )}

              {/* Line Items */}
              {(orderData.items?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-400">Line Items</p>
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="px-3 py-2 text-left text-xs text-gray-400">
                            Product
                          </th>
                          <th className="px-3 py-2 text-right text-xs text-gray-400">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-xs text-gray-400">
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-right text-xs text-gray-400">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderData.items?.map((item, index) => (
                          <tr
                            key={`${item.productName}-${index}`}
                            className="border-b border-white/5 last:border-0"
                          >
                            <td className="px-3 py-2">
                              <div className="text-white">
                                {item.productName}
                              </div>
                              {item.productSku && (
                                <div className="text-xs text-gray-500">
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
                            <td className="px-3 py-2 text-right font-medium text-white">
                              $
                              {(item.quantity * Number(item.unitPrice)).toFixed(
                                2
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>${Number(orderData.subtotal ?? 0).toFixed(2)}</span>
                </div>
                {Number(orderData.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Tax</span>
                    <span>${Number(orderData.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(orderData.shippingAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Shipping</span>
                    <span>${Number(orderData.shippingAmount).toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-white/10" />
                <div className="flex justify-between font-bold text-white">
                  <span>Total</span>
                  <span className="text-[#00D9FF]">
                    ${Number(orderData.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {orderData.notes && (
                <div className="rounded-lg border border-white/10 bg-white/3 p-3">
                  <p className="mb-1 text-xs text-gray-400">Notes</p>
                  <p className="text-sm text-gray-300">{orderData.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Created {new Date(orderData.createdAt).toLocaleString()}
                </span>
                <span>ID #{orderData.id}</span>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-gray-400">Order not found</p>
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
    </DashboardPageShell>
  );
}
