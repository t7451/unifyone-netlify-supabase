import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, MessageSquare, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface AIInsightsCardProps {
  /** Page context key — must match a key in CONTEXT_PROMPTS/CONTEXT_SUGGESTIONS in aiRouter */
  context: string;
  /** Optional serialized data context injected into the AI prompt (e.g. JSON-stringified KPI summary) */
  dataContext?: string;
  /** Initial question to ask the AI on first load (auto-fires on mount when provided) */
  initialPrompt?: string;
  /** Card title override */
  title?: string;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * AIInsightsCard — A compact, collapsible AI insight panel.
 *
 * Renders a card with:
 *  - Suggested prompts pulled from ai.getSuggestions
 *  - A "Generate Insights" button that fires a one-shot chat mutation
 *  - Markdown-rendered AI response
 *  - A "Open Full Chat" link to /ai-assistant
 *
 * Usage:
 *   <AIInsightsCard context="money-manager" dataContext={JSON.stringify(kpiData)} />
 */
export default function AIInsightsCard({
  context,
  dataContext,
  initialPrompt,
  title = "AI Insights",
  defaultCollapsed = false,
}: AIInsightsCardProps) {
  const [, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [insight, setInsight] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  const { data: suggestionsData } = trpc.ai.getSuggestions.useQuery({ context });
  const suggestions = suggestionsData?.suggestions ?? [];

  const chat = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setInsight(data.reply);
    },
  });

  const handleAsk = (prompt: string) => {
    setActivePrompt(prompt);
    setInsight(null);
    chat.mutate({ message: prompt, context, dataContext });
  };

  const handleRefresh = () => {
    if (activePrompt) {
      setInsight(null);
      chat.mutate({ message: activePrompt, context, dataContext });
    } else if (suggestions.length > 0) {
      handleAsk(suggestions[0]);
    }
  };

  // Auto-fire initial prompt on first render if provided
  const [autoFired, setAutoFired] = useState(false);
  if (initialPrompt && !autoFired && !chat.isPending && !insight) {
    setAutoFired(true);
    // Use setTimeout to avoid calling mutation during render
    setTimeout(() => handleAsk(initialPrompt), 0);
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            {title}
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
              AI
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            {insight && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefresh}
                disabled={chat.isPending}
                title="Refresh insights"
              >
                <RefreshCw className={`h-3 w-3 ${chat.isPending ? "animate-spin" : ""}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Suggested prompts */}
          {!insight && !chat.isPending && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Ask Kai about your data:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAsk(s)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {chat.isPending && (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-sm">Kai is analyzing your data…</span>
            </div>
          )}

          {/* AI response */}
          {insight && !chat.isPending && (
            <div className="space-y-3">
              {activePrompt && (
                <p className="text-xs text-muted-foreground italic">"{activePrompt}"</p>
              )}
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border/50">
                {insight}
              </div>
              {/* Follow-up suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {suggestions.filter(s => s !== activePrompt).slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAsk(s)}
                    className="text-xs px-2 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {chat.isError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              Failed to get AI insights. <button onClick={handleRefresh} className="underline">Try again</button>
            </div>
          )}

          {/* Open full chat link */}
          <div className="pt-1 border-t border-border/40">
            <button
              onClick={() => navigate("/ai-assistant")}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              Open full AI chat
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
