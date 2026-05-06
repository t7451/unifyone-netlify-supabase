import { useState, useCallback, useEffect } from "react";
import type { inferRouterInputs } from "@trpc/server";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox } from "@/components/AIChatBox";
import LoadingExperience from "@/components/LoadingExperience";
import type { Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  ChevronRight,
  Loader2,
  Bot,
  Zap,
  TrendingUp,
  Map,
  Trophy,
  Users,
  Smartphone,
  BarChart3,
  CreditCard,
  Coins,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type KaiChatInput = inferRouterInputs<AppRouter>["ai"]["chat"];
type KaiModelId = NonNullable<KaiChatInput["model"]>;

// Context icons for the sidebar
const CONTEXT_ICONS: Record<string, React.ElementType> = {
  general: Bot,
  dashboard: BarChart3,
  "money-manager": TrendingUp,
  "gig-command": Map,
  achievements: Trophy,
  friends: Users,
  automations: Zap,
  "mobile-automation": Smartphone,
  social: MessageSquare,
  leads: ChevronRight,
};

const CONTEXT_LABELS: Record<string, string> = {
  general: "General",
  dashboard: "Dashboard",
  "money-manager": "Money Manager",
  "gig-command": "Gig Command",
  achievements: "Achievements",
  friends: "Friends",
  automations: "Automations",
  "mobile-automation": "Mobile Automation",
  social: "Social Media",
  leads: "Leads",
};

export default function AIAssistant() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeContext, setActiveContext] = useState("general");
  const [activeConversationId, setActiveConversationId] = useState<
    number | undefined
  >();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<KaiModelId | undefined>();
  const [creditNotice, setCreditNotice] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: balanceData, isFetching: balanceRefreshing } =
    trpc.kaiCredits.getBalance.useQuery(
      { transactionLimit: 5 },
      { enabled: !!user, refetchOnWindowFocus: true }
    );

  const { data: packageData, isLoading: packagesLoading } =
    trpc.kaiCredits.listPackages.useQuery(undefined, { enabled: !!user });

  const { data: modelsData, isLoading: modelsLoading } =
    trpc.ai.listModels.useQuery(undefined, { enabled: !!user });

  // Fetch conversation list
  const { data: historyData, isLoading: historyLoading } =
    trpc.ai.listConversations.useQuery({ limit: 20 }, { enabled: !!user });

  // Fetch context suggestions
  const { data: suggestionsData } = trpc.ai.getSuggestions.useQuery(
    { context: activeContext },
    { enabled: !!user }
  );

  useEffect(() => {
    const models = modelsData?.models ?? [];
    if (selectedModel || models.length === 0) return;
    const recommended =
      models.find(model => model.id === "gemini-2.5-flash") ?? models[0];
    setSelectedModel(recommended.id);
  }, [modelsData?.models, selectedModel]);

  // Chat mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: data => {
      setCreditNotice(null);
      setActiveConversationId(data.conversationId);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply, metadata: data.metadata },
      ]);
      utils.ai.listConversations.invalidate();
      utils.kaiCredits.getBalance.invalidate();
    },
    onError: err => {
      const message = err.message || "AI response failed";
      const isCreditError =
        err.data?.code === "FORBIDDEN" || /insufficient|credit/i.test(message);
      setCreditNotice(message);
      toast.error(isCreditError ? "Kai credits needed" : "AI response failed", {
        description: message,
      });
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: isCreditError
            ? "You do not have enough Kai credits for that request. Choose a lower-cost model or purchase a credit pack to continue."
            : "I encountered an error. Please try again.",
        },
      ]);
      utils.kaiCredits.getBalance.invalidate();
    },
  });

  const checkoutMutation = trpc.kaiCredits.createCheckout.useMutation({
    onSuccess: data => {
      utils.kaiCredits.getBalance.invalidate();
      toast.success("Opening secure checkout", {
        description: `${data.package.credits} Kai credits`,
      });
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      const message = "Stripe did not return a checkout URL.";
      setCreditNotice(message);
      toast.error("Checkout unavailable", { description: message });
    },
    onError: err => {
      const message = err.message || "Unable to launch checkout.";
      setCreditNotice(message);
      toast.error("Checkout unavailable", { description: message });
      utils.kaiCredits.getBalance.invalidate();
    },
  });

  // Delete conversation mutation
  const deleteMutation = trpc.ai.deleteConversation.useMutation({
    onSuccess: () => {
      utils.ai.listConversations.invalidate();
      toast.success("Conversation deleted");
    },
  });

  // Clear all conversations mutation
  const clearAllMutation = trpc.ai.clearAllConversations.useMutation({
    onSuccess: () => {
      utils.ai.listConversations.invalidate();
      startNewConversation();
      toast.success("All conversations cleared");
    },
  });

  // Load a conversation
  const _loadConversationQuery = trpc.ai.getConversation.useQuery(
    { id: activeConversationId! },
    {
      enabled: false,
    }
  );

  const handleLoadConversation = async (id: number) => {
    setActiveConversationId(id);
    try {
      const result = await utils.ai.getConversation.fetch({ id });
      const msgs = (result.conversation.messages as Message[]) ?? [];
      setMessages(msgs.filter(m => m.role !== "system"));
      setActiveContext(result.conversation.context ?? "general");
    } catch {
      toast.error("Failed to load conversation");
    }
  };

  const startNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
    setMessages([]);
    setActiveContext("general");
  }, []);

  const handleSendMessage = useCallback(
    (content: string) => {
      setCreditNotice(null);
      setMessages(prev => [...prev, { role: "user", content }]);
      chatMutation.mutate({
        message: content,
        context: activeContext,
        conversationId: activeConversationId,
        model: selectedModel,
      });
    },
    [activeContext, activeConversationId, chatMutation, selectedModel]
  );

  const handleContextChange = (ctx: string) => {
    setActiveContext(ctx);
    startNewConversation();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingExperience
          title="Starting Kai"
          description="Loading conversation history, assistant context, and recommended prompts."
          label="AI workspace loading"
          className="min-h-[24rem]"
        />
      </DashboardLayout>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const conversations = historyData?.conversations ?? [];
  const suggestions = suggestionsData?.suggestions ?? [];
  const models = modelsData?.models ?? [];
  const creditPackages = packageData?.packages ?? [];
  const selectedModelInfo =
    models.find(model => model.id === selectedModel) ?? models[0];
  const remainingCredits = balanceData?.remaining ?? 0;
  const selectedModelMinimum = selectedModelInfo?.minimumCredits ?? 1;
  const hasLowCredits =
    !!balanceData && remainingCredits < selectedModelMinimum;
  const ContextIcon = CONTEXT_ICONS[activeContext] ?? Bot;

  const handleCheckout = (pkg: (typeof creditPackages)[number]) => {
    setCreditNotice(null);
    checkoutMutation.mutate({
      packageId: pkg.id ?? undefined,
      packageSlug: pkg.id ? undefined : pkg.slug,
      origin: window.location.origin,
    });
  };

  const creditPanel = (
    <div className="space-y-3">
      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Kai credits</CardTitle>
              <CardDescription>
                Balance refreshes after chat and checkout attempts.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => utils.kaiCredits.getBalance.invalidate()}
              disabled={balanceRefreshing}
              title="Refresh credits"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  balanceRefreshing && "animate-spin"
                )}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-background/60 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="mt-1 text-lg font-semibold">{remainingCredits}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Purchased
              </p>
              <p className="mt-1 text-lg font-semibold">
                {balanceData?.purchased ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Used
              </p>
              <p className="mt-1 text-lg font-semibold">
                {balanceData?.used ?? 0}
              </p>
            </div>
          </div>

          {creditNotice || hasLowCredits ? (
            <Alert variant={creditNotice ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {creditNotice ? "Kai needs attention" : "Low Kai credits"}
              </AlertTitle>
              <AlertDescription>
                {creditNotice ??
                  `The selected model needs at least ${selectedModelMinimum} credits. Choose a lower-cost model or top up before sending.`}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">Buy credit packs</CardTitle>
          <CardDescription>Checkout opens in Stripe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          {packagesLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading packs…
            </div>
          ) : creditPackages.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No Kai credit packs are currently available.
            </p>
          ) : (
            creditPackages.map(pkg => (
              <div
                key={pkg.id ?? pkg.slug}
                className="rounded-lg border bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{pkg.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pkg.description || `${pkg.credits} Kai credits`}
                    </p>
                  </div>
                  <Badge variant="secondary">{pkg.credits}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: pkg.currency,
                    }).format(pkg.amountUsd)}
                  </p>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => handleCheckout(pkg)}
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Checkout
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
        {/* Sidebar */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden"
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Kai</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="h-7 w-7 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Context selector */}
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Context
            </p>
            <div className="space-y-1">
              {Object.entries(CONTEXT_LABELS).map(([ctx, label]) => {
                const Icon = CONTEXT_ICONS[ctx] ?? Bot;
                return (
                  <button
                    key={ctx}
                    onClick={() => handleContextChange(ctx)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                      activeContext === ctx
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                History
              </p>
              {conversations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => clearAllMutation.mutate()}
                  title="Clear all conversations"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1 px-2">
              {historyLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 px-2">
                  No conversations yet. Start chatting!
                </p>
              ) : (
                <div className="space-y-1 pb-4">
                  {conversations.map(convo => (
                    <div
                      key={convo.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                        activeConversationId === convo.id
                          ? "bg-primary/10"
                          : "hover:bg-accent"
                      )}
                      onClick={() => handleLoadConversation(convo.id)}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-xs truncate text-foreground">
                        {convo.title ?? "Conversation"}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                        onClick={e => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: convo.id });
                          if (activeConversationId === convo.id)
                            startNewConversation();
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  sidebarOpen && "rotate-180"
                )}
              />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <ContextIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Kai</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CONTEXT_LABELS[activeContext] ?? "General"} context
                </p>
              </div>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Badge
                variant={hasLowCredits ? "destructive" : "secondary"}
                className="text-xs"
              >
                <Coins className="h-3 w-3 mr-1" />
                {remainingCredits} credits
              </Badge>
              <Select
                value={selectedModel}
                onValueChange={value => setSelectedModel(value as KaiModelId)}
                disabled={modelsLoading || models.length === 0}
              >
                <SelectTrigger size="sm" className="w-[13rem]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent align="end">
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.minimumCredits} min credits
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="text-xs h-7"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Chat
              </Button>
            </div>
          </div>

          {/* AIChatBox + credits */}
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="grid h-full min-h-[34rem] grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <AIChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={chatMutation.isPending}
                placeholder={`Ask Kai anything about your ${CONTEXT_LABELS[activeContext] ?? "business"}…`}
                height="100%"
                className="min-h-[34rem] xl:min-h-0"
                emptyStateMessage={`Hi ${user.name?.split(" ")[0] ?? "there"}! I'm Kai, your UnifyOne AI assistant. Ask me anything about your ${CONTEXT_LABELS[activeContext] ?? "business"}.`}
                suggestedPrompts={suggestions}
              />
              <aside className="min-h-0 overflow-y-auto">{creditPanel}</aside>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
