import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRealtimeOrders } from "@/lib/supabaseRealtime";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/useMobile";
import { emptyItem, exportOrdersToCsv } from "./Orders.utils";
import type {
  OrderItem,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummary,
  OrderDetailData,
  PaginatedResponse,
  PaymentProvider,
} from "./Orders.types";

/**
 * Data, state, and side-effects for the Orders page.
 *
 * Combines the list filter/sort/pagination/selection state, the create-order
 * form state, all `trpc.orders.*` queries and mutations, and the Supabase
 * realtime subscription. Behavior is identical to the original inline page —
 * same query inputs/keys, same realtime wiring, same optimistic updates.
 */
export function useOrders() {
  const [, navigate] = useLocation();
  const [isOrderDetailRoute, orderDetailParams] = useRoute("/orders/:id");
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
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    "stripe_payment_intent"
  );
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

  const routeOrderId = isOrderDetailRoute ? Number(orderDetailParams?.id) : 0;
  const selectedOrderId: number =
    selectedOrder?.id ??
    (Number.isInteger(routeOrderId) && routeOrderId > 0 ? routeOrderId : 0);
  const detailDialogOpen = showDetail || selectedOrderId > 0;
  const orderDetail = trpc.orders.get.useQuery(
    { id: selectedOrderId },
    { enabled: selectedOrderId > 0 && detailDialogOpen }
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
    navigate(`/orders/${order.id}`);
  };

  const exportToCSV = () => {
    if (!orderList.length) {
      toast.error("No orders to export");
      return;
    }

    exportOrdersToCsv(orderList);
  };

  return {
    // routing / layout
    navigate,
    isOrderDetailRoute,
    isMobile,
    // list filter state
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    limit,
    setLimit,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    hasActiveFilters,
    activeFilterCount,
    // selection / dialogs
    selectedOrder,
    setSelectedOrder,
    selectedIds,
    showDetail,
    setShowDetail,
    showCreate,
    setShowCreate,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    // queries
    orders,
    orderList,
    totalOrders,
    totalPages,
    allVisibleSelected,
    someVisibleSelected,
    visibleRevenue,
    paidVisibleCount,
    openFulfillmentCount,
    detailDialogOpen,
    orderDetail,
    orderData,
    // mutations
    updateStatus,
    createOrder,
    bulkDeleteOrders,
    // create form state
    customerEmail,
    setCustomerEmail,
    customerName,
    setCustomerName,
    items,
    shippingAmount,
    setShippingAmount,
    taxAmount,
    setTaxAmount,
    notes,
    setNotes,
    itemsTouched,
    setItemsTouched,
    paymentProvider,
    setPaymentProvider,
    paymentRefId,
    setPaymentRefId,
    squareOrderRefId,
    setSquareOrderRefId,
    subtotal,
    orderTotal,
    // actions
    resetCreateForm,
    addItem,
    removeItem,
    updateItem,
    handleCreate,
    toggleSelection,
    toggleSelectAllVisible,
    openDetail,
    exportToCSV,
  };
}
