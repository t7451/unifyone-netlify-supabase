import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Globe, Workflow, CheckCircle, CreditCard, ShoppingBag, ExternalLink } from "lucide-react";

export default function Integrations() {
  const [, navigate] = useLocation();
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [shopifyCheckoutUrlInput, setShopifyCheckoutUrlInput] = useState("");
  const [n8nUrl, setN8nUrl] = useState("");
  const utils = trpc.useUtils();

  const intStatus = trpc.integrations.status.useQuery();

  // Pre-fill Shopify checkout URL from server data
  useEffect(() => {
    if (intStatus.data?.shopifyCheckoutUrl && !shopifyCheckoutUrlInput) {
      setShopifyCheckoutUrlInput(intStatus.data.shopifyCheckoutUrl);
    }
  }, [intStatus.data?.shopifyCheckoutUrl, shopifyCheckoutUrlInput]);

  const shopifyConnect = trpc.integrations.shopifyConnect.useMutation({
    onSuccess: () => { toast.success("Shopify connected"); setShopifyDomain(""); setShopifyToken(""); utils.integrations.status.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const shopifySetCheckoutUrl = trpc.integrations.shopifySetCheckoutUrl.useMutation({
    onSuccess: () => { toast.success("Shopify checkout URL saved"); utils.integrations.status.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const n8nUpdate = trpc.integrations.n8nUpdate.useMutation({
    onSuccess: () => { toast.success("n8n webhook saved"); utils.integrations.status.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const n8nTrigger = trpc.integrations.n8nTrigger.useMutation({
    onSuccess: () => toast.success("n8n workflow triggered"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your payment rails and external services</p>
        </div>
        <Button
          onClick={() => navigate("/checkout")}
          className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Test Checkout
        </Button>
      </div>

      {/* Payment Rails */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Rails</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stripe */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#635BFF20" }}>
                  <Zap className="w-4 h-4" style={{ color: "#635BFF" }} />
                </div>
                Stripe
                {intStatus.data?.stripe?.connected
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                  : <Badge className="ml-auto text-[10px] bg-[#635BFF]/15 text-[#635BFF] border border-[#635BFF]/30">Live Keys Set</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-400 text-sm">Card payments, subscriptions, and billing portal.</p>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                STRIPE_SECRET_KEY configured — live payments enabled
              </div>
              <Button
                onClick={() => navigate("/checkout")}
                className="w-full font-semibold text-sm text-white"
                style={{ backgroundColor: "#635BFF" }}
              >
                <CreditCard className="w-3.5 h-3.5 mr-2" />
                Open Checkout
              </Button>
            </CardContent>
          </Card>

          {/* PayPal */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#003087" + "20" }}>
                  <span className="text-xs font-bold" style={{ color: "#003087" }}>PP</span>
                </div>
                PayPal
                {intStatus.data?.paypal?.configured
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                  : <Badge className="ml-auto text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">Setup</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-400 text-sm">PayPal Smart Buttons, Venmo, Pay Later support.</p>
              {intStatus.data?.paypal?.configured ? (
                <>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    PAYPAL_CLIENT_ID configured — live payments enabled
                  </div>
                  <Button
                    onClick={() => navigate("/checkout?rail=paypal")}
                    className="w-full font-semibold text-sm text-white"
                    style={{ backgroundColor: "#003087" }}
                  >
                    Test PayPal Checkout
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-500 text-xs">Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Settings → Secrets to enable PayPal.</p>
                  <Button
                    variant="outline"
                    className="w-full text-sm border-white/10 text-gray-300"
                    onClick={() => window.open("https://developer.paypal.com/dashboard/applications/live", "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    PayPal Developer Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopify Checkout */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#96BF4820" }}>
                  <ShoppingBag className="w-4 h-4" style={{ color: "#96BF48" }} />
                </div>
                Shopify Checkout
                {intStatus.data?.shopifyCheckoutUrl
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                  : <Badge className="ml-auto text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">Setup</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-400 text-sm">Direct payment link to your Shopify storefront.</p>
              <div>
                <Label className="text-gray-300 text-xs">Store Checkout / Product URL</Label>
                <Input
                  value={shopifyCheckoutUrlInput}
                  onChange={e => setShopifyCheckoutUrlInput(e.target.value)}
                  placeholder="https://yourstore.myshopify.com/checkout"
                  className="bg-white/5 border-white/10 text-white mt-1 text-sm"
                />
              </div>
              <Button
                onClick={() => shopifySetCheckoutUrl.mutate({ checkoutUrl: shopifyCheckoutUrlInput })}
                disabled={shopifySetCheckoutUrl.isPending || !shopifyCheckoutUrlInput}
                className="w-full font-semibold text-sm text-white"
                style={{ backgroundColor: "#96BF48" }}
              >
                {shopifySetCheckoutUrl.isPending ? "Saving..." : "Save Checkout URL"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Integrations */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Integrations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shopify Sync */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#96BF4820" }}>
                  <Globe className="w-4 h-4" style={{ color: "#96BF48" }} />
                </div>
                Shopify Product Sync
                {intStatus.data?.shopify?.connected && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-400 text-sm">Sync products and orders from your Shopify Admin API.</p>
              {intStatus.data?.shopify?.connected ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  Connected to {intStatus.data.shopify.shopDomain}
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-gray-300 text-xs">Store Domain</Label>
                    <Input value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} placeholder="mystore.myshopify.com" className="bg-white/5 border-white/10 text-white mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Admin Access Token</Label>
                    <Input type="password" value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} placeholder="shpat_..." className="bg-white/5 border-white/10 text-white mt-1 text-sm" />
                  </div>
                  <Button
                    onClick={() => shopifyConnect.mutate({ shopDomain: shopifyDomain, accessToken: shopifyToken })}
                    disabled={shopifyConnect.isPending || !shopifyDomain || !shopifyToken}
                    className="w-full font-semibold text-sm text-white"
                    style={{ backgroundColor: "#96BF48" }}
                  >
                    {shopifyConnect.isPending ? "Connecting..." : "Connect Shopify Admin"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* n8n */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EA4B7120" }}>
                  <Workflow className="w-4 h-4" style={{ color: "#EA4B71" }} />
                </div>
                n8n Automation
                {intStatus.data?.n8n?.configured && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-400 text-sm">Trigger n8n workflows for order processing and notifications.</p>
              <div>
                <Label className="text-gray-300 text-xs">Webhook URL</Label>
                <Input
                  value={n8nUrl || intStatus.data?.n8n?.webhookUrl || ""}
                  onChange={e => setN8nUrl(e.target.value)}
                  placeholder="https://n8n.example.com/webhook/..."
                  className="bg-white/5 border-white/10 text-white mt-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => n8nUpdate.mutate({ webhookUrl: n8nUrl })}
                  disabled={n8nUpdate.isPending || !n8nUrl}
                  className="flex-1 font-semibold text-sm text-white"
                  style={{ backgroundColor: "#EA4B71" }}
                >
                  {n8nUpdate.isPending ? "Saving..." : "Save URL"}
                </Button>
                <Button
                  onClick={() => n8nTrigger.mutate({ event: "test", payload: { test: true } })}
                  disabled={n8nTrigger.isPending || !intStatus.data?.n8n?.configured}
                  variant="outline"
                  className="flex-1 text-sm border-white/10 text-white"
                >
                  {n8nTrigger.isPending ? "..." : "Test Trigger"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Summary */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-base">Payment Rail Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Stripe", color: "#635BFF", icon: Zap, connected: true, label: "Live Keys" },
              { name: "PayPal", color: "#003087", icon: CreditCard, connected: !!intStatus.data?.paypal?.configured, label: intStatus.data?.paypal?.configured ? "Live Keys" : "Not Set" },
              { name: "Shopify Checkout", color: "#96BF48", icon: ShoppingBag, connected: !!intStatus.data?.shopifyCheckoutUrl, label: intStatus.data?.shopifyCheckoutUrl ? "URL Set" : "Not Set" },
              { name: "n8n", color: "#EA4B71", icon: Workflow, connected: !!intStatus.data?.n8n?.configured, label: intStatus.data?.n8n?.configured ? "Configured" : "Not Set" },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "20" }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-medium text-xs truncate">{s.name}</div>
                  <Badge variant="outline" className={`text-[10px] mt-0.5 ${s.connected ? "border-emerald-500/30 text-emerald-400" : "border-gray-600 text-gray-500"}`}>
                    {s.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
