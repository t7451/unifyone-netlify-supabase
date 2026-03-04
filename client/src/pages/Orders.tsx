import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, ShoppingCart, ChevronDown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  shipped: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  refunded: "bg-gray-500/20 text-gray-400",
};

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const orders = trpc.orders.list.useQuery({ search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter });
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Order updated"); utils.orders.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{orders.data?.length ?? 0} orders</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            {["pending","confirmed","processing","shipped","delivered","cancelled","refunded"].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/3">
              {["Order", "Customer", "Items", "Total", "Status", "Payment", "Date", "Actions"].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : (orders.data ?? []).length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No orders yet</p>
              </td></tr>
            ) : (
              (orders.data ?? []).map((o: any) => (
                <tr key={o.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-[#00D9FF] font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm">{o.customerName ?? "—"}</div>
                    <div className="text-gray-500 text-xs">{o.customerEmail ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{o.itemCount ?? "—"}</td>
                  <td className="px-4 py-3 text-white font-semibold">${Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PAYMENT_COLORS[o.paymentStatus] ?? ""}`}>{o.paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Select value={o.status} onValueChange={v => updateStatus.mutate({ id: o.id, status: v as any })}>
                      <SelectTrigger className="w-32 h-7 bg-white/5 border-white/10 text-gray-300 text-xs">
                        <SelectValue /><ChevronDown className="w-3 h-3 ml-1" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10">
                        {["pending","confirmed","processing","shipped","delivered","cancelled","refunded"].map(s => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
