import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";

export default function Customers() {
  const [search, setSearch] = useState("");
  const customers = trpc.orders.customers.useQuery({ search: search || undefined });
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-gray-400 text-sm mt-1">{customers.data?.length ?? 0} customers</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Name","Email","Phone","Orders","Total Spent","Joined"].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              [...Array(5)].map((_,i) => (
                <tr key={i} className="border-b border-border">
                  {[...Array(6)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : (customers.data ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No customers yet</p>
              </td></tr>
            ) : (
              (customers.data ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-border hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{c.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] text-xs">{c.orderCount ?? 0}</Badge></td>
                  <td className="px-4 py-3 text-white font-semibold">${Number(c.totalSpent ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
