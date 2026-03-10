import { useState } from "react";
import { AlertCircle, CheckCircle, Clock, Shield, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  decision_authority: string;
  escalation_triggered: boolean;
  created_at: string;
}

interface EscalationItem {
  id: number;
  decision_type: string;
  authority_level: string;
  status: "pending" | "approved" | "rejected" | "expired";
  threshold_exceeded: number;
  threshold_limit: number;
  created_at: string;
  expires_at: string;
}

// Mock data for demonstration
const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    action: "Revenue Threshold Exceeded",
    entity_type: "transaction",
    decision_authority: "architect",
    escalation_triggered: true,
    created_at: "2026-03-10T06:15:00Z",
  },
  {
    id: 2,
    action: "Customer Refund Processed",
    entity_type: "order",
    decision_authority: "operator",
    escalation_triggered: false,
    created_at: "2026-03-10T05:45:00Z",
  },
  {
    id: 3,
    action: "Subscription Tier Upgrade",
    entity_type: "subscription",
    decision_authority: "operator",
    escalation_triggered: false,
    created_at: "2026-03-10T05:20:00Z",
  },
];

const MOCK_ESCALATIONS: EscalationItem[] = [
  {
    id: 1,
    decision_type: "Revenue Threshold",
    authority_level: "cathedral",
    status: "pending",
    threshold_exceeded: 15000,
    threshold_limit: 10000,
    created_at: "2026-03-10T06:15:00Z",
    expires_at: "2026-03-10T18:15:00Z",
  },
  {
    id: 2,
    decision_type: "Bulk Refund Request",
    authority_level: "architect",
    status: "approved",
    threshold_exceeded: 5000,
    threshold_limit: 5000,
    created_at: "2026-03-10T04:30:00Z",
    expires_at: "2026-03-10T16:30:00Z",
  },
];

export default function GovernanceDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"audit" | "escalations" | "authority" | "rules">("audit");

  // Redirect non-admin users
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

  const stats = [
    { label: "Total Operations", value: "1,247", icon: Zap, color: "text-blue-400" },
    { label: "Escalations Pending", value: "3", icon: AlertCircle, color: "text-amber-400" },
    { label: "Approval Rate", value: "94%", icon: CheckCircle, color: "text-green-400" },
    { label: "Avg Resolution Time", value: "2.5h", icon: Clock, color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Governance Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor autonomous operations, escalation queue, and decision authority enforcement.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {(["audit", "escalations", "authority", "rules"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "audit" && "📋 Audit Logs"}
              {tab === "escalations" && "⚠️ Escalations"}
              {tab === "authority" && "👥 Authority Matrix"}
              {tab === "rules" && "📋 Governance Rules"}
            </button>
          ))}
        </div>

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Audit Logs</h2>
              <Button variant="outline" size="sm">
                Export Logs
              </Button>
            </div>
            {MOCK_AUDIT_LOGS.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{log.action}</h3>
                      {log.escalation_triggered && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                          Escalated
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Entity: {log.entity_type}</span>
                      <span>Authority: {log.decision_authority}</span>
                      <span>Time: {new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Escalations Tab */}
        {activeTab === "escalations" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Escalation Queue</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button size="sm">New Escalation</Button>
              </div>
            </div>
            {MOCK_ESCALATIONS.map((esc) => (
              <Card
                key={esc.id}
                className={`p-4 border-l-4 ${
                  esc.status === "pending"
                    ? "border-l-amber-500 bg-amber-500/5"
                    : esc.status === "approved"
                    ? "border-l-green-500 bg-green-500/5"
                    : "border-l-red-500 bg-red-500/5"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{esc.decision_type}</h3>
                      <Badge
                        className={
                          esc.status === "pending"
                            ? "bg-amber-500/20 text-amber-400"
                            : esc.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {esc.status.charAt(0).toUpperCase() + esc.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                      <span>Authority Level: {esc.authority_level}</span>
                      <span>Threshold: ${esc.threshold_exceeded} / ${esc.threshold_limit}</span>
                      <span>Created: {new Date(esc.created_at).toLocaleString()}</span>
                      <span>Expires: {new Date(esc.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {esc.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Authority Matrix Tab */}
        {activeTab === "authority" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Decision Authority Matrix</h2>
              <Button size="sm">Add User Authority</Button>
            </div>
            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Authority Level</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Approval Threshold</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Permissions</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: "Keith Skaggs (You)",
                        level: "cathedral",
                        threshold: "Unlimited",
                        permissions: "All",
                        status: "Active",
                      },
                      {
                        name: "Admin User",
                        level: "architect",
                        threshold: "$50,000",
                        permissions: "Audit, Approve",
                        status: "Active",
                      },
                      {
                        name: "Operator",
                        level: "operator",
                        threshold: "$10,000",
                        permissions: "View, Log",
                        status: "Active",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-card/50">
                        <td className="py-3 px-4 text-foreground">{row.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{row.level}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{row.threshold}</td>
                        <td className="py-3 px-4 text-muted-foreground">{row.permissions}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Governance Rules Tab */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Governance Rules</h2>
              <Button size="sm">Add Rule</Button>
            </div>
            {[
              {
                name: "Revenue Threshold",
                type: "approval_threshold",
                condition: "Transaction > $10,000",
                action: "escalate",
                status: "active",
              },
              {
                name: "Bulk Refund Limit",
                type: "approval_threshold",
                condition: "Refund > $5,000",
                action: "escalate",
                status: "active",
              },
              {
                name: "Rate Limit Protection",
                type: "rate_limit",
                condition: "API calls > 1000/min",
                action: "block",
                status: "active",
              },
            ].map((rule, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{rule.name}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      <span>Type: {rule.type}</span>
                      <span>Condition: {rule.condition}</span>
                      <span>Action: {rule.action}</span>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                    {rule.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Kill Switch Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-6">Emergency Controls</h2>
        <Card className="p-6 border-l-4 border-l-red-500 bg-red-500/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Kill Switch Controls</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Emergency operational controls to pause autonomous operations if needed.
              </p>
              <div className="flex gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                  All Systems Operational
                </Badge>
              </div>
            </div>
            <Button variant="destructive" size="lg" className="gap-2">
              <Zap className="h-4 w-4" />
              Activate Kill Switch
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
