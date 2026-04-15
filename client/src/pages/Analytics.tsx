import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign, ShoppingCart, Users, Package } from "lucide-react";

const COLORS = ["#00D9FF", "#0284C7", "#6A1B9A", "#10B981", "#F59E0B"];

export default function Analytics() {
  const summary = trpc.analytics.summary.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery();
  const topProducts = trpc.analytics.topProducts.useQuery();
  const webhookLog = trpc.analytics.webhookEvents.useQuery();

  const chartData = (revenueByDay.data ?? []).map(
    (d: Record<string, unknown>) => ({
      date: new Date(d.date as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      revenue: Number(d.revenue),
      orders: d.orders,
    })
  );

  const topProductData = (topProducts.data ?? []).map(
    (p: Record<string, unknown>) => ({
      name:
        (p.productName as string)?.length > 16
          ? (p.productName as string).slice(0, 16) + "..."
          : (p.productName as string),
      quantity: Number(p.totalQuantity),
      revenue: Number(p.totalRevenue),
    })
  );

  const metrics = [
    {
      label: "Total Revenue",
      value: "$" + Number(summary.data?.totalRevenue ?? 0).toFixed(2),
      icon: DollarSign,
      color: "#00D9FF",
    },
    {
      label: "Total Orders",
      value: summary.data?.orderCount ?? 0,
      icon: ShoppingCart,
      color: "#0284C7",
    },
    {
      label: "Customers",
      value: summary.data?.customerCount ?? 0,
      icon: Users,
      color: "#6A1B9A",
    },
    {
      label: "Avg Order Value",
      value:
        "$" +
        (summary.data?.orderCount
          ? (
              Number(summary.data.totalRevenue) / summary.data.orderCount
            ).toFixed(2)
          : "0.00"),
      icon: TrendingUp,
      color: "#10B981",
    },
    {
      label: "Total Products",
      value: summary.data?.productCount ?? 0,
      icon: Package,
      color: "#F59E0B",
    },
  ];

  const recentWebhooks = (webhookLog.data ?? []).slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">
          Revenue and performance insights
        </p>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map(m => (
          <Card key={m.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{m.label}</span>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: m.color + "20" }}
                >
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Revenue &amp; Orders (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #1e3a5f",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00D9FF"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    name="Orders"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-500">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topProductData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fill: "#9CA3AF", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#9CA3AF", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid #1e3a5f",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="#00D9FF"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {topProductData.map(
                    (
                      p: { name: string; quantity: number; revenue: number },
                      i: number
                    ) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span className="text-gray-300">{p.name}</span>
                        </div>
                        <span className="text-white font-medium">
                          ${p.revenue.toFixed(0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500">
                No product data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Webhook Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-base">
            Recent Webhook Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentWebhooks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 pb-2 font-medium">
                      Source
                    </th>
                    <th className="text-left text-gray-400 pb-2 font-medium">
                      Event
                    </th>
                    <th className="text-left text-gray-400 pb-2 font-medium">
                      Status
                    </th>
                    <th className="text-right text-gray-400 pb-2 font-medium">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentWebhooks.map((w: Record<string, unknown>) => (
                    <tr
                      key={w.id as number}
                      className="border-b border-white/5"
                    >
                      <td className="py-2 text-white capitalize">
                        {w.source as string}
                      </td>
                      <td className="py-2 text-gray-400 font-mono text-xs">
                        {w.eventType as string}
                      </td>
                      <td className="py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            (w.status as string) === "processed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : (w.status as string) === "failed"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {(w.status as string) ?? "logged"}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-500 text-xs">
                        {new Date(w.createdAt as string).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              No webhook events yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
