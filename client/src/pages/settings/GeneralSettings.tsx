import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Loader2,
  Image,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function GeneralSettings() {
  const tenantList = trpc.tenant.list.useQuery();
  const tenant = tenantList.data?.[0];
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(false);

  const updateTenant = trpc.tenant.update.useMutation({
    onSuccess: () => {
      toast.success("Store settings saved");
      setName("");
      setDomain("");
      setLogoUrl("");
      utils.tenant.list.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!tenant) return;
    const data: Record<string, unknown> = { id: tenant.id };
    if (name) data.name = name;
    if (domain) data.domain = domain;
    if (logoUrl) data.logoUrl = logoUrl;
    if (!name && !domain && !logoUrl) {
      toast.info("No changes to save");
      return;
    }
    updateTenant.mutate(data as Parameters<typeof updateTenant.mutate>[0]);
  };

  const copySlug = () => {
    if (tenant?.slug) {
      navigator.clipboard.writeText(tenant.slug);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Store Identity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00D9FF]" />
              Store Identity
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your store name and identifier used across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Store Name</Label>
              <Input
                value={name || tenant?.name || ""}
                onChange={e => setName(e.target.value)}
                placeholder={tenant?.name ?? "Your store name"}
                className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Store Slug</Label>
              <div className="flex gap-2">
                <Input
                  value={tenant?.slug ?? ""}
                  disabled
                  className="bg-white/5 border-white/10 text-gray-500"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 border border-white/10 hover:bg-white/5"
                  onClick={copySlug}
                >
                  {copiedSlug ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Slug cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Status</Label>
              <div>
                <Badge
                  variant="outline"
                  className={
                    tenant?.status === "active"
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-amber-500/30 text-amber-400"
                  }
                >
                  {tenant?.status ?? "loading..."}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain & Branding */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00D9FF]" />
              Domain & Branding
            </CardTitle>
            <CardDescription className="text-gray-400">
              Custom domain and visual identity for your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Custom Domain</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={domain || tenant?.domain || ""}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="shop.yourdomain.com"
                  className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
                />
                {tenant?.domain && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() =>
                      window.open(`https://${tenant.domain}`, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Point your domain's CNAME to unifyone.app to use a custom
                domain.
              </p>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Logo URL</Label>
              <Input
                value={logoUrl || tenant?.logoUrl || ""}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
              />
              {(logoUrl || tenant?.logoUrl) && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 inline-flex items-center gap-3">
                  <Image className="w-4 h-4 text-gray-500" />
                  {(() => {
                    const rawSrc = logoUrl || tenant?.logoUrl;
                    const safeSrc =
                      rawSrc && /^https?:\/\//i.test(rawSrc) ? rawSrc : undefined;
                    return safeSrc ? (
                      <img
                        src={safeSrc}
                        alt="Store logo"
                        className="h-10 w-10 object-contain rounded"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateTenant.isPending || (!name && !domain && !logoUrl)}
            className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
          >
            {updateTenant.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
}
