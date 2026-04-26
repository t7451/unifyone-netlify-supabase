/**
 * TerminalToolbar.tsx
 *
 * Top bar for the terminal panel — re-exported from TerminalConnectionDialog for
 * backward compatibility. Actual implementation lives in TerminalConnectionDialog.tsx.
 *
 * This file also exports the AddVpsDialog modal for registering new VPS connections.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Download, Terminal, Server } from "lucide-react";

// Re-export toolbar from its canonical location
export { TerminalToolbar } from "./TerminalConnectionDialog";

// ── Add VPS Connection Dialog ─────────────────────────────────────────────────

interface AddVpsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddVpsDialog({ open, onOpenChange, onSuccess }: AddVpsDialogProps) {
  const [label, setLabel] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [tab, setTab] = useState<"key" | "password">("key");

  const register = trpc.cli.vpsRegister.useMutation({
    onSuccess: () => {
      toast.success("VPS connection saved");
      onSuccess();
      onOpenChange(false);
      // Reset form
      setLabel("");
      setHost("");
      setPort("22");
      setUsername("");
      setPrivateKey("");
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const handleSave = () => {
    if (!label || !host || !username) {
      toast.error("Label, host, and username are required");
      return;
    }
    register.mutate({
      label,
      host,
      port: parseInt(port, 10) || 22,
      username,
      privateKey: tab === "key" && privateKey ? privateKey : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Add VPS Connection
          </DialogTitle>
          <DialogDescription>
            Register a remote server to access via the in-website SSH terminal.
            Private keys are encrypted with AES-256-GCM before storage and never
            returned to the browser.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="vps-host">Host / IP</Label>
              <Input
                id="vps-host"
                placeholder="192.168.1.100 or example.com"
                value={host}
                onChange={e => setHost(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vps-port">Port</Label>
              <Input
                id="vps-port"
                placeholder="22"
                value={port}
                onChange={e => setPort(e.target.value)}
                className="mt-1"
                type="number"
                min={1}
                max={65535}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vps-label">Label</Label>
              <Input
                id="vps-label"
                placeholder="My Production Server"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vps-username">Username</Label>
              <Input
                id="vps-username"
                placeholder="ubuntu"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as "key" | "password")}>
            <TabsList className="w-full">
              <TabsTrigger value="key" className="flex-1">SSH Key</TabsTrigger>
              <TabsTrigger value="password" className="flex-1">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="key" className="mt-3">
              <Label htmlFor="vps-key">Private Key (PEM)</Label>
              <Textarea
                id="vps-key"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;…&#10;-----END OPENSSH PRIVATE KEY-----"
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
                className="mt-1 font-mono text-xs h-28 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stored encrypted (AES-256-GCM). Never returned to the browser.
              </p>
            </TabsContent>
            <TabsContent value="password" className="mt-3">
              <p className="text-sm text-muted-foreground">
                Password authentication is not yet supported. Use SSH key auth or
                configure{" "}
                <code className="text-xs">~/.ssh/authorized_keys</code> on your server.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={register.isPending}>
            {register.isPending ? "Saving…" : "Save Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Local Agent Install Dialog ────────────────────────────────────────────────

interface LocalAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentToken?: string;
}

export function LocalAgentDialog({
  open,
  onOpenChange,
  agentToken,
}: LocalAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Connect Your Local Machine
          </DialogTitle>
          <DialogDescription>
            Install the{" "}
            <code className="text-xs">unifyone-agent</code> to connect your local
            terminal to the in-website CLI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium mb-2">
              1. Install the agent
            </p>
            <Tabs defaultValue="npm">
              <TabsList>
                <TabsTrigger value="npm">npm</TabsTrigger>
                <TabsTrigger value="brew">Homebrew</TabsTrigger>
                <TabsTrigger value="curl">curl</TabsTrigger>
              </TabsList>
              <TabsContent value="npm">
                <code className="block bg-muted rounded p-3 text-xs font-mono mt-2">
                  npm install -g @unifyone/agent
                </code>
              </TabsContent>
              <TabsContent value="brew">
                <code className="block bg-muted rounded p-3 text-xs font-mono mt-2">
                  brew install unifyone-agent
                </code>
              </TabsContent>
              <TabsContent value="curl">
                <code className="block bg-muted rounded p-3 text-xs font-mono mt-2">
                  curl -fsSL https://get.unifyone.com/agent | sh
                </code>
              </TabsContent>
            </Tabs>
          </div>

          {agentToken && (
            <div>
              <p className="text-sm font-medium mb-2">
                2. Start the agent with your session token
              </p>
              <code className="block bg-muted rounded p-3 text-xs font-mono break-all">
                unifyone-agent --token {agentToken}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                This token expires in 60 seconds. Click the button below to issue a new one if needed.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
            <Download className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              The agent runs exclusively on <code>localhost:7271</code> and connects
              outbound to the UnifyOne relay. It cannot receive inbound connections
              from the internet.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
