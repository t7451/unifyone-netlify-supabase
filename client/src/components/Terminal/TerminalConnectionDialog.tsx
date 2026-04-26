/**
 * TerminalToolbar.tsx
 *
 * Top bar for the terminal panel.
 *
 * Shows:
 *   - Mode selector (Platform / VPS / Local)
 *   - Connection status badge
 *   - VPS picker / Add connection button
 *   - Session action buttons (disconnect, clear)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Server,
  Cpu,
  Circle,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { SessionMode } from "@/hooks/useTerminalSession";
import type { SessionStatus } from "@/hooks/useTerminalSession";

interface VpsOption {
  id: number;
  label: string;
  host: string;
  username: string;
}

interface TerminalToolbarProps {
  mode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  status: SessionStatus;
  vpsList: VpsOption[];
  selectedVpsId?: number;
  onVpsSelect: (id: number) => void;
  onAddVps: () => void;
  onDisconnect: () => void;
  onClearHistory: () => void;
}

const MODE_ICONS: Record<SessionMode, React.ReactNode> = {
  platform: <Monitor className="w-3.5 h-3.5" />,
  vps: <Server className="w-3.5 h-3.5" />,
  local: <Cpu className="w-3.5 h-3.5" />,
};

const MODE_LABELS: Record<SessionMode, string> = {
  platform: "Platform",
  vps: "VPS / Cloud",
  local: "Local Machine",
};

function StatusBadge({ status }: { status: SessionStatus }) {
  const configs: Record<
    SessionStatus,
    { label: string; color: string; dot: string }
  > = {
    idle: { label: "Idle", color: "text-muted-foreground", dot: "bg-muted-foreground" },
    connecting: {
      label: "Connecting…",
      color: "text-yellow-500",
      dot: "bg-yellow-500 animate-pulse",
    },
    connected: {
      label: "Connected",
      color: "text-green-500",
      dot: "bg-green-500",
    },
    reconnecting: {
      label: "Reconnecting…",
      color: "text-yellow-500",
      dot: "bg-yellow-500 animate-pulse",
    },
    error: { label: "Error", color: "text-red-500", dot: "bg-red-500" },
    closed: {
      label: "Disconnected",
      color: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  };
  const cfg = configs[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-xs font-medium", cfg.color)}
    >
      <Circle className={cn("w-2 h-2 rounded-full fill-current", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function TerminalToolbar({
  mode,
  onModeChange,
  status,
  vpsList,
  selectedVpsId,
  onVpsSelect,
  onAddVps,
  onDisconnect,
  onClearHistory,
}: TerminalToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 rounded-t-md flex-wrap">
      {/* Terminal title */}
      <span className="text-xs font-semibold text-zinc-400 mr-1 hidden sm:block">
        Terminal
      </span>

      {/* Mode selector */}
      <Select
        value={mode}
        onValueChange={v => onModeChange(v as SessionMode)}
      >
        <SelectTrigger className="h-7 w-36 text-xs bg-zinc-800 border-zinc-700 gap-1">
          <span className="flex items-center gap-1.5">
            {MODE_ICONS[mode]}
            <SelectValue>{MODE_LABELS[mode]}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="platform">
            <span className="flex items-center gap-2">
              {MODE_ICONS.platform} Platform
            </span>
          </SelectItem>
          <SelectItem value="vps">
            <span className="flex items-center gap-2">
              {MODE_ICONS.vps} VPS / Cloud
            </span>
          </SelectItem>
          <SelectItem value="local">
            <span className="flex items-center gap-2">
              {MODE_ICONS.local} Local Machine
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* VPS picker — shown only in VPS mode */}
      {mode === "vps" && (
        <>
          {vpsList.length > 0 ? (
            <Select
              value={selectedVpsId !== undefined ? String(selectedVpsId) : ""}
              onValueChange={v => onVpsSelect(Number(v))}
            >
              <SelectTrigger className="h-7 w-44 text-xs bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select server…" />
              </SelectTrigger>
              <SelectContent>
                {vpsList.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    <span className="font-medium">{v.label}</span>
                    <span className="text-muted-foreground ml-2">
                      {v.username}@{v.host}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">No servers added</span>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs bg-zinc-800 border-zinc-700"
            onClick={onAddVps}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </>
      )}

      {/* Local mode hint */}
      {mode === "local" && (
        <span className="text-xs text-zinc-500">
          Requires{" "}
          <code className="text-cyan-400">unifyone-agent</code> running locally
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Action buttons */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
        title="Reconnect"
        onClick={onClearHistory}
        disabled={status === "connecting" || status === "reconnecting"}
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
        title="Disconnect"
        onClick={onDisconnect}
        disabled={status === "closed" || status === "idle"}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
