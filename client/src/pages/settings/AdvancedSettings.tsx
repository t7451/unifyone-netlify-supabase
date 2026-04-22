import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FlaskConical,
  Bell,
  Send,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { useLocation } from "wouter";
import MCPStatusWidget from "@/components/MCPStatusWidget";
import SettingsLayout from "./SettingsLayout";

const ALERT_TYPES = [
  { value: "info", label: "Info", icon: Info, color: "text-blue-400" },
  {
    value: "success",
    label: "Success",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  {
    value: "warning",
    label: "Warning",
    icon: AlertTriangle,
    color: "text-amber-400",
  },
  {
    value: "error",
    label: "Urgent",
    icon: AlertCircle,
    color: "text-red-400",
  },
] as const;

export default function AdvancedSettings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Billing link card */}
        <Card className="bg-card border-border">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Billing & Subscription
                  </p>
                  <p className="text-gray-500 text-sm">
                    Manage your plan, payment method, and invoices
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-white/10 text-gray-300 hover:text-white hover:border-white/20 shrink-0"
                onClick={() => navigate("/billing")}
              >
                Manage
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Owner Alert Composer */}
        {user?.role === "admin" && <OwnerAlertComposer />}

        {/* MCP Server */}
        <MCPStatusWidget variant="settings" />

        <GoogleOAuthCard />

        {/* Demo Data */}
        <DemoDataCard />
      </div>
    </SettingsLayout>
  );
}

function GoogleOAuthCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.tenant.getOAuthSettings.useQuery();
  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [scopes, setScopes] = useState("");

  const saveOAuth = trpc.tenant.updateOAuthSettings.useMutation({
    onSuccess: () => {
      toast.success("Google OAuth settings saved.");
      setClientSecret("");
      utils.tenant.getOAuthSettings.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const resolvedGoogle = data?.google;

  useEffect(() => {
    if (!resolvedGoogle) return;
    setEnabled(resolvedGoogle.enabled);
    setClientId(resolvedGoogle.clientId);
    setRedirectUri(resolvedGoogle.redirectUri);
    setScopes(resolvedGoogle.scopes);
  }, [resolvedGoogle]);

  const handleSave = () => {
    saveOAuth.mutate({
      google: {
        enabled,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim() || undefined,
        redirectUri: redirectUri.trim(),
        scopes: scopes.trim(),
      },
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#00D9FF]" />
          Google OAuth Scaffold
        </CardTitle>
        <CardDescription className="text-gray-400">
          Save tenant-specific Google OAuth values after signing in with
          email/password. The provider callback is scaffolded for later wiring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Enabled</Label>
          <Select
            value={String(enabled)}
            onValueChange={value => setEnabled(value === "true")}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Client ID</Label>
          <Input
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="Google OAuth client ID"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Client Secret</Label>
          <Input
            type="password"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            placeholder={
              resolvedGoogle?.hasClientSecret
                ? "Saved — enter a new value to replace it"
                : "Google OAuth client secret"
            }
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
          {resolvedGoogle?.hasClientSecret && (
            <p className="text-xs text-gray-500">
              A client secret is already stored and is never sent back to the UI.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Redirect URI</Label>
          <Input
            value={redirectUri}
            onChange={e => setRedirectUri(e.target.value)}
            placeholder="https://your-app.com/api/auth/google/callback"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
          <p className="text-xs text-gray-500">
            This should match the callback configured in your Google app.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Scopes</Label>
          <Textarea
            value={scopes}
            onChange={e => setScopes(e.target.value)}
            rows={3}
            placeholder="openid email profile"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50 resize-none"
          />
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Scaffold usage
          </p>
          <p className="text-sm text-gray-300">
            After saving, open the login page with
            <span className="font-mono text-white"> ?tenant=your-store-slug</span>
            and use the Google button to test the authorize redirect.
          </p>
          <p className="text-xs text-gray-500">
            Callback status: the app redirects back to login with a scaffold
            notice until the token exchange is implemented.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveOAuth.isPending || isLoading}
            className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
          >
            {saveOAuth.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Google OAuth"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OwnerAlertComposer() {
  const { data: members = [], isLoading: membersLoading } =
    trpc.team.listMembers.useQuery();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [alertType, setAlertType] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");

  const sendToUser = trpc.notifications.sendToUser.useMutation({
    onSuccess: () => {
      toast.success("Push notification sent successfully.");
      setSelectedUserId("");
      setAlertType("info");
      setTitle("");
      setBody("");
      setLink("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!selectedUserId) {
      toast.error("Please select a recipient.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    sendToUser.mutate({
      userId: parseInt(selectedUserId),
      type: alertType as "info" | "success" | "warning" | "error",
      title: title.trim(),
      body: body.trim() || undefined,
      link: link.trim() || undefined,
    });
  };

  const selectedMember = members.find(
    (m: Record<string, unknown>) => String(m.id) === selectedUserId
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00D9FF]" />
          Owner Alert Composer
        </CardTitle>
        <CardDescription className="text-gray-400 text-sm">
          Send on-demand push notifications to individual team members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Recipient</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50">
                <SelectValue
                  placeholder={
                    membersLoading ? "Loading team..." : "Select a user"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {members.map((m: Record<string, unknown>) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>
                    <span className="flex items-center gap-2">
                      <span>{(m.name as string) || (m.email as string)}</span>
                      <span className="text-xs text-gray-500">
                        #{String(m.id)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Alert Type</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Title</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Action required on order #1042"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">
            Message Body (optional)
          </Label>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Additional context or instructions..."
            rows={3}
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Link (optional)</Label>
          <Input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="/orders/1042 or https://..."
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          {selectedMember && title.trim() ? (
            <div className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 mb-1">Preview</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const typeInfo = ALERT_TYPES.find(t => t.value === alertType);
                  const Icon = typeInfo?.icon ?? Info;
                  return (
                    <Icon
                      className={`w-4 h-4 ${typeInfo?.color ?? "text-blue-400"}`}
                    />
                  );
                })()}
                <div>
                  <p className="text-sm text-white font-medium">{title}</p>
                  {body && (
                    <p className="text-xs text-gray-400 mt-0.5">{body}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                To:{" "}
                {(selectedMember.name as string) ||
                  (selectedMember.email as string)}
              </p>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <Button
            onClick={handleSend}
            disabled={sendToUser.isPending || !selectedUserId || !title.trim()}
            className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold shrink-0"
          >
            {sendToUser.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoDataCard() {
  const utils = trpc.useUtils();
  const seedMutation = trpc.tenant.seedDemo.useMutation({
    onSuccess: data => {
      toast.success(
        `Demo data seeded: ${data.productsCreated} products, ${data.customersCreated} customers, ${data.ordersCreated} orders`
      );
      utils.products.list.invalidate();
      utils.orders.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[#00D9FF]" />
          Demo Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-gray-400 text-sm mb-1">
              Populate your store with sample catalog data to explore the
              platform features.
            </p>
            <p className="text-gray-500 text-xs">
              Creates 6 products (Apparel + Industrial), 3 customers, and 3
              orders across different statuses.
            </p>
          </div>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20 shrink-0"
          >
            {seedMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4 mr-2" />
                Load Sample Data
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
