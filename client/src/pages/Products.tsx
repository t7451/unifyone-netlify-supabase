import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Package, Edit, Trash2, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  archived: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", sku: "", status: "draft" as "active"|"draft"|"archived", initialStock: "0" });
  const utils = trpc.useUtils();

  const products = trpc.products.list.useQuery({ search: search || undefined });
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("Product created"); setOpen(false); setForm({ name: "", price: "", sku: "", status: "draft", initialStock: "0" }); utils.products.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success("Product deleted"); utils.products.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-1">{products.data?.length ?? 0} products in catalog</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0F172A] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label className="text-gray-300">Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Product name" className="bg-white/5 border-white/10 text-white mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-300">Price *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="0.00" className="bg-white/5 border-white/10 text-white mt-1" /></div>
                <div><Label className="text-gray-300">SKU</Label>
                  <Input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="SKU-001" className="bg-white/5 border-white/10 text-white mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-gray-300">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v as any}))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0F172A] border-white/10"><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                  </Select></div>
                <div><Label className="text-gray-300">Initial Stock</Label>
                  <Input type="number" value={form.initialStock} onChange={e => setForm(f => ({...f, initialStock: e.target.value}))} className="bg-white/5 border-white/10 text-white mt-1" /></div>
              </div>
              <Button onClick={() => createProduct.mutate({ name: form.name, price: Number(form.price), sku: form.sku || undefined, status: form.status, initialStock: Number(form.initialStock) })}
                disabled={createProduct.isPending || !form.name || !form.price}
                className="w-full bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold">
                {createProduct.isPending ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 max-w-sm" />
      </div>

      {products.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (products.data ?? []).length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No products yet</p>
          <p className="text-gray-500 text-sm mt-1">Add your first product to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products.data ?? []).map((p: any) => (
            <Card key={p.id} className="bg-card border-border hover:border-[#00D9FF]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{p.name}</h3>
                    {p.sku && <p className="text-gray-500 text-xs mt-0.5">{p.sku}</p>}
                  </div>
                  <Badge variant="outline" className={`ml-2 text-xs ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</Badge>
                </div>
                <div className="text-2xl font-bold text-[#00D9FF] mb-3">${Number(p.price).toFixed(2)}</div>
                {p.inventory && (
                  <div className={`flex items-center gap-1 text-xs mb-3 ${p.inventory.quantity <= p.inventory.lowStockThreshold ? "text-amber-400" : "text-gray-400"}`}>
                    {p.inventory.quantity <= p.inventory.lowStockThreshold && <AlertTriangle className="w-3 h-3" />}
                    {p.inventory.quantity} in stock
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1 text-gray-400 hover:text-white border border-white/10 hover:border-white/20" onClick={() => toast.info("Edit coming soon")}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40"
                    onClick={() => deleteProduct.mutate({ id: p.id })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
