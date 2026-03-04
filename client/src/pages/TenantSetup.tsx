import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Layers, ArrowRight, Store } from "lucide-react";

export default function TenantSetup() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: () => {
      toast.success("Store created! Welcome to UnifyOne.");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    createTenant.mutate({ name: name.trim(), slug: slug.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0A1128" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#0284C7] flex items-center justify-center mx-auto mb-4 cyan-glow-sm">
            <Layers className="w-8 h-8 text-[#0A1128]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Store</h1>
          <p className="text-gray-400">Set up your first tenant to get started with UnifyOne.</p>
        </div>
        <div className="glass rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 font-medium">Store Name</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="name" value={name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="My Awesome Store"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#00D9FF]/50" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-gray-300 font-medium">Store Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm whitespace-nowrap">unifyone.app/</span>
                <Input id="slug" value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="my-store" pattern="[a-z0-9-]+"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#00D9FF]/50" required />
              </div>
              <p className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only.</p>
            </div>
            <Button type="submit" disabled={createTenant.isPending || !name || !slug}
              className="w-full bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-bold h-11">
              {createTenant.isPending
                ? <div className="w-4 h-4 border-2 border-[#0A1128] border-t-transparent rounded-full animate-spin" />
                : <><span>Create Store</span><ArrowRight className="ml-2 w-4 h-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
