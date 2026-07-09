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
import { cn } from "@/lib/utils";
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
import {
  ORDER_STATUSES,
  ORDER_FILTER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_FILTER_STATUSES,
  ORDER_TIMELINE,
  STATUS_COLORS,
  PAYMENT_COLORS,
} from "./Orders.constants";
import type { OrderStatus, OrderPaymentStatus } from "./Orders.types";
import { useOrders } from "./useOrders";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  processing: <RefreshCw className="w-3.5 h-3.5" />,
  shipped: <Truck className="w-3.5 h-3.5" />,
  delivered: <Package className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  refunded: <RefreshCw className="w-3.5 h-3.5" />,
};

export default function Orders() {
  const {
    navigate,
    isOrderDetailRoute,
    isMobile,
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
    selectedOrder,
    setSelectedOrder,
    selectedIds,
    setShowDetail,
    showCreate,
    setShowCreate,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
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
    updateStatus,
    createOrder,
    bulkDeleteOrders,
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
    resetCreateForm,
    addItem,
    removeItem,
    updateItem,
    handleCreate,
    toggleSelection,
    toggleSelectAllVisible,
    openDetail,
    exportToCSV,
  } = useOrders();

  return (
    <DashboardPageShell
      eyebrow="Optional commerce tools"
      title="Orders"
      description="An optional storefront add-on for sellers: track fulfillment, payment exceptions, bulk cleanup, exports, and real-time order flow. Not required to run GigIQ, Tax Autopilot, or Money Manager."
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
            className="bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90 font-semibold"
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
              className="border-[#D4A843]/30 bg-[#D4A843]/10 text-[#E8C25A]"
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
          tone: "amber",
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
                <Badge className="bg-[#D4A843]/15 text-[#D4A843] hover:bg-[#D4A843]/15">
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
                      className="border-white/30 data-[state=checked]:border-[#D4A843] data-[state=checked]:bg-[#D4A843] data-[state=checked]:text-[#020202]"
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
                          className="border-white/30 data-[state=checked]:border-[#D4A843] data-[state=checked]:bg-[#D4A843] data-[state=checked]:text-[#020202]"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-xs text-[#D4A843]">
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
                            className="h-7 w-7 p-0 text-gray-400 hover:text-[#D4A843]"
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
                <ShoppingCart className="h-10 w-10 text-[#D4A843]" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {hasActiveFilters ? "No orders found" : "No orders yet"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                {hasActiveFilters
                  ? "Try adjusting your filters to find the order you're looking for."
                  : "This optional storefront tool stays empty until customers check out or you add a manual order — it isn't needed for your gig earnings or tax tracking."}
              </p>
              {!hasActiveFilters && (
                <Button
                  size="sm"
                  className="mt-6 bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90"
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
      <Dialog
        open={detailDialogOpen}
        onOpenChange={open => {
          setShowDetail(open);
          if (!open) {
            setSelectedOrder(null);
            if (isOrderDetailRoute) navigate("/orders");
          }
        }}
      >
        <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4A843]" />
              Order {selectedOrder?.orderNumber ?? orderData?.orderNumber ?? ""}
            </DialogTitle>
          </DialogHeader>

          {orderDetail.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4A843]" />
            </div>
          ) : orderDetail.isError ? (
            <div className="flex justify-center py-8">
              <QueryErrorState
                icon={AlertTriangle}
                title="Failed to load order"
                message={orderDetail.error.message}
                onRetry={() => void orderDetail.refetch()}
                isRetrying={orderDetail.isFetching}
                size="sm"
              />
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
                                  ? "border-[#D4A843]/60 bg-[#D4A843]/10"
                                  : isComplete
                                    ? "border-[#D4A843]/30 bg-white/[0.04]"
                                    : "border-white/10 bg-white/[0.02]"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full border",
                                  isCurrent
                                    ? "border-[#D4A843] bg-[#D4A843] text-[#020202]"
                                    : isComplete
                                      ? "border-[#D4A843]/40 bg-[#D4A843]/15 text-[#D4A843]"
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
                                      ? "text-[#D4A843]"
                                      : isComplete
                                        ? "text-white"
                                        : "text-gray-500"
                                  )}
                                >
                                  {meta.label}
                                </p>
                                {isCurrent && (
                                  <span className="mt-1 inline-flex rounded-full bg-[#D4A843]/15 px-1.5 py-0.5 text-xs text-[#D4A843]">
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
                  <span className="text-[#D4A843]">
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
              <Plus className="w-5 h-5 text-[#D4A843]" /> Create Manual Order
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
                  className="text-[#D4A843] hover:text-[#D4A843]/80 text-xs h-7"
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
                <CreditCard className="w-4 h-4 text-[#D4A843]" />
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
                  <DollarSign className="w-4 h-4 text-[#D4A843]" />
                  Total
                </span>
                <span className="text-[#D4A843]">${orderTotal.toFixed(2)}</span>
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
              className="bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90 font-semibold"
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
