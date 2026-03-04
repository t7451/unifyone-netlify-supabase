import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Globe, Workflow, CheckCircle, XCircle, Clock } from "lucide-react";

const WS: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  pending: "bg-amber-500/20 text-amber-400",
};

export default function Integrations() {
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [n8nUrl, setN8nUrl] = useState("");
  const utils = trpc.useUtils();

  // Use correct procedure names from integrations router
  const intStatus = trpc.integrations.status.useQuery();

  const shopifyConnect = trpc.integrations.shopifyConnect.useMutation({
    onSuccess: () => { toast.success("Shopify connected"); setShopifyDomain(""); setShopifyToken(""); utils.integrations.status.invalidate(); },
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
  const stripeCheckout = trpc.integrations.stripeCreateCheckout.useMutation({
    onSuccess: (data: any) => { if (data?.url) window.open(data.url, "_blank"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400 text-sm mt-1">Connect your external services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stripe */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#635BFF20" }}>
                <Zap className="w-4 h-4" style={{ color: "#635BFF" }} />
              </div>
              Stripe
              {intStatus.data?.stripe?.connected && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-400 text-sm">Payments, subscriptions, and billing automation.</p>
            {intStatus.data?.stripe?.connected ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">Stripe is connected</div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs">Configure via the Subscription Plans in Settings, or use the checkout flow.</p>
                <Button onClick={() => stripeCheckout.mutate({ planSlug: "pro" })} disabled={stripeCheckout.isPending}
                  className="w-full font-semibold text-sm" style={{ backgroundColor: "#635BFF", color: "#fff" }}>
                  {stripeCheckout.isPending ? "Loading..." : "Start Stripe Checkout"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopify */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#96BF4820" }}>
                <Globe className="w-4 h-4" style={{ color: "#96BF48" }} />
              </div>
              Shopify
              {intStatus.data?.shopify?.connected && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-400 text-sm">Sync products and orders with your Shopify store.</p>
            {intStatus.data?.shopify?.connected ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                Connected to {intStatus.data.shopify.shopDomain}
              </div>
            ) : (
              <>
                <div><Label className="text-gray-300 text-xs">Store Domain</Label><Input value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} placeholder="mystore.myshopify.com" className="bg-white/5 border-white/10 text-white mt-1 text-sm" /></div>
                <div><Label className="text-gray-300 text-xs">Access Token</Label><Input type="password" value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} placeholder="shpat_..." className="bg-white/5 border-white/10 text-white mt-1 text-sm" /></div>
                <Button onClick={() => shopifyConnect.mutate({ shopDomain: shopifyDomain, accessToken: shopifyToken })} disabled={shopifyConnect.isPending || !shopifyDomain || !shopifyToken}
                  className="w-full font-semibold text-sm" style={{ backgroundColor: "#96BF48", color: "#fff" }}>
                  {shopifyConnect.isPending ? "Connecting..." : "Connect Shopify"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* n8n */}
        <Card className="bg-card border-border">
          <CardHeader>
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
            <div><Label className="text-gray-300 text-xs">Webhook URL</Label><Input value={n8nUrl || intStatus.data?.n8n?.webhookUrl || ""} onChange={e => setN8nUrl(e.target.value)} placeholder="https://n8n.example.com/webhook/..." className="bg-white/5 border-white/10 text-white mt-1 text-sm" /></div>
            <div className="flex gap-2">
              <Button onClick={() => n8nUpdate.mutate({ webhookUrl: n8nUrl })} disabled={n8nUpdate.isPending || !n8nUrl}
                className="flex-1 font-semibold text-sm" style={{ backgroundColor: "#EA4B71", color: "#fff" }}>
                {n8nUpdate.isPending ? "Saving..." : "Save URL"}
              </Button>
              <Button onClick={() => n8nTrigger.mutate({ event: "test", payload: { test: true } })} disabled={n8nTrigger.isPending || !intStatus.data?.n8n?.configured}
                variant="outline" className="flex-1 text-sm border-white/10 text-white">
                {n8nTrigger.isPending ? "..." : "Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status Summary */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-base">Integration Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Stripe", key: "stripe", color: "#635BFF", icon: Zap, connected: intStatus.data?.stripe?.connected },
              { name: "Shopify", key: "shopify", color: "#96BF48", icon: Globe, connected: intStatus.data?.shopify?.connected },
              { name: "n8n", key: "n8n", color: "#EA4B71", icon: Workflow, connected: intStatus.data?.n8n?.configured },
            ].map(s => (
              <div key={s.key} className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "20" }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{s.name}</div>
                  <Badge variant="outline" className={s.connected ? "border-emerald-500/30 text-emerald-400 text-xs mt-0.5" : "border-gray-600 text-gray-500 text-xs mt-0.5"}>
                    {s.connected ? "Connected" : "Not configured"}
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
