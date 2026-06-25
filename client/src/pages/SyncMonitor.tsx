import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  BarChart2,
  Database,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const ENTITY_COLORS: Record<string, string> = {
  product: "#00D9FF",
  order: "#A855F7",
  customer: "#F59E0B",
  inventory: "#10B981",
  fulfillment: "#3B82F6",
  webhook: "#6B7280",
};

const STATUS_BADGE: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  success: { variant: "default", label: "Success" },
  failed: { variant: "destructive", label: "Failed" },
  skipped: { variant: "secondary", label: "Skipped" },
  retrying: { variant: "outline", label: "Retrying" },
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-green-500",
  warning: "text-yellow-500",
  critical: "text-red-500",
};

function formatTime(dateStr: string | Date | null) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString();
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SyncMonitor() {
  const [windowHours, setWindowHours] = useState(24);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_LIMIT = 25;

  useEffect(() => {
    document.title = "Store Sync Monitor — UnifyOne";
  }, []);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.syncMonitor.getSyncStats.useQuery({ hours: windowHours });

  const { data: latencyChart, isLoading: chartLoading } =
    trpc.syncMonitor.getLatencyChart.useQuery({ hours: windowHours });

  const { data: storeHealth, isLoading: healthLoading } =
    trpc.syncMonitor.getStoreHealth.useQuery();

  const { data: auditLog, isLoading: auditLoading } =
    trpc.syncMonitor.getAuditLog.useQuery({
      entity:
        entityFilter !== "all"
          ? (entityFilter as
              | "product"
              | "order"
              | "customer"
              | "inventory"
              | "fulfillment"
              | "webhook")
          : undefined,
      status:
        statusFilter !== "all"
          ? (statusFilter as "success" | "failed" | "skipped" | "retrying")
          : undefined,
      limit: AUDIT_LIMIT,
      offset: auditOffset,
    });

  const kpiCards = [
    {
      title: "Total Events",
      value: stats?.total ?? 0,
      icon: Activity,
      color: "text-[#00D9FF]",
      bg: "bg-[#00D9FF]/10",
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate ?? 100}%`,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Error Rate",
      value: `${stats?.errorRate ?? 0}%`,
      icon: AlertTriangle,
      color:
        stats?.errorRate && stats.errorRate > 5
          ? "text-red-500"
          : "text-yellow-500",
      bg:
        stats?.errorRate && stats.errorRate > 5
          ? "bg-red-500/10"
          : "bg-yellow-500/10",
    },
    {
      title: "Avg Latency",
      value: formatMs(stats?.avgLatencyMs ?? 0),
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#00D9FF]" />
            Store Sync Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Optional store add-on — if you sell on Shopify alongside your gig
            work, track integration health, latency, and the sync audit log here
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(windowHours)}
            onValueChange={v => setWindowHours(Number(v))}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1h</SelectItem>
              <SelectItem value="6">Last 6h</SelectItem>
              <SelectItem value="24">Last 24h</SelectItem>
              <SelectItem value="72">Last 3d</SelectItem>
              <SelectItem value="168">Last 7d</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            className="h-9"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Card key={card.title} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <p className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00D9FF]" />
              Avg Latency Over Time
            </CardTitle>
            <CardDescription className="text-xs">
              Milliseconds per sync event, grouped by hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="h-48 bg-muted animate-pulse rounded" />
            ) : !latencyChart?.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data for this window
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={latencyChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickFormatter={v =>
                      new Date(v).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickFormatter={v => `${v}ms`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                    labelFormatter={v => new Date(v).toLocaleString()}
                    formatter={(v: number) => [`${v}ms`, "Avg Latency"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgLatencyMs"
                    stroke="#00D9FF"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Event Volume Chart */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Event Volume
            </CardTitle>
            <CardDescription className="text-xs">
              Events per hour with error overlay
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="h-48 bg-muted animate-pulse rounded" />
            ) : !latencyChart?.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data for this window
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={latencyChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickFormatter={v =>
                      new Date(v).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                    labelFormatter={v => new Date(v).toLocaleString()}
                  />
                  <Bar
                    dataKey="eventCount"
                    fill="#A855F7"
                    radius={[2, 2, 0, 0]}
                    name="Events"
                  />
                  <Bar
                    dataKey="errorCount"
                    fill="#EF4444"
                    radius={[2, 2, 0, 0]}
                    name="Errors"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Store Health */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#00D9FF]" />
            Connected Store Health
          </CardTitle>
          <CardDescription className="text-xs">
            Optional — status and recent error counts for any stores you connect
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !storeHealth?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No stores connected — this add-on is optional.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href="/shopify/install">Connect a Shopify Store</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {storeHealth.map(store => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-[#00D9FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {store.shopName || store.shopDomain}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {store.shopDomain}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground hidden sm:block">
                      Last sync: {formatTime(store.lastSyncAt)}
                    </span>
                    <span
                      className={`font-medium ${HEALTH_COLORS[store.health]}`}
                    >
                      {store.health === "healthy"
                        ? "✓ Healthy"
                        : store.health === "warning"
                          ? `⚠ ${store.recentErrors} errors`
                          : `✗ ${store.recentErrors} errors`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Sync Audit Log
              </CardTitle>
              <CardDescription className="text-xs">
                {auditLog?.total ?? 0} total events
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={entityFilter}
                onValueChange={v => {
                  setEntityFilter(v);
                  setAuditOffset(0);
                }}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="fulfillment">Fulfillments</SelectItem>
                  <SelectItem value="webhook">Webhooks</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={v => {
                  setStatusFilter(v);
                  setAuditOffset(0);
                }}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {auditLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !auditLog?.logs.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No sync events found for the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Entity</TableHead>
                      <TableHead className="text-xs">Direction</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Latency</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.logs.map(log => {
                      const statusInfo = STATUS_BADGE[log.status] ?? {
                        variant: "secondary" as const,
                        label: log.status,
                      };
                      return (
                        <TableRow
                          key={log.id}
                          className="border-border/40 hover:bg-card/60"
                        >
                          <TableCell className="text-xs font-mono text-foreground/80 max-w-[160px] truncate">
                            {log.event}
                            {log.entityId && (
                              <span className="text-muted-foreground ml-1">
                                #{log.entityId}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                color: ENTITY_COLORS[log.entity] ?? "#6B7280",
                                background: `${ENTITY_COLORS[log.entity] ?? "#6B7280"}20`,
                              }}
                            >
                              {log.entity}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.direction === "inbound" ? "← In" : "→ Out"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusInfo.variant}
                              className="text-xs"
                            >
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.latencyMs != null
                              ? formatMs(log.latencyMs)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  Showing {auditOffset + 1}–
                  {Math.min(auditOffset + AUDIT_LIMIT, auditLog.total)} of{" "}
                  {auditLog.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditOffset === 0}
                    onClick={() =>
                      setAuditOffset(Math.max(0, auditOffset - AUDIT_LIMIT))
                    }
                    className="h-7 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditOffset + AUDIT_LIMIT >= auditLog.total}
                    onClick={() => setAuditOffset(auditOffset + AUDIT_LIMIT)}
                    className="h-7 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
