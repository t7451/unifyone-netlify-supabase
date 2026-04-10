import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import MCPStatusWidget from "@/components/MCPStatusWidget";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const summary = trpc.analytics.summary.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery();
  const topProducts = trpc.analytics.topProducts.useQuery();
  const lowStock = trpc.products.lowStock.useQuery();

  useEffect(() => {
    if (user && !user.tenantId) navigate("/setup");
  }, [user]);

  const stats = [
    { label: "Total Revenue", value: `$${Number(summary.data?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "#00D9FF", change: "+12.5%" },
    { label: "Orders", value: summary.data?.orderCount ?? 0, icon: ShoppingCart, color: "#0284C7", change: "+8.2%" },
    { label: "Customers", value: summary.data?.customerCount ?? 0, icon: Users, color: "#6A1B9A", change: "+5.1%" },
    { label: "Products", value: summary.data?.productCount ?? 0, icon: Package, color: "#10B981", change: "Active" },
  ];

  const chartData = (revenueByDay.data ?? []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Number(d.revenue),
    orders: d.orders,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back, {user?.name ?? "Operator"}</p>
        </div>
        <Button onClick={() => navigate("/orders")} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
          New Order <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{s.label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "20" }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />{s.change} this month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base">Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1e3a5f", borderRadius: "8px", color: "#fff" }}
                    formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#00D9FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500">
                No revenue data yet. Start processing orders.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topProducts.data ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">No sales data yet.</p>
            ) : (
              (topProducts.data ?? []).map((p: any, i: number) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{p.productName}</div>
                    <div className="text-gray-400 text-xs">{p.totalSold} sold</div>
                  </div>
                  <div className="text-[#00D9FF] text-sm font-semibold">${Number(p.revenue).toFixed(0)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {(lowStock.data ?? []).length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-amber-400 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(lowStock.data ?? []).map((p: any) => (
                <Badge key={p.id} variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                  {p.name} — {p.quantity} left
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/products")} className="mt-3 text-amber-400 hover:text-amber-300 p-0 h-auto">
              Manage Inventory <ArrowRight className="ml-1 w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
