import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AtSign, Link2, Loader2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

// Platforms that connect via app password / direct credentials (no OAuth
// redirect). v1 ships Bluesky; Mastodon (per-instance OAuth) arrives separately.
const CREDENTIAL_PLATFORMS = {
  bluesky: {
    label: "Bluesky",
    identifierLabel: "Handle or email",
    identifierPlaceholder: "alice.bsky.social",
    secretLabel: "App password",
    secretHelp:
      "Create one at Settings → App Passwords in Bluesky. We never store your main password.",
    supportsInstance: true,
    instanceLabel: "PDS host (optional)",
    instancePlaceholder: "https://bsky.social",
  },
} as const;

type CredentialPlatform = keyof typeof CREDENTIAL_PLATFORMS;

function platformLabel(platform: string): string {
  return (
    (CREDENTIAL_PLATFORMS as Record<string, { label: string }>)[platform]
      ?.label ?? platform.charAt(0).toUpperCase() + platform.slice(1)
  );
}

function ConnectDialog({ onConnected }: { onConnected: () => void }) {
  const [open, setOpen] = useState(false);
  const [platform] = useState<CredentialPlatform>("bluesky");
  const [identifier, setIdentifier] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");

  const cfg = CREDENTIAL_PLATFORMS[platform];

  const connect = trpc.connectedAccounts.connect.useMutation({
    onSuccess: () => {
      toast.success(`${cfg.label} connected`);
      setIdentifier("");
      setAppPassword("");
      setInstanceUrl("");
      setOpen(false);
      onConnected();
    },
    onError: e => toast.error("Could not connect", { description: e.message }),
  });

  const canSubmit =
    identifier.trim().length > 0 &&
    appPassword.length > 0 &&
    !connect.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {cfg.label}</DialogTitle>
          <DialogDescription>
            Link an account so UnifyOne can publish on your behalf. Credentials
            are exchanged server-side and stored encrypted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="social-identifier">{cfg.identifierLabel}</Label>
            <Input
              id="social-identifier"
              autoComplete="off"
              placeholder={cfg.identifierPlaceholder}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-secret">{cfg.secretLabel}</Label>
            <Input
              id="social-secret"
              type="password"
              autoComplete="off"
              value={appPassword}
              onChange={e => setAppPassword(e.target.value)}
            />
            <p className="text-xs text-slate-400">{cfg.secretHelp}</p>
          </div>
          {cfg.supportsInstance && (
            <div className="space-y-1.5">
              <Label htmlFor="social-instance">{cfg.instanceLabel}</Label>
              <Input
                id="social-instance"
                autoComplete="off"
                placeholder={cfg.instancePlaceholder}
                value={instanceUrl}
                onChange={e => setInstanceUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              connect.mutate({
                platform,
                identifier: identifier.trim(),
                appPassword,
                ...(instanceUrl.trim()
                  ? { instanceUrl: instanceUrl.trim() }
                  : {}),
              })
            }
          >
            {connect.isPending && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectAccounts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: accounts = [], isLoading } =
    trpc.connectedAccounts.list.useQuery(undefined, { enabled: isAdmin });

  const disconnect = trpc.connectedAccounts.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      utils.connectedAccounts.list.invalidate();
    },
    onError: e =>
      toast.error("Could not disconnect", { description: e.message }),
  });

  // Connect/disconnect is admin-only; hide the panel for everyone else.
  if (!isAdmin) return null;

  const connected = accounts.filter(a => a.isConnected);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-sky-400" /> Connected Accounts
        </CardTitle>
        <ConnectDialog
          onConnected={() => utils.connectedAccounts.list.invalidate()}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : connected.length === 0 ? (
          <p className="text-sm text-slate-400">
            No accounts connected yet. Connect Bluesky to start publishing.
          </p>
        ) : (
          connected.map(account => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AtSign className="h-4 w-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {account.handle ?? account.displayName ?? "Account"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {platformLabel(account.platform)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                >
                  Connected
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate({ accountId: account.id })}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
