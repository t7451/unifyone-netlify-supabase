import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  ArrowRight,
  BarChart2,
  Package,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ShopifySuccess() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const shop = params.get("shop") || "your store";

  useEffect(() => {
    document.title = "Store Connected — UnifyOne";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Store Connected!
          </h1>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{shop}</span> is now
            linked to UnifyOne. Your products, orders, and customers will begin
            syncing shortly.
          </p>
        </div>

        {/* Next steps */}
        <div className="grid grid-cols-1 gap-3 text-left">
          {[
            {
              icon: Package,
              label: "View Products",
              href: "/products",
              desc: "Browse synced products and inventory",
            },
            {
              icon: ShoppingCart,
              label: "View Orders",
              href: "/orders",
              desc: "Monitor incoming Shopify orders",
            },
            {
              icon: BarChart2,
              label: "Sync Monitor",
              href: "/sync-monitor",
              desc: "Track sync health and latency",
            },
          ].map(({ icon: Icon, label, href, desc }) => (
            <Link key={href} href={href}>
              <Card className="border-border/40 hover:border-[#D4A843]/40 hover:bg-card/80 transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-[#D4A843]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#D4A843]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Button
          asChild
          className="w-full bg-[#D4A843] hover:bg-[#B8863B] text-black font-semibold"
        >
          <Link href="/integrations">Go to Integrations Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
