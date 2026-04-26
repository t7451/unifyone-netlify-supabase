import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Database, GitBranch, FileText, Activity } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeGraphPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const statsQuery = trpc.knowledgeGraph.getStats.useQuery();
  const connectorsQuery = trpc.knowledgeGraph.getConnectors.useQuery();
  const brainQuery = trpc.knowledgeGraph.getBrainActivity.useQuery({});
  const searchNodesQuery = trpc.knowledgeGraph.searchNodes.useQuery(
    { query: submittedQuery, limit: 20 },
    { enabled: submittedQuery.length > 0 }
  );

  const triggerIngest = trpc.knowledgeGraph.triggerIngest.useMutation({
    onSuccess: (data) => {
      const d = data as Record<string, unknown>;
      toast.success(`Ingest queued — job ${String(d.job_id ?? "")}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = (statsQuery.data as Record<string, unknown> | undefined) ?? {};
  const connectors = (connectorsQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const brain = (brainQuery.data as Record<string, unknown> | undefined) ?? {};
  const searchResults = (searchNodesQuery.data as Record<string, unknown>[] | undefined) ?? null;

  function handleSearch() {
    const q = searchQuery.trim();
    if (q) setSubmittedQuery(q);
  }

  const SOURCES = [
    { key: "claude_code" as const, label: "Claude Code", icon: FileText },
    { key: "git" as const, label: "Git History", icon: GitBranch },
    { key: "markdown" as const, label: "Markdown Notes", icon: Database },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🕸️ Knowledge Graph</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore your personal knowledge graph — nodes, edges, and ingestion connectors.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(stats.total_nodes ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Edges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(stats.total_edges ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" /> Spikes/sec
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(brain.spikes_per_sec ?? 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Last Ingested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {stats.last_ingested
                ? new Date(String(stats.last_ingested)).toLocaleDateString()
                : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ingest Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger Ingestion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {SOURCES.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant="outline"
              disabled={triggerIngest.isPending}
              onClick={() => triggerIngest.mutate({ source: key })}
            >
              {triggerIngest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Icon className="h-4 w-4 mr-2" />
              )}
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Node Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Graph Nodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Button
              disabled={!searchQuery.trim() || searchNodesQuery.isFetching}
              onClick={handleSearch}
            >
              {searchNodesQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          {submittedQuery.length > 0 && (
            <div className="space-y-2">
              {searchNodesQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !searchResults || searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">No nodes found.</p>
              ) : (
                searchResults.map((node, i) => (
                  <div
                    key={String(node.id ?? i)}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{String(node.label ?? "—")}</p>
                      <p className="text-xs text-muted-foreground">{String(node.sourceId ?? "")}</p>
                    </div>
                    <Badge variant="secondary">{String(node.type ?? "—")}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connector Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connector Status</CardTitle>
        </CardHeader>
        <CardContent>
          {connectorsQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : connectors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No connectors configured.</p>
          ) : (
            <div className="space-y-2">
              {connectors.map((c, i) => (
                <div
                  key={String(c.id ?? i)}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <p className="text-sm font-medium">{String(c.name ?? c.type ?? "Connector")}</p>
                  <Badge variant={c.connected ? "outline" : "secondary"}>
                    {c.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
