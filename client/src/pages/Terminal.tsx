/**
 * Terminal.tsx
 *
 * Full-page in-website CLI terminal.
 *
 * Features:
 *   - Platform mode: built-in commands via tRPC (no external connection)
 *   - VPS mode: SSH relay via WebSocket (/api/cli/pty?mode=vps)
 *   - Local mode: relay to unifyone-agent via one-time token
 *
 * Keyboard shortcut: Ctrl+` or Cmd+` from any dashboard page opens/closes
 * the terminal as a slide-in drawer (handled in DashboardLayout.tsx).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TerminalEmulator } from "@/components/Terminal/TerminalEmulator";
import {
  TerminalToolbar,
  AddVpsDialog,
  LocalAgentDialog,
} from "@/components/Terminal/TerminalToolbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionMode, SessionStatus } from "@/hooks/useTerminalSession";
import { Terminal as TerminalIcon, History, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// ── History panel ─────────────────────────────────────────────────────────────

function HistoryPanel() {
  const { data } = trpc.cli.history.useQuery({ limit: 50, offset: 0 });
  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-6">
        <History className="w-8 h-8 opacity-40" />
        <p>No command history yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-2 text-xs p-2 rounded-md hover:bg-muted/50 group"
          >
            {item.exitCode === 0 ? (
              <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 mt-0.5 text-red-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <code className="font-mono text-foreground break-all">
                {item.command}
              </code>
              <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {new Date(item.executedAt).toLocaleString()}
                </span>
                {item.exitCode !== null && item.exitCode !== 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                    exit {item.exitCode}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Terminal() {
  const [mode, setMode] = useState<SessionMode>("platform");
  const [selectedVpsId, setSelectedVpsId] = useState<number | undefined>();
  const [agentToken, setAgentToken] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [addVpsOpen, setAddVpsOpen] = useState(false);
  const [localAgentOpen, setLocalAgentOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [terminalKey, setTerminalKey] = useState(0); // remount terminal on reset
  // Use a ref to track the latest sessionId for cleanup (avoids stale closures)
  const sessionIdRef = useRef<number | undefined>(undefined);

  // VPS list
  const vpsListQuery = trpc.cli.vpsList.useQuery();
  const vpsList = (vpsListQuery.data ?? []).map(v => ({
    id: v.id,
    label: v.label,
    host: v.host,
    username: v.username,
  }));

  // Session management
  const openSession = trpc.cli.openSession.useMutation({
    onSuccess: data => {
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
    },
  });
  const closeSession = trpc.cli.closeSession.useMutation();
  const issueLocalToken = trpc.cli.issueLocalToken.useMutation({
    onSuccess: data => {
      setAgentToken(data.token);
      setLocalAgentOpen(true);
    },
  });

  // Open a session when mode changes
  useEffect(() => {
    openSession.mutate({
      mode,
      vpsId: mode === "vps" ? selectedVpsId : undefined,
    });
    return () => {
      // Use ref to always get the latest sessionId, avoiding stale closure
      const id = sessionIdRef.current;
      if (id) {
        closeSession.mutate({ sessionId: id });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedVpsId]);

  const handleModeChange = useCallback(
    (newMode: SessionMode) => {
      if (newMode === "local") {
        // Issue a one-time token before switching
        issueLocalToken.mutate(undefined, {
          onError: err => toast.error(`Could not issue local agent token: ${err.message}`),
        });
      }
      setMode(newMode);
      setTerminalKey(k => k + 1); // remount terminal
    },
    [issueLocalToken]
  );

  const handleDisconnect = useCallback(() => {
    if (sessionId) {
      closeSession.mutate({ sessionId });
    }
    setTerminalKey(k => k + 1); // remount
  }, [sessionId, closeSession]);

  const handleClear = useCallback(() => {
    setTerminalKey(k => k + 1); // remount terminal to clear it
  }, []);

  const handleVpsAdded = useCallback(() => {
    vpsListQuery.refetch();
  }, [vpsListQuery]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TerminalIcon className="w-6 h-6" />
            Terminal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            In-browser CLI — Platform, VPS, and Local machine modes
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(h => !h)}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </TooltipTrigger>
          <TooltipContent>View persisted command history</TooltipContent>
        </Tooltip>
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Terminal panel */}
        <Card className="flex-1 flex flex-col overflow-hidden p-0 min-h-[400px]">
          <TerminalToolbar
            mode={mode}
            onModeChange={handleModeChange}
            status={status}
            vpsList={vpsList}
            selectedVpsId={selectedVpsId}
            onVpsSelect={id => {
              setSelectedVpsId(id);
              setTerminalKey(k => k + 1);
            }}
            onAddVps={() => setAddVpsOpen(true)}
            onDisconnect={handleDisconnect}
            onClearHistory={handleClear}
          />
          <CardContent className="flex-1 p-0 overflow-hidden">
            <TerminalEmulator
              key={terminalKey}
              mode={mode}
              sessionId={sessionId}
              vpsId={mode === "vps" ? selectedVpsId : undefined}
              agentToken={mode === "local" ? agentToken : undefined}
              onStatusChange={s => setStatus(s as SessionStatus)}
            />
          </CardContent>
        </Card>

        {/* History panel (collapsible) */}
        {showHistory && (
          <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <span className="text-sm font-medium">Command History</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowHistory(false)}
              >
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HistoryPanel />
            </div>
          </Card>
        )}
      </div>

      {/* Quick reference */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">Platform mode</span>{" "}
          — commands run directly against the UnifyOne API. Type{" "}
          <code className="bg-muted px-1 rounded">help</code> to see all available commands.
        </p>
        <p>
          <span className="font-medium text-foreground">VPS mode</span>{" "}
          — SSH relay via the UnifyOne server. Add a connection with your host, port,
          username, and SSH private key.
        </p>
        <p>
          <span className="font-medium text-foreground">Local mode</span>{" "}
          — requires{" "}
          <code className="bg-muted px-1 rounded">unifyone-agent</code> installed on your machine.
        </p>
      </div>

      {/* Modals */}
      <AddVpsDialog
        open={addVpsOpen}
        onOpenChange={setAddVpsOpen}
        onSuccess={handleVpsAdded}
      />
      <LocalAgentDialog
        open={localAgentOpen}
        onOpenChange={setLocalAgentOpen}
        agentToken={agentToken}
      />
    </div>
  );
}
