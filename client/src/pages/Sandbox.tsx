import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Play,
  Loader2,
  Terminal,
  Wrench,
  Clock,
  CircleCheck,
  CircleX,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLES: Record<string, string> = {
  "Hello sandbox": `// Plain synchronous JavaScript. The final expression is the result.
const nums = [1, 2, 3, 4, 5];
console.log("sum:", nums.reduce((s, n) => s + n, 0));
nums.map(n => n * n)`,
  "Low-stock report": `// callTool() gives you live, tenant-scoped platform data.
const inventory = callTool("get_low_stock_products", { threshold: 10 });
console.log("low stock items:", JSON.stringify(inventory).slice(0, 500));
inventory`,
  "Revenue summary": `const summary = callTool("get_analytics_summary", {});
const byDay = callTool("get_revenue_by_day", { days: 7 });
({ summary, last7Days: byDay })`,
};

export default function Sandbox() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState(EXAMPLES["Hello sandbox"]);
  const [allowTools, setAllowTools] = useState(true);

  const { data: toolsData } = trpc.sandbox.listTools.useQuery(undefined, {
    enabled: !!user,
  });

  const runMutation = trpc.sandbox.run.useMutation({
    onError: err => {
      toast.error("Sandbox run failed", { description: err.message });
    },
  });
  const run = runMutation.data?.run;

  if (loading) return null;
  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code2 className="w-6 h-6 text-primary" />
              Code Sandbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Run JavaScript against your live store data in a secure, isolated
              sandbox — the same one Kai uses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(EXAMPLES).map(name => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => setCode(EXAMPLES[name])}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">Editor</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="allow-tools"
                      checked={allowTools}
                      onCheckedChange={setAllowTools}
                    />
                    <Label
                      htmlFor="allow-tools"
                      className="text-xs text-muted-foreground"
                    >
                      Platform tools
                    </Label>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runMutation.mutate({ code, allowTools })}
                    disabled={runMutation.isPending || !code.trim()}
                  >
                    {runMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Run
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                Synchronous JS only — no network, imports, or await.{" "}
                <code className="text-primary">callTool(name, args)</code> reads
                and writes your store data;{" "}
                <code className="text-primary">console.log()</code> for output;
                the final expression is the result.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-[28rem] rounded-md border bg-background/60 p-3 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Output
                </CardTitle>
                {run && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={run.ok ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {run.ok ? (
                        <CircleCheck className="h-3 w-3 mr-1" />
                      ) : (
                        <CircleX className="h-3 w-3 mr-1" />
                      )}
                      {run.ok ? "success" : "error"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {run.durationMs}ms
                    </Badge>
                    {run.toolCalls.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Wrench className="h-3 w-3 mr-1" />
                        {run.toolCalls.length} tool call
                        {run.toolCalls.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!run && !runMutation.isPending && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Press Run to execute your code.
                </p>
              )}
              {runMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing in sandbox…
                </div>
              )}
              {run && (
                <>
                  {run.logs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Console
                      </p>
                      <pre className="rounded-md border bg-background/60 p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                        {run.logs.join("\n")}
                      </pre>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      {run.ok ? "Result" : "Error"}
                    </p>
                    <pre
                      className={cn(
                        "rounded-md border bg-background/60 p-3 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-auto",
                        !run.ok && "border-red-500/30 text-red-400"
                      )}
                    >
                      {run.ok ? JSON.stringify(run.result, null, 2) : run.error}
                    </pre>
                  </div>
                  {run.toolCalls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Tool calls
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {run.toolCalls.map((t, i) => (
                          <Badge
                            key={`${t.name}-${i}`}
                            variant={t.ok ? "secondary" : "destructive"}
                            className="text-xs font-mono"
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available tools reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Available tools ({toolsData?.tools.length ?? 0})
            </CardTitle>
            <CardDescription className="text-xs">
              Call any of these with{" "}
              <code className="text-primary">callTool(name, args)</code>. All
              calls are scoped to your store automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="flex flex-wrap gap-1.5">
                {(toolsData?.tools ?? []).map(tool => (
                  <Badge
                    key={tool}
                    variant="outline"
                    className="text-xs font-mono cursor-pointer hover:bg-accent"
                    onClick={() => {
                      navigator.clipboard.writeText(`callTool("${tool}", {})`);
                      toast.success("Copied", { description: tool });
                    }}
                  >
                    {tool}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
