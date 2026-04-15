import { useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, ArrowRight, CheckCircle2, Shield, Zap, RefreshCw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SCOPES = [
  { label: "Products & Inventory", desc: "Read and write products, variants, inventory levels", icon: "📦" },
  { label: "Orders & Fulfillments", desc: "Sync orders, update fulfillment status, tracking numbers", icon: "🛒" },
  { label: "Customers", desc: "Sync customer profiles and order history", icon: "👤" },
  { label: "Webhooks", desc: "Receive real-time events from your Shopify store", icon: "⚡" },
];

export default function ShopifyInstall() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInstall = () => {
    const raw = shopDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const domain = raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;

    if (!raw || raw.length < 3) {
      setError("Enter your Shopify store name or domain.");
      return;
    }
    setError("");
    setLoading(true);
    // Redirect to the server OAuth install route
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleInstall();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Back to UnifyOne</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Brand header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00D9FF]/10 border border-[#00D9FF]/20 mb-2">
              <ShoppingBag className="w-8 h-8 text-[#00D9FF]" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Connect Your Shopify Store</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Link your Shopify store to UnifyOne to sync products, orders, customers, and inventory in real time.
            </p>
          </div>

          {/* Install card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Enter Your Store Domain</CardTitle>
              <CardDescription>
                Your store name from <span className="text-foreground font-medium">yourstore.myshopify.com</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="your-store-name"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-36 font-mono text-sm"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
                    .myshopify.com
                  </span>
                </div>
                <Button
                  onClick={handleInstall}
                  disabled={loading || !shopDomain.trim()}
                  className="bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-semibold shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Connect <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>⚠</span> {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Shopify to authorize the connection. No credit card required.
              </p>
            </CardContent>
          </Card>

          {/* Permissions preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              <span>UnifyOne will request the following permissions:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCOPES.map((scope) => (
                <div
                  key={scope.label}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/40"
                >
                  <span className="text-xl leading-none mt-0.5">{scope.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{scope.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{scope.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              HMAC-verified webhooks
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Encrypted token storage
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00D9FF]" />
              Real-time sync &lt; 30s latency
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
