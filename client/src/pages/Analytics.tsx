import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
const COLORS = ["#00D9FF", "#0284C7", "#6A1B9A", "#10B981", "#F59E0B"];
export default function Analytics() {
  const summary = trpc.analytics.summary.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery();
  const topProducts = trpc.analytics.topProducts.useQuery();
  const webhookLog = trpc.analytics.webhookEvents.useQuery();
  const chartData = (revenueByDay.data ?? []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Number(d.revenue), orders: d.orders,
  }));
  const pieData: {name: string; value: number}[] = [];
  const metrics = [
    { label: "Total Revenue", value: "$" + Number(summary.data?.totalRevenue ?? 0).toFixed(2), icon: DollarSign, color: "#00D9FF" },
    { label: "Total Orders", value: summary.data?.orderCount ?? 0, icon: ShoppingCart, color: "#0284C7" },
    { label: "Customers", value: summary.data?.customerCount ?? 0, icon: Users, color: "#6A1B9A" },
    { label: "Avg Order Value", value: "$" + (summary.data?.orderCount ? (Number(summary.data.totalRevenue) / summary.data.orderCount).toFixed(2) : "0.00"), icon: TrendingUp, color: "#10B981" },
  ];
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Analytics</h1><p className="text-gray-400 text-sm mt-1">Revenue and performance insights</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <Card key={m.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{m.label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + "20" }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader><CardTitle className="text-white text-base">Revenue Trend (30 Days)</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#00D9FF" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1e3a5f", borderRadius: "8px", color: "#fff" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#00D9FF" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[240px] flex items-center justify-center text-gray-500">No data yet</div>}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-white text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1e3a5f", borderRadius: "8px", color: "#fff" }} /></PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[200px] flex items-center justify-center text-gray-500">No orders yet</div>}
            <div className="space-y-2 mt-2">
              {pieData.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-gray-300 capitalize">{d.name}</span></div>
                  <span className="text-white font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
