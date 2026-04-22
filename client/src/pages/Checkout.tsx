import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard, Loader2, CheckCircle, ArrowLeft, ExternalLink,
  ShoppingBag, Zap, Shield, AlertCircle
} from "lucide-react";

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["1 tenant", "Up to 100 products", "500 orders/mo", "2 team members", "Core analytics"],
  pro: ["5 tenants", "Unlimited products", "5,000 orders/mo", "10 team members", "Advanced analytics", "Manus AI insights", "Full automation layer"],
  scale: ["Unlimited tenants", "Unlimited products", "Unlimited orders", "Unlimited team members", "White-label support", "Priority support"],
};

type PlanSlug = "starter" | "pro" | "scale";
type PaymentRail = "stripe" | "paypal" | "shopify" | "square";

export default function Checkout() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const { user } = useAuth();
  const [selectedRail, setSelectedRail] = useState<PaymentRail>("stripe");
  const [amount, setAmount] = useState("29.00");
  const [description, setDescription] = useState("UnifyOne Pro Subscription");
  const [linkedOrderId, setLinkedOrderId] = useState<number | null>(null);
  const [planSlug, setPlanSlug] = useState<PlanSlug | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const markOrderPaid = trpc.orders.updateStatus.useMutation();
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRef = useRef<any>(null);

  const intStatus = trpc.integrations.status.useQuery();
  const shopifyCheckoutUrl = intStatus.data?.shopifyCheckoutUrl;
  const paypalConfigured = intStatus.data?.paypal?.configured;

  // Fetch plans when plan slug is present
  const plansQuery = trpc.subscription.getPlans.useQuery(undefined, {
    enabled: !!planSlug,
  });
  const activePlan = planSlug
    ? (plansQuery.data ?? []).find((p: any) => p.slug === planSlug) ?? null
    : null;

  const createSubscriptionCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to Stripe Checkout…");
        window.location.href = data.url;
      } else {
        toast.error("Checkout session created but no URL returned.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Parse query params for pre-filled amount/description
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    if (params.get("amount")) setAmount(params.get("amount")!);
    if (params.get("desc")) setDescription(params.get("desc")!);
    if (params.get("orderId")) setLinkedOrderId(parseInt(params.get("orderId")!, 10));
    const planParam = params.get("plan");
    if (planParam && (["starter", "pro", "scale"] as PlanSlug[]).includes(planParam as PlanSlug)) {
      setPlanSlug(planParam as PlanSlug);
    }
    // Check for PayPal return
    if (params.get("paypal_return") === "1") {
      toast.success("Payment approved! Processing your order...");
    }
    if (params.get("paypal_cancel") === "1") {
      toast.info("PayPal payment was cancelled.");
    }
  }, [searchStr]);

  // Load PayPal JS SDK when PayPal rail is selected
  useEffect(() => {
    if (selectedRail !== "paypal") return;
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) return;

    const existingScript = document.getElementById("paypal-sdk");
    if (existingScript) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    document.body.appendChild(script);
  }, [selectedRail]);

  // Render PayPal Smart Buttons when SDK is loaded
  useEffect(() => {
    if (!paypalLoaded || selectedRail !== "paypal" || !paypalContainerRef.current) return;
    const win = window as any;
    if (!win.paypal) return;

    // Clean up previous buttons
    if (paypalButtonsRef.current) {
      paypalButtonsRef.current.close?.();
    }
    if (paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = "";
    }

    const buttons = win.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "blue",
        shape: "rect",
        label: "pay",
        height: 48,
      },
      createOrder: async () => {
        setIsProcessing(true);
        try {
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: parseFloat(amount),
              currency: "USD",
              description,
              origin: window.location.origin,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          return data.orderId;
        } catch (err: any) {
          toast.error(`PayPal error: ${err.message}`);
          setIsProcessing(false);
          throw err;
        }
      },
      onApprove: async (data: any) => {
        try {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          toast.success(`Payment of $${result.amount} captured successfully!`);
          // Auto-mark linked order as paid
          if (linkedOrderId) {
            await markOrderPaid.mutateAsync({ id: linkedOrderId, status: "processing", paymentStatus: "paid" }).catch(() => {});
            navigate(`/orders?paid=${linkedOrderId}`);
          } else {
            navigate("/dashboard?payment=success");
          }
        } catch (err: any) {
          toast.error(`Capture failed: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error("[PayPal] Error:", err);
        toast.error("PayPal encountered an error. Please try again.");
        setIsProcessing(false);
      },
      onCancel: () => {
        toast.info("PayPal payment cancelled.");
        setIsProcessing(false);
      },
    });

    if (paypalContainerRef.current) {
      buttons.render(paypalContainerRef.current);
      paypalButtonsRef.current = buttons;
    }
    // linkedOrderId, markOrderPaid, navigate are referenced inside PayPal callbacks
    // but should not trigger a PayPal button re-render when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypalLoaded, selectedRail, amount, description]);

  const handleSquareCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: "USD",
          description,
          orderId: linkedOrderId,
          origin: window.location.origin,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.info("Redirecting to Square Checkout...");
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      toast.error(`Square error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "price_unifyone_pro_monthly",
          tenantId: user?.tenantId,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          origin: window.location.origin,
          amount: parseFloat(amount),
          description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.info("Redirecting to Stripe Checkout...");
      // Pass orderId in Stripe success URL so webhook can mark it paid
      window.open(data.url, "_blank");
      // Optimistically mark as pending payment if linked to an order
      if (linkedOrderId) {
        await markOrderPaid.mutateAsync({ id: linkedOrderId, status: "processing", paymentStatus: "pending" }).catch(() => {});
      }
    } catch (err: any) {
      toast.error(`Stripe error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShopifyCheckout = () => {
    if (!shopifyCheckoutUrl) {
      toast.error("Shopify checkout URL not configured. Go to Integrations → Shopify to set it.");
      return;
    }
    toast.info("Opening your Shopify store...");
    window.open(shopifyCheckoutUrl, "_blank");
  };

  const RAILS = [
    {
      id: "stripe" as PaymentRail,
      name: "Credit / Debit Card",
      description: "Visa, Mastercard, Amex — powered by Stripe",
      icon: CreditCard,
      color: "#635BFF",
      badge: "Most Popular",
      available: true,
    },
    {
      id: "paypal" as PaymentRail,
      name: "PayPal",
      description: "Pay with your PayPal balance, bank, or card",
      icon: null,
      color: "#003087",
      badge: paypalConfigured ? "Live" : "Configure",
      available: !!paypalConfigured,
    },
    {
      id: "shopify" as PaymentRail,
      name: "Shopify Store",
      description: "Complete purchase through your Shopify storefront",
      icon: ShoppingBag,
      color: "#96BF48",
      badge: shopifyCheckoutUrl ? "Configured" : "Setup Required",
      available: !!shopifyCheckoutUrl,
    },
    {
      id: "square" as PaymentRail,
      name: "Square",
      description: "Pay with card via Square hosted checkout",
      icon: CreditCard,
      color: "#3E4348",
      badge: "Available",
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1128] flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#635BFF]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(planSlug ? "/" : "/dashboard")}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Checkout</h1>
            <p className="text-gray-500 text-xs">
              {planSlug ? "Start your subscription" : "Choose your payment method"}
            </p>
          </div>
        </div>

        {/* ── Plan Subscription Flow ──────────────────────────────────────── */}
        {planSlug && (
          <div className="space-y-4">
            {/* Plan summary card */}
            <div className="glass rounded-2xl p-5 border border-[#00D9FF]/20">
              {plansQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32 bg-white/10" />
                  <Skeleton className="h-8 w-20 bg-white/10" />
                  <Skeleton className="h-4 w-full bg-white/10" />
                </div>
              ) : activePlan ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Selected Plan</p>
                      <p className="text-white text-xl font-bold">{activePlan.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00D9FF] text-2xl font-bold">
                        ${Number(activePlan.priceMonthly ?? 0).toFixed(0)}
                      </p>
                      <p className="text-gray-500 text-xs">/ month</p>
                    </div>
                  </div>
                  {(PLAN_FEATURES[planSlug] ?? []).length > 0 && (
                    <ul className="space-y-1.5 mt-4">
                      {(PLAN_FEATURES[planSlug] ?? []).map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm">Plan "{planSlug}" not found. Please go back and select a plan.</p>
              )}
            </div>

            {/* Subscribe CTA */}
            {activePlan && (
              <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <Shield className="w-3.5 h-3.5 text-[#635BFF]" />
                  <span>Secured by Stripe — Cancel anytime, no lock-in</span>
                </div>
                <Button
                  className="w-full h-12 font-bold text-white"
                  style={{ backgroundColor: "#635BFF" }}
                  disabled={createSubscriptionCheckout.isPending}
                  onClick={() =>
                    createSubscriptionCheckout.mutate({
                      planSlug,
                      billingPeriod: "monthly",
                      origin: window.location.origin,
                    })
                  }
                >
                  {createSubscriptionCheckout.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating session…</>
                    : <><CreditCard className="w-4 h-4 mr-2" />Subscribe — ${Number(activePlan.priceMonthly ?? 0).toFixed(0)}/mo</>}
                </Button>
                <p className="text-gray-600 text-xs text-center">
                  You'll be redirected to Stripe's secure checkout. Test card: 4242 4242 4242 4242
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-2">
              {["SSL Encrypted", "PCI Compliant", "Cancel Anytime"].map(item => (
                <div key={item} className="flex items-center gap-1 text-gray-600 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Order / One-time Payment Flow ──────────────────────────────── */}
        {!planSlug && (<>
        <div className="glass rounded-2xl p-5 border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">Order Summary</span>
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs">
              <Zap className="w-2.5 h-2.5 mr-1" />
              Instant Access
            </Badge>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-semibold">{description}</p>
              <p className="text-gray-500 text-xs mt-0.5">UnifyOne Commerce Platform</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Amount</span>
                <Input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-24 h-7 text-right bg-white/5 border-white/10 text-white text-sm font-bold p-1"
                  placeholder="29.00"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">USD</p>
            </div>
          </div>
        </div>

        {/* Payment Rail Selector */}
        <div className="space-y-2 mb-4">
          {RAILS.map(rail => {
            const Icon = rail.icon;
            const isSelected = selectedRail === rail.id;
            return (
              <button
                key={rail.id}
                type="button"
                onClick={() => rail.available && setSelectedRail(rail.id)}
                className={`w-full text-left rounded-xl p-4 border transition-all duration-200 ${
                  !rail.available
                    ? "border-white/5 bg-white/2 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "border-[#00D9FF]/50 bg-[#00D9FF]/5 shadow-lg shadow-[#00D9FF]/5"
                    : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: rail.color + "20", border: `1px solid ${rail.color}30` }}
                  >
                    {Icon ? (
                      <Icon className="w-4 h-4" style={{ color: rail.color }} />
                    ) : (
                      <span className="text-xs font-bold" style={{ color: rail.color }}>PP</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{rail.name}</span>
                      <Badge
                        className="text-[10px] px-1.5 py-0"
                        style={{
                          backgroundColor: rail.available ? rail.color + "20" : "rgba(255,255,255,0.05)",
                          color: rail.available ? rail.color : "#6B7280",
                          border: `1px solid ${rail.available ? rail.color + "30" : "rgba(255,255,255,0.1)"}`,
                        }}
                      >
                        {rail.badge}
                      </Badge>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{rail.description}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    isSelected && rail.available ? "border-[#00D9FF] bg-[#00D9FF]" : "border-white/20"
                  }`}>
                    {isSelected && rail.available && <div className="w-1.5 h-1.5 rounded-full bg-[#0A1128]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Payment Action Area */}
        <div className="glass rounded-2xl p-5 border border-white/10">
          {selectedRail === "stripe" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                <Shield className="w-3.5 h-3.5 text-[#635BFF]" />
                <span>Secured by Stripe — PCI DSS Level 1 compliant</span>
              </div>
              <Button
                onClick={handleStripeCheckout}
                disabled={isProcessing || !amount}
                className="w-full h-12 font-bold text-white"
                style={{ backgroundColor: "#635BFF" }}
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  : <><CreditCard className="w-4 h-4 mr-2" />Pay ${amount} with Card</>}
              </Button>
              <p className="text-gray-600 text-xs text-center">
                You'll be redirected to Stripe's secure checkout. Test card: 4242 4242 4242 4242
              </p>
            </div>
          )}

          {selectedRail === "paypal" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                <Shield className="w-3.5 h-3.5 text-[#003087]" />
                <span>Secured by PayPal — Buyer Protection included</span>
              </div>
              {paypalConfigured ? (
                <>
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 py-3 text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing payment...
                    </div>
                  )}
                  <div ref={paypalContainerRef} className="min-h-[50px]">
                    {!paypalLoaded && (
                      <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading PayPal...
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs text-center mt-2">
                    By clicking PayPal, you authorize this purchase. PayPal Buyer Protection applies.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 text-sm font-medium">PayPal not configured</p>
                    <p className="text-amber-400/70 text-xs mt-0.5">
                      Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Settings → Secrets to enable PayPal payments.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedRail === "shopify" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                <Shield className="w-3.5 h-3.5 text-[#96BF48]" />
                <span>Processed through your Shopify storefront</span>
              </div>
              {shopifyCheckoutUrl ? (
                <>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-gray-400 text-xs mb-1">Checkout URL</p>
                    <p className="text-white text-sm font-mono truncate">{shopifyCheckoutUrl}</p>
                  </div>
                  <Button
                    onClick={handleShopifyCheckout}
                    className="w-full h-12 font-bold text-white"
                    style={{ backgroundColor: "#96BF48" }}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Open Shopify Store
                    <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
                  </Button>
                  <p className="text-gray-600 text-xs text-center">
                    Opens your Shopify store in a new tab. Payment is processed by Shopify.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 text-sm font-medium">Shopify checkout URL not set</p>
                      <p className="text-amber-400/70 text-xs mt-0.5">
                        Go to Integrations → Shopify and paste your store's checkout or product URL.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard/integrations")}
                    className="w-full border border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Go to Integrations
                  </Button>
                </div>
              )}
            </div>
          )}

          {selectedRail === "square" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                <Shield className="w-3.5 h-3.5 text-[#3E4348]" />
                <span>Secured by Square — PCI DSS compliant payment processing</span>
              </div>
              <Button
                onClick={handleSquareCheckout}
                disabled={isProcessing || !amount}
                className="w-full h-12 font-bold text-white"
                style={{ backgroundColor: "#3E4348" }}
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  : <><CreditCard className="w-4 h-4 mr-2" />Pay ${amount} with Square</>}
              </Button>
              <p className="text-gray-600 text-xs text-center">
                You'll be redirected to Square's secure hosted checkout page.
              </p>
            </div>
          )}
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {["SSL Encrypted", "PCI Compliant", "Fraud Protected"].map(item => (
            <div key={item} className="flex items-center gap-1 text-gray-600 text-xs">
              <CheckCircle className="w-3 h-3" />
              {item}
            </div>
          ))}
        </div>
        </>)}
      </div>
    </div>
  );
}
