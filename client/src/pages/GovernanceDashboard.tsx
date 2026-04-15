import { useState } from "react";
import { AlertCircle, CheckCircle, Clock, Shield, Zap, TrendingUp, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const GOV_CANONICAL = `${SITE_URL}/governance`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    approved: "bg-green-500/20 text-green-400 border-green-500/40",
    rejected: "bg-red-500/20 text-red-400 border-red-500/40",
    expired: "bg-gray-500/20 text-gray-400 border-gray-500/40",
    active: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return map[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/40";
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function GovernanceDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"audit" | "escalations" | "authority" | "rules">("audit");

  // ── tRPC queries ─────────────────────────────────────────────────────────────
  const auditQuery = trpc.governance.getAuditLogs.useQuery(undefined, { retry: false });
  const escalationsQuery = trpc.governance.getEscalations.useQuery(undefined, { retry: false });
  const killSwitchesQuery = trpc.governance.getKillSwitches.useQuery(undefined, { retry: false });
  const rulesQuery = trpc.governance.getRules.useQuery(undefined, { retry: false });
  const metricsQuery = trpc.governance.getMetrics.useQuery(undefined, { retry: false });
  const authorityQuery = trpc.governance.getDecisionAuthority.useQuery(undefined, { retry: false });

  // ── tRPC mutations ────────────────────────────────────────────────────────────
  const resolveEscalation = trpc.governance.resolveEscalation.useMutation({
    onSuccess: () => escalationsQuery.refetch(),
  });
  const toggleKillSwitch = trpc.governance.toggleKillSwitch.useMutation({
    onSuccess: () => {
      killSwitchesQuery.refetch();
      auditQuery.refetch();
    },
  });

  // ── Access guard ──────────────────────────────────────────────────────────────
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Only administrators can access the Governance Dashboard.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const auditLogs = auditQuery.data?.logs ?? [];
  const escalations = escalationsQuery.data?.escalations ?? [];
  const killSwitches = killSwitchesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const metrics = metricsQuery.data;
  const authority = authorityQuery.data ?? [];

  const pendingEscalations = escalations.filter((e: any) => e.status === "pending").length;
  const activeKillSwitches = killSwitches.filter((ks: any) => ks.isActive).length;
  const isLoading = auditQuery.isLoading || metricsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Governance | UnifyOne Platform"
        description="Platform governance dashboard — audit logs, escalation queues, decision authority matrix, emergency controls, and governance rules for UnifyOne commerce infrastructure."
        canonical={GOV_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: GOV_CANONICAL,
          name: "Governance | UnifyOne Platform",
          description:
            "Platform governance — audit logs, escalation queues, decision authority matrix, emergency controls, and governance rules.",
          breadcrumbs: [{ name: "Governance", item: GOV_CANONICAL }],
        })}
      />
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(10,10,15,0.98) 0%, rgba(20,15,35,0.98) 50%, rgba(10,10,15,0.98) 100%)",
          borderBottom: "1px solid rgba(212,168,67,0.2)",
          padding: "2rem 1.5rem",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-[#D4A843]" />
              <div>
                <h1
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "clamp(1.4rem, 3vw, 2rem)",
                    fontWeight: 700,
                    color: "#D4A843",
                    letterSpacing: "0.05em",
                    margin: 0,
                  }}
                >
                  Governance Dashboard
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Cathedral Framework · Autonomous Operations Control
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                auditQuery.refetch();
                escalationsQuery.refetch();
                killSwitchesQuery.refetch();
                metricsQuery.refetch();
              }}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              {
                label: "Pending Escalations",
                value: pendingEscalations,
                icon: <Clock className="h-5 w-5 text-yellow-400" />,
                color: pendingEscalations > 0 ? "text-yellow-400" : "text-green-400",
              },
              {
                label: "Active Kill Switches",
                value: activeKillSwitches,
                icon: <Zap className="h-5 w-5 text-red-400" />,
                color: activeKillSwitches > 0 ? "text-red-400" : "text-green-400",
              },
              {
                label: "Compliance Score",
                value: metrics ? `${metrics.complianceScore}%` : "—",
                icon: <TrendingUp className="h-5 w-5 text-[#D4A843]" />,
                color: "text-[#D4A843]",
              },
              {
                label: "Audit Log Entries",
                value: auditLogs.length,
                icon: <CheckCircle className="h-5 w-5 text-blue-400" />,
                color: "text-blue-400",
              },
            ].map((stat, idx) => (
              <Card key={idx} className="p-4 bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["audit", "escalations", "authority", "rules"] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === "audit" ? "Audit Log" : tab === "escalations" ? `Escalations${pendingEscalations > 0 ? ` (${pendingEscalations})` : ""}` : tab === "authority" ? "Decision Authority" : "Governance Rules"}
            </Button>
          ))}
        </div>

        {/* ── Audit Log Tab ──────────────────────────────────────────────────── */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
            {auditQuery.isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Loading audit logs…</Card>
            ) : auditLogs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No audit log entries yet. Operations will be recorded here as they occur.
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Entity</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Authority</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Escalated</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border hover:bg-card/50">
                        <td className="py-3 px-4 text-foreground max-w-xs truncate">{log.action}</td>
                        <td className="py-3 px-4 text-muted-foreground">{log.entityType ?? "—"}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{log.decisionAuthority ?? "operator"}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {log.escalationTriggered ? (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">Yes</Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/40">No</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Escalations Tab ────────────────────────────────────────────────── */}
        {activeTab === "escalations" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Escalation Queue</h2>
            {escalationsQuery.isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Loading escalations…</Card>
            ) : escalations.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No escalations in the queue. All operations are within governance parameters.
              </Card>
            ) : (
              escalations.map((item: any) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{item.decisionType}</h3>
                        <Badge className={statusBadge(item.status)}>{item.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span>Authority: <span className="text-foreground">{item.authorityLevel}</span></span>
                        {item.thresholdExceeded && (
                          <span>Exceeded: <span className="text-red-400">${Number(item.thresholdExceeded).toLocaleString()}</span></span>
                        )}
                        {item.thresholdLimit && (
                          <span>Limit: <span className="text-foreground">${Number(item.thresholdLimit).toLocaleString()}</span></span>
                        )}
                        <span>Expires: {formatDate(item.expiresAt)}</span>
                      </div>
                      {item.resolutionNotes && (
                        <p className="text-sm text-muted-foreground italic">Note: {item.resolutionNotes}</p>
                      )}
                    </div>
                    {item.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/40 text-green-400 hover:bg-green-500/10"
                          disabled={resolveEscalation.isPending}
                          onClick={() => resolveEscalation.mutate({ id: item.id, status: "approved", resolutionNotes: "Approved by admin" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                          disabled={resolveEscalation.isPending}
                          onClick={() => resolveEscalation.mutate({ id: item.id, status: "rejected", resolutionNotes: "Rejected by admin" })}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Decision Authority Tab ─────────────────────────────────────────── */}
        {activeTab === "authority" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-6">Decision Authority Matrix</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card/50 border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">User ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Authority Level</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Approval Threshold</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Permissions</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorityQuery.isLoading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
                    ) : authority.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No authority records. Defaults apply.</td></tr>
                    ) : (
                      authority.map((row: any) => (
                        <tr key={row.id} className="border-b border-border hover:bg-card/50">
                          <td className="py-3 px-4 text-foreground">User #{row.userId}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{row.authorityLevel}</Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {row.approvalThreshold ? `$${Number(row.approvalThreshold).toLocaleString()}` : "Unlimited"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {[
                              row.canAccessAuditLogs && "Audit",
                              row.canOverrideDecisions && "Override",
                              row.canModifyGovernance && "Modify",
                            ].filter(Boolean).join(", ") || "View"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={statusBadge(row.active ? "active" : "expired")}>
                              {row.active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── Governance Rules Tab ───────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Governance Rules</h2>
              <Button size="sm" className="gap-2" disabled>
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>
            {rulesQuery.isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Loading rules…</Card>
            ) : rules.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No governance rules defined.</Card>
            ) : (
              rules.map((rule: any) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">{rule.ruleName}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span>Type: {rule.ruleType}</span>
                        {rule.entityType && <span>Entity: {rule.entityType}</span>}
                        <span>Action: {rule.actionOnViolation}</span>
                        {rule.authorityLevelRequired && <span>Requires: {rule.authorityLevelRequired}</span>}
                      </div>
                      {rule.conditionJson && (
                        <pre className="text-xs text-muted-foreground bg-card/50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(rule.conditionJson, null, 2)}
                        </pre>
                      )}
                    </div>
                    <Badge className={statusBadge(rule.isActive ? "active" : "expired")}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Kill Switch Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-6">Emergency Controls</h2>
        {killSwitchesQuery.isLoading ? (
          <Card className="p-6 text-center text-muted-foreground">Loading kill switches…</Card>
        ) : (
          <div className="space-y-4">
            {killSwitches.map((ks: any) => (
              <Card
                key={ks.id}
                className={`p-6 border-l-4 ${ks.isActive ? "border-l-red-500 bg-red-500/5" : "border-l-border"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1 capitalize">
                      {ks.switchName.replace(/_/g, " ")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{ks.description}</p>
                    {ks.impactScope && (
                      <p className="text-xs text-muted-foreground">Impact: {ks.impactScope}</p>
                    )}
                    {ks.isActive && ks.reason && (
                      <p className="text-sm text-red-400 mt-2">Reason: {ks.reason}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Badge className={statusBadge(ks.isActive ? "rejected" : "active")}>
                        {ks.isActive ? "ACTIVE — Systems Halted" : "All Systems Operational"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant={ks.isActive ? "outline" : "destructive"}
                    size="sm"
                    className={`gap-2 shrink-0 ${ks.isActive ? "border-green-500/40 text-green-400 hover:bg-green-500/10" : ""}`}
                    disabled={toggleKillSwitch.isPending}
                    onClick={() =>
                      toggleKillSwitch.mutate({
                        switchName: ks.switchName,
                        isActive: !ks.isActive,
                        reason: ks.isActive ? undefined : "Emergency activation by admin",
                      })
                    }
                  >
                    <Zap className="h-4 w-4" />
                    {ks.isActive ? "Deactivate" : "Activate Kill Switch"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
