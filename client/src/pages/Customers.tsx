import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Users, Mail, Phone, MapPin, ShoppingBag,
  DollarSign, Calendar, Edit2, Tag, X, Plus, Loader2,
  ChevronRight, Package,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeTable } from "@/lib/supabaseRealtime";
import { RealtimeStatus } from "@/components/RealtimeStatus";
import { QueryErrorState } from "@/components/QueryErrorState";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [addrLine1, setAddrLine1] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [addrCountry, setAddrCountry] = useState("");

  const utils = trpc.useUtils();

  const customers = trpc.orders.customers.useQuery(
    { search: search || undefined },
    { staleTime: 30_000 }
  );

  const customerOrders = trpc.orders.customerOrders.useQuery(
    { email: selectedCustomer?.email ?? "" },
    { enabled: !!selectedCustomer?.email && showProfile }
  );

  const updateCustomer = trpc.orders.updateCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer updated");
      utils.orders.customers.invalidate();
      setShowEdit(false);
    },
    onError: (e) => toast.error(e.message),
  });

  useRealtimeTable("customers", undefined, () => {
    utils.orders.customers.invalidate();
  });

  function openProfile(c: any) {
    setSelectedCustomer(c);
    setShowProfile(true);
  }

  function openEdit(c: any) {
    setSelectedCustomer(c);
    setFirstName(c.firstName ?? "");
    setLastName(c.lastName ?? "");
    setPhone(c.phone ?? "");
    setTags(c.tags ?? []);
    setAddrLine1(c.address?.line1 ?? "");
    setAddrCity(c.address?.city ?? "");
    setAddrState(c.address?.state ?? "");
    setAddrZip(c.address?.zip ?? "");
    setAddrCountry(c.address?.country ?? "");
    setShowEdit(true);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      toast.error(`Tag "${t}" already exists`);
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter(x => x !== t));
  }

  function handleSave() {
    if (!selectedCustomer) return;
    updateCustomer.mutate({
      id: selectedCustomer.id,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
      tags,
      address: {
        line1: addrLine1 || undefined,
        city: addrCity || undefined,
        state: addrState || undefined,
        zip: addrZip || undefined,
        country: addrCountry || undefined,
      },
    });
  }

  const fullName = (c: any) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">
              {customers.data?.length ?? 0} customer{(customers.data?.length ?? 0) !== 1 ? "s" : ""}
            </p>
            <RealtimeStatus />
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-white/2">
              {["Customer", "Email", "Phone", "Orders", "Total Spent", "Tags", "Joined", ""].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.isError ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <QueryErrorState
                    icon={Users}
                    title="Failed to load customers"
                    message={customers.error?.message}
                    onRetry={() => customers.refetch()}
                    isRetrying={customers.isRefetching}
                    size="sm"
                  />
                </td>
              </tr>
            ) : (customers.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No customers yet</p>
                  <p className="text-gray-500 text-sm mt-1">Customers appear when orders are created</p>
                </td>
              </tr>
            ) : (
              (customers.data ?? []).map((c: any) => (
                <tr
                  key={c.id}
                  className="border-b border-border hover:bg-white/2 transition-colors cursor-pointer"
                  onClick={() => openProfile(c)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View profile for ${fullName(c)}`}
                  onKeyDown={e => e.key === "Enter" && openProfile(c)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D9FF]/20 to-[#6A1B9A]/20 border border-white/10 flex items-center justify-center text-xs font-bold text-[#00D9FF]">
                        {(c.firstName?.[0] ?? c.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-white font-medium text-sm">{fullName(c)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-[#00D9FF]/30 text-[#00D9FF] text-xs">
                      {c.totalOrders ?? 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold text-sm">
                    ${Number(c.totalSpent ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags ?? []).slice(0, 2).map((t: string) => (
                        <Badge key={t} variant="outline" className="border-purple-500/30 text-purple-400 text-xs px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                      {(c.tags ?? []).length > 2 && (
                        <span className="text-gray-500 text-xs">+{c.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                      aria-label={`Edit ${fullName(c)}`}
                      onClick={e => { e.stopPropagation(); openEdit(c); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Profile Modal */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl bg-[#0F172A] border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D9FF]/20 to-[#6A1B9A]/20 border border-white/10 flex items-center justify-center text-sm font-bold text-[#00D9FF]">
                {(selectedCustomer?.firstName?.[0] ?? selectedCustomer?.email?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold">{fullName(selectedCustomer ?? {})}</div>
                <div className="text-gray-400 text-sm font-normal">{selectedCustomer?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: ShoppingBag, label: "Total Orders", value: selectedCustomer.totalOrders ?? 0, color: "#00D9FF" },
                  { icon: DollarSign, label: "Total Spent", value: `$${Number(selectedCustomer.totalSpent ?? 0).toFixed(2)}`, color: "#10B981" },
                  { icon: Calendar, label: "Customer Since", value: new Date(selectedCustomer.createdAt).toLocaleDateString(), color: "#6A1B9A" },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      <span className="text-gray-400 text-xs">{s.label}</span>
                    </div>
                    <div className="text-white font-bold text-lg">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Contact</h4>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-300">{selectedCustomer.email}</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-300">{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.address?.line1 && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                      <span className="text-gray-300">
                        {selectedCustomer.address.line1}
                        {selectedCustomer.address.city && `, ${selectedCustomer.address.city}`}
                        {selectedCustomer.address.state && `, ${selectedCustomer.address.state}`}
                        {selectedCustomer.address.zip && ` ${selectedCustomer.address.zip}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {(selectedCustomer.tags ?? []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.tags.map((t: string) => (
                      <Badge key={t} variant="outline" className="border-purple-500/30 text-purple-400">
                        <Tag className="w-3 h-3 mr-1" />{t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Separator className="bg-white/10" />
              <div className="space-y-2">
                <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Order History</h4>
                {customerOrders.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
                  </div>
                ) : (customerOrders.data ?? []).length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(customerOrders.data ?? []).map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-white text-sm font-medium">{o.orderNumber}</div>
                            <div className="text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-xs ${
                            o.status === "delivered" ? "text-emerald-400 border-emerald-500/30" :
                            o.status === "shipped" ? "text-cyan-400 border-cyan-500/30" :
                            o.status === "cancelled" ? "text-red-400 border-red-500/30" :
                            "text-amber-400 border-amber-500/30"
                          }`}>{o.status}</Badge>
                          <span className="text-white font-semibold text-sm">${Number(o.total).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfile(false)} className="border-white/10 text-gray-300">Close</Button>
            <Button onClick={() => { setShowProfile(false); openEdit(selectedCustomer); }}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg bg-[#0F172A] border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)}
                className="bg-white/5 border-white/10 text-white" placeholder="+1 (555) 000-0000" />
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Address</Label>
              <Input value={addrLine1} onChange={e => setAddrLine1(e.target.value)}
                className="bg-white/5 border-white/10 text-white" placeholder="Street address" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={addrCity} onChange={e => setAddrCity(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" placeholder="City" />
                <Input value={addrState} onChange={e => setAddrState(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" placeholder="State" />
                <Input value={addrZip} onChange={e => setAddrZip(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" placeholder="ZIP" />
              </div>
              <Input value={addrCountry} onChange={e => setAddrCountry(e.target.value)}
                className="bg-white/5 border-white/10 text-white" placeholder="Country (e.g. US)" />
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="bg-white/5 border-white/10 text-white flex-1"
                  placeholder="Add a tag and press Enter" />
                <Button type="button" variant="outline" size="sm" onClick={addTag}
                  className="border-white/10 text-gray-300 hover:text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <Badge key={t} variant="outline" className="border-purple-500/30 text-purple-400 pr-1">
                      {t}
                      <button onClick={() => removeTag(t)} className="ml-1 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-white/10 text-gray-300">Cancel</Button>
            <Button onClick={handleSave} disabled={updateCustomer.isPending}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
              {updateCustomer.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
