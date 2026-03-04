import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, CreditCard, Users, CheckCircle } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const tenantList = trpc.tenant.list.useQuery();
  const tenant = tenantList.data?.[0];
  const plans = trpc.tenant.getPlans.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");

  const updateTenant = trpc.tenant.update.useMutation({
    onSuccess: () => { toast.success("Settings saved"); utils.tenant.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-gray-400 text-sm mt-1">Manage your store and subscription</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-[#00D9FF]" /> Store Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-gray-300">Store Name</Label><Input value={name || tenant?.name || ""} onChange={e => setName(e.target.value)} placeholder={tenant?.name ?? "Store name"} className="bg-white/5 border-white/10 text-white mt-1" /></div>
            <div><Label className="text-gray-300">Store Slug</Label><Input value={tenant?.slug ?? ""} disabled className="bg-white/5 border-white/10 text-gray-500 mt-1" /><p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation.</p></div>
            <div><Label className="text-gray-300">Status</Label><div className="mt-1"><Badge variant="outline" className={tenant?.status === "active" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}>{tenant?.status ?? "—"}</Badge></div></div>
            <Button onClick={() => tenant && updateTenant.mutate({ id: tenant.id, name: name || tenant.name || "" })} disabled={updateTenant.isPending || !name || !tenant} className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">{updateTenant.isPending ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Users className="w-4 h-4 text-[#6A1B9A]" /> Account</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center text-[#0A1128] font-bold text-sm">{user?.name?.[0]?.toUpperCase() ?? "U"}</div>
              <div><div className="text-white font-medium">{user?.name ?? "—"}</div><div className="text-gray-400 text-sm">{user?.email ?? "—"}</div></div>
              <Badge variant="outline" className="ml-auto border-[#00D9FF]/30 text-[#00D9FF] text-xs capitalize">{user?.role ?? "user"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#10B981]" /> Subscription Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(plans.data ?? []).map((plan: any) => {
              const isCurrent = plan.id === tenant?.planId;
              return (
                <div key={plan.id} className={"rounded-xl p-5 border transition-colors " + (isCurrent ? "border-[#00D9FF]/50 bg-[#00D9FF]/5" : "border-white/10 bg-white/3")}>
                  <div className="flex items-center justify-between mb-2"><h3 className="text-white font-semibold">{plan.name}</h3>{isCurrent && <CheckCircle className="w-4 h-4 text-[#00D9FF]" />}</div>
                  <div className="text-2xl font-bold text-white mb-1">{plan.price === "0" ? "Free" : "$" + Number(plan.price).toFixed(0)}{plan.price !== "0" && <span className="text-gray-400 text-sm font-normal">/mo</span>}</div>
                  <div className="text-gray-400 text-xs space-y-1 mt-3"><div>Up to {plan.maxProducts} products</div><div>Up to {plan.maxOrders} orders/mo</div><div>{plan.maxUsers} team members</div></div>
                  {!isCurrent && <Button size="sm" className="w-full mt-4 border border-white/20 text-white hover:bg-white/5 bg-transparent text-xs" onClick={() => toast.info("Plan upgrade coming soon")}>Upgrade</Button>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
