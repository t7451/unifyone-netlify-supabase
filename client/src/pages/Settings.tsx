import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2, CreditCard, Users, CheckCircle, ExternalLink,
  Loader2, Shield, Zap, Crown, ArrowUpRight, Settings2, FlaskConical,
  Bell, Send, AlertTriangle, Info, AlertCircle, CheckCircle2
} from "lucide-react";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="w-4 h-4 text-blue-400" />,
  pro: <Shield className="w-4 h-4 text-[#00D9FF]" />,
  enterprise: <Crown className="w-4 h-4 text-amber-400" />,
};

const PLAN_GRADIENTS: Record<string, string> = {
  starter: "from-blue-500/10 to-blue-600/5",
  pro: "from-[#00D9FF]/10 to-[#0284C7]/5",
  enterprise: "from-amber-500/10 to-amber-600/5",
};

export default function Settings() {
  const { user } = useAuth();
  const tenantList = trpc.tenant.list.useQuery();
  const tenant = tenantList.data?.[0] as any;
  const plans = trpc.tenant.getPlans.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const updateTenant = trpc.tenant.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      setName("");
      utils.tenant.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleUpgrade = async (plan: any) => {
    if (!plan.stripePriceIdMonthly && !plan.stripePriceId) {
      toast.error("No Stripe price configured for this plan. Contact support.");
      return;
    }
    const priceId = plan.stripePriceIdMonthly || plan.stripePriceId;
    setCheckoutLoading(plan.id);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          tenantId: tenant?.id,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) {
        toast.success("Redirecting to Stripe Checkout...");
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!tenant?.stripeCustomerId) {
      toast.info("No active subscription found. Upgrade a plan first.");
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: tenant.stripeCustomerId,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) {
        toast.success("Opening billing portal...");
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch (err: any) {
      toast.error(err.message || "Billing portal failed");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-[#00D9FF]" />
            Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage your store, account, and subscription</p>
        </div>
      </div>

      {/* Store + Account row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00D9FF]" /> Store Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm">Store Name</Label>
              <Input
                value={name || tenant?.name || ""}
                onChange={e => setName(e.target.value)}
                placeholder={tenant?.name ?? "Store name"}
                className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#00D9FF]/50"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Store Slug</Label>
              <Input
                value={tenant?.slug ?? ""}
                disabled
                className="bg-white/5 border-white/10 text-gray-500 mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation.</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={tenant?.status === "active"
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-amber-500/30 text-amber-400"}
                  >
                    {tenant?.status ?? "—"}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => tenant && updateTenant.mutate({ id: tenant.id, name: name || tenant.name || "" })}
              disabled={updateTenant.isPending || !name || !tenant}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
            >
              {updateTenant.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6A1B9A]" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center text-[#0A1128] font-bold text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{user?.name ?? "—"}</div>
                <div className="text-gray-400 text-sm truncate">{user?.email ?? "—"}</div>
              </div>
              <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] text-xs capitalize shrink-0">
                {user?.role ?? "user"}
              </Badge>
            </div>

            <Separator className="bg-white/10" />

            {/* Billing management */}
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Billing</p>
              {tenant?.stripeCustomerId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 text-sm">Active subscription</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full border border-white/10 text-gray-300 hover:text-white hover:border-white/20"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading
                      ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Opening Portal...</>
                      : <><ExternalLink className="w-3 h-3 mr-2" />Manage Billing</>}
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No active subscription. Select a plan below to upgrade.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#10B981]" /> Subscription Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-52 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans.data ?? []).map((plan: any) => {
                const isCurrent = plan.id === tenant?.planId;
                const slug = plan.slug?.toLowerCase() ?? "starter";
                const icon = PLAN_ICONS[slug] ?? <Zap className="w-4 h-4 text-gray-400" />;
                const gradient = PLAN_GRADIENTS[slug] ?? "";
                const isUpgrading = checkoutLoading === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl p-5 border transition-all ${
                      isCurrent
                        ? "border-[#00D9FF]/50 bg-gradient-to-br " + gradient
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-white font-semibold">{plan.name}</h3>
                      </div>
                      {isCurrent && (
                        <Badge variant="outline" className="border-[#00D9FF]/40 text-[#00D9FF] text-xs">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">
                        {plan.price === "0" ? "Free" : `$${Number(plan.price).toFixed(0)}`}
                      </span>
                      {plan.price !== "0" && (
                        <span className="text-gray-400 text-sm font-normal">/mo</span>
                      )}
                    </div>

                    <div className="text-gray-400 text-xs space-y-1.5 mb-5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-gray-500" />
                        Up to {plan.maxProducts === 9999 ? "Unlimited" : plan.maxProducts} products
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-gray-500" />
                        Up to {plan.maxOrders === 99999 ? "Unlimited" : plan.maxOrders} orders/mo
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-gray-500" />
                        {plan.maxUsers === 25 ? "25+" : plan.maxUsers} team member{plan.maxUsers !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {isCurrent ? (
                      <div className="w-full py-2 text-center text-[#00D9FF] text-sm font-medium">
                        ✓ Active Plan
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-white/5 border border-white/20 text-white hover:bg-[#00D9FF]/10 hover:border-[#00D9FF]/40 hover:text-[#00D9FF] transition-all text-xs font-medium"
                        onClick={() => handleUpgrade(plan)}
                        disabled={isUpgrading || !!checkoutLoading}
                      >
                        {isUpgrading
                          ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Processing...</>
                          : <><ArrowUpRight className="w-3 h-3 mr-1.5" />Upgrade to {plan.name}</>}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-gray-500 text-xs mt-4 text-center">
            Payments are processed securely by Stripe. All transactions are encrypted and PCI-compliant.
          </p>
        </CardContent>
      </Card>

      {/* Owner Alert Composer (admin only) */}
      {user?.role === "admin" && <OwnerAlertComposer />}

      {/* Demo Data */}
      <DemoDataCard />
    </div>
  );
}

// ── Notification type metadata for the alert composer ──────────────────────
const ALERT_TYPES = [
  { value: "info", label: "Info", icon: Info, color: "text-blue-400" },
  { value: "success", label: "Success", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-amber-400" },
  { value: "error", label: "Urgent", icon: AlertCircle, color: "text-red-400" },
] as const;

function OwnerAlertComposer() {
  const { data: members = [], isLoading: membersLoading } = trpc.team.listMembers.useQuery();
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
    onError: (e: any) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!selectedUserId) { toast.error("Please select a recipient."); return; }
    if (!title.trim()) { toast.error("Title is required."); return; }
    sendToUser.mutate({
      userId: parseInt(selectedUserId),
      type: alertType as any,
      title: title.trim(),
      body: body.trim() || undefined,
      link: link.trim() || undefined,
    });
  };

  const selectedMember = members.find((m: any) => String(m.id) === selectedUserId);

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
        {/* Recipient + Type row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm">Recipient</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50">
                <SelectValue placeholder={membersLoading ? "Loading team..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    <span className="flex items-center gap-2">
                      <span>{m.name || m.email}</span>
                      <span className="text-xs text-gray-500">#{m.id}</span>
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
                {ALERT_TYPES.map((t) => {
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Action required on order #1042"
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Message Body (optional)</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Additional context or instructions..."
            rows={3}
            className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Link (optional)</Label>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
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
                  const typeInfo = ALERT_TYPES.find((t) => t.value === alertType);
                  const Icon = typeInfo?.icon ?? Info;
                  return <Icon className={`w-4 h-4 ${typeInfo?.color ?? "text-blue-400"}`} />;
                })()}
                <div>
                  <p className="text-sm text-white font-medium">{title}</p>
                  {body && <p className="text-xs text-gray-400 mt-0.5">{body}</p>}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                To: {selectedMember.name || selectedMember.email}
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Send Notification</>
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
    onSuccess: (data) => {
      toast.success(`Demo data seeded: ${data.productsCreated} products, ${data.customersCreated} customers, ${data.ordersCreated} orders`);
      utils.products.list.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
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
            <p className="text-gray-400 text-sm mb-1">Populate your store with sample catalog data to explore the platform features.</p>
            <p className="text-gray-500 text-xs">Creates 6 products (Apparel + Industrial), 3 customers, and 3 orders across different statuses.</p>
          </div>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20 shrink-0"
          >
            {seedMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
              : <><FlaskConical className="w-4 h-4 mr-2" />Load Sample Data</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
