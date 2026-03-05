import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AIChatBox } from "@/components/AIChatBox";
import type { Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Plus, Trash2, MessageSquare, ChevronRight, Loader2,
  Bot, Zap, TrendingUp, Map, Trophy, Users, Smartphone, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

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
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const utils = trpc.useUtils();

  // Fetch conversation list
  const { data: historyData, isLoading: historyLoading } = trpc.manusAI.listConversations.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );

  // Fetch context suggestions
  const { data: suggestionsData } = trpc.manusAI.getSuggestions.useQuery(
    { context: activeContext },
    { enabled: !!user }
  );

  // Chat mutation
  const chatMutation = trpc.manusAI.chat.useMutation({
    onSuccess: (data) => {
      setActiveConversationId(data.conversationId);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      utils.manusAI.listConversations.invalidate();
    },
    onError: (err) => {
      toast.error("AI response failed: " + err.message);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "I encountered an error. Please try again." },
      ]);
    },
  });

  // Delete conversation mutation
  const deleteMutation = trpc.manusAI.deleteConversation.useMutation({
    onSuccess: () => {
      utils.manusAI.listConversations.invalidate();
      toast.success("Conversation deleted");
    },
  });

  // Clear all conversations mutation
  const clearAllMutation = trpc.manusAI.clearAllConversations.useMutation({
    onSuccess: () => {
      utils.manusAI.listConversations.invalidate();
      startNewConversation();
      toast.success("All conversations cleared");
    },
  });

  // Load a conversation
  const loadConversationQuery = trpc.manusAI.getConversation.useQuery(
    { id: activeConversationId! },
    {
      enabled: false,
    }
  );

  const handleLoadConversation = async (id: number) => {
    setActiveConversationId(id);
    try {
      const result = await utils.manusAI.getConversation.fetch({ id });
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
      setMessages(prev => [...prev, { role: "user", content }]);
      chatMutation.mutate({
        message: content,
        context: activeContext,
        conversationId: activeConversationId,
      });
    },
    [activeContext, activeConversationId, chatMutation]
  );

  const handleContextChange = (ctx: string) => {
    setActiveContext(ctx);
    startNewConversation();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const conversations = historyData?.conversations ?? [];
  const suggestions = suggestionsData?.suggestions ?? [];
  const ContextIcon = CONTEXT_ICONS[activeContext] ?? Bot;

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
              <span className="font-semibold text-sm">Manus AI</span>
            </div>
            <Button variant="ghost" size="sm" onClick={startNewConversation} className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Context selector */}
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Context</p>
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
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">History</p>
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
                  {conversations.map((convo) => (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: convo.id });
                          if (activeConversationId === convo.id) startNewConversation();
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
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", sidebarOpen && "rotate-180")} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <ContextIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Manus AI</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CONTEXT_LABELS[activeContext] ?? "General"} context
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by Manus
              </Badge>
              <Button variant="ghost" size="sm" onClick={startNewConversation} className="text-xs h-7">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Chat
              </Button>
            </div>
          </div>

          {/* AIChatBox */}
          <div className="flex-1 overflow-hidden p-4">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={chatMutation.isPending}
              placeholder={`Ask Manus anything about your ${CONTEXT_LABELS[activeContext] ?? "business"}…`}
              height="100%"
              className="h-full"
              emptyStateMessage={`Hi ${user.name?.split(" ")[0] ?? "there"}! I'm Manus, your UnifyOne AI assistant. Ask me anything about your ${CONTEXT_LABELS[activeContext] ?? "business"}.`}
              suggestedPrompts={suggestions}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
