import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Phone,
  Globe,
  Building2,
  TrendingUp,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Star,
  AlertCircle,
  RefreshCw,
  Filter,
  StickyNote,
  Zap,
  BarChart3,
} from "lucide-react";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; icon: React.ReactNode; bg: string }
> = {
  new: {
    label: "New",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <AlertCircle className="w-3 h-3" />,
    bg: "border-l-blue-500",
  },
  contacted: {
    label: "Contacted",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: <Mail className="w-3 h-3" />,
    bg: "border-l-yellow-500",
  },
  qualified: {
    label: "Qualified",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: <Star className="w-3 h-3" />,
    bg: "border-l-purple-500",
  },
  converted: {
    label: "Converted",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <CheckCircle2 className="w-3 h-3" />,
    bg: "border-l-green-500",
  },
  lost: {
    label: "Lost",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <XCircle className="w-3 h-3" />,
    bg: "border-l-red-500",
  },
};

const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
];

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");

  const { data: leads = [], refetch } = trpc.leads.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );
  const { data: stats } = trpc.leads.stats.useQuery();

  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Lead status updated");
    },
    onError: e => toast.error(e.message),
  });

  const addNote = trpc.leads.addNote.useMutation({
    onSuccess: () => {
      setNoteText("");
      refetch();
      toast.success("Note added");
    },
    onError: e => toast.error(e.message),
  });

  const selected = leads.find(l => l.id === selectedLead);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Leads Pipeline
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            CRM-grade lead management with automation tracking
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "New", value: stats.new, color: "text-blue-400" },
            {
              label: "Contacted",
              value: stats.contacted,
              color: "text-yellow-400",
            },
            {
              label: "Qualified",
              value: stats.qualified,
              color: "text-purple-400",
            },
            {
              label: "Converted",
              value: stats.converted,
              color: "text-green-400",
            },
            { label: "Lost", value: stats.lost, color: "text-red-400" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-gray-800">
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select
          value={filterStatus}
          onValueChange={v => setFilterStatus(v as LeadStatus | "all")}
        >
          <SelectTrigger className="w-48 bg-card border-gray-700">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Lead List */}
        <div className="flex-1 space-y-3 min-w-0">
          {leads.length === 0 ? (
            <Card className="bg-card border-gray-800">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No leads yet</p>
                <p className="text-sm text-gray-600 mt-1">
                  Leads from the landing page wizard will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            leads.map(lead => {
              const sc = STATUS_CONFIG[lead.status as LeadStatus];
              return (
                <Card
                  key={lead.id}
                  className={`bg-card border-gray-800 border-l-4 ${sc.bg} cursor-pointer hover:bg-gray-800/50 transition-colors ${selectedLead === lead.id ? "ring-1 ring-indigo-500" : ""}`}
                  onClick={() =>
                    setSelectedLead(selectedLead === lead.id ? null : lead.id)
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm truncate">
                            {lead.companyName || lead.contactName || lead.email}
                          </span>
                          <Badge
                            className={`text-xs border ${sc.color} flex items-center gap-1`}
                          >
                            {sc.icon} {sc.label}
                          </Badge>
                          {lead.plan && (
                            <Badge
                              variant="outline"
                              className="text-xs text-indigo-400 border-indigo-500/30"
                            >
                              {lead.plan}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                          )}
                          {lead.website && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {lead.website}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {lead.n8nTriggered && (
                            <span className="text-xs text-orange-400 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> n8n
                            </span>
                          )}
                          {lead.zapierTriggered && (
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Zapier
                            </span>
                          )}
                          {lead.notificationSent && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Notified
                            </span>
                          )}
                          <span className="text-xs text-gray-600">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-500 mt-1 transition-transform ${selectedLead === lead.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Lead Detail Panel */}
        {selected && (
          <div className="w-80 shrink-0 space-y-4">
            <Card className="bg-card border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Lead #{selected.id}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Company", value: selected.companyName },
                  { label: "Contact", value: selected.contactName },
                  { label: "Email", value: selected.email },
                  { label: "Phone", value: selected.phone },
                  { label: "Website", value: selected.website },
                  { label: "Plan", value: selected.plan },
                  { label: "Revenue", value: selected.monthlyRevenue },
                  { label: "Team Size", value: selected.teamSize },
                  { label: "Source", value: selected.source },
                ]
                  .filter(f => f.value)
                  .map(f => (
                    <div key={f.label} className="flex justify-between gap-2">
                      <span className="text-gray-500 shrink-0">{f.label}</span>
                      <span className="text-gray-200 text-right truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                {selected.platforms &&
                  (selected.platforms as string[]).length > 0 && (
                    <div>
                      <span className="text-gray-500 block mb-1">
                        Platforms
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(selected.platforms as string[]).map(p => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-xs text-gray-300 border-gray-600"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                {selected.message && (
                  <div>
                    <span className="text-gray-500 block mb-1">Message</span>
                    <p className="text-gray-300 text-xs leading-relaxed bg-gray-800 rounded p-2">
                      {selected.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card className="bg-card border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" /> Update
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-1.5">
                  {STATUSES.map(s => {
                    const sc = STATUS_CONFIG[s];
                    return (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        disabled={
                          selected.status === s || updateStatus.isPending
                        }
                        onClick={() =>
                          updateStatus.mutate({ id: selected.id, status: s })
                        }
                        className={`justify-start gap-2 text-xs ${selected.status === s ? "opacity-50" : "hover:bg-gray-800"}`}
                      >
                        {sc.icon}
                        {sc.label}
                        {selected.status === s && (
                          <CheckCircle2 className="w-3 h-3 ml-auto text-green-400" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-card border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-yellow-400" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.notes && (
                  <div className="text-xs text-gray-300 bg-gray-800 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {selected.notes}
                  </div>
                )}
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-xs resize-none h-20"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!noteText.trim() || addNote.isPending}
                  onClick={() =>
                    addNote.mutate({ id: selected.id, note: noteText })
                  }
                >
                  <MessageSquare className="w-3 h-3 mr-1.5" /> Add Note
                </Button>
              </CardContent>
            </Card>

            {/* Automation Status */}
            <Card className="bg-card border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" /> Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {[
                  {
                    label: "Owner Notified",
                    value: selected.notificationSent,
                    icon: <Mail className="w-3 h-3" />,
                  },
                  {
                    label: "n8n Triggered",
                    value: selected.n8nTriggered,
                    icon: <Zap className="w-3 h-3" />,
                  },
                  {
                    label: "Zapier Triggered",
                    value: selected.zapierTriggered,
                    icon: <Zap className="w-3 h-3" />,
                  },
                  {
                    label: "Mailchimp Subscribed",
                    value: selected.mailchimpSubscribed,
                    icon: <Mail className="w-3 h-3" />,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-400 flex items-center gap-1.5">
                      {item.icon} {item.label}
                    </span>
                    {item.value ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
