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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Loader2,
  Image,
  ExternalLink,
  Copy,
  Check,
  Car,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_OPTIONS } from "@/lib/primaryProduct";
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
      toast.success("Settings saved");
      setName("");
      setDomain("");
      setLogoUrl("");
      utils.tenant.list.invalidate();
      // primaryProduct can change here — refresh auth.me so nav + landing update.
      utils.auth.me.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const isCommerce = tenant?.primaryProduct === "commerce";
  const nameLabel = isCommerce ? "Store Name" : "Workspace Name";

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

  if (tenantList.isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-6">
          {[0, 1].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Primary Experience */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              {isCommerce ? (
                <Store className="w-4 h-4 text-[#00D9FF]" />
              ) : (
                <Car className="w-4 h-4 text-[#00D9FF]" />
              )}
              Primary Experience
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sets your default landing page and which tools lead the sidebar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCT_OPTIONS.map(option => {
                const isSelected =
                  (tenant?.primaryProduct ?? "gig") === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!tenant || updateTenant.isPending}
                    onClick={() => {
                      if (!tenant || isSelected) return;
                      updateTenant.mutate({
                        id: tenant.id,
                        primaryProduct: option.id,
                      });
                    }}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors disabled:opacity-60",
                      isSelected
                        ? "border-[#00D9FF]/40 bg-[#00D9FF]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        isSelected
                          ? "bg-[#00D9FF] text-[#0A1128]"
                          : "bg-white/5 text-gray-400"
                      )}
                    >
                      <option.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Store Identity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00D9FF]" />
              {isCommerce ? "Store Identity" : "Workspace Identity"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your {isCommerce ? "store" : "workspace"} name and identifier used
              across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">{nameLabel}</Label>
              <Input
                value={name || tenant?.name || ""}
                onChange={e => setName(e.target.value)}
                placeholder={
                  tenant?.name ??
                  (isCommerce ? "Your store name" : "Your workspace name")
                }
                className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">
                {isCommerce ? "Store Slug" : "Workspace Slug"}
              </Label>
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
              Custom domain and visual identity for your{" "}
              {isCommerce ? "store" : "workspace"}
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
                    // Use URL constructor to reject malformed or non-http(s) URLs
                    let safeSrc: string | undefined;
                    try {
                      const parsed = new URL(rawSrc ?? "");
                      safeSrc =
                        parsed.protocol === "https:" ||
                        parsed.protocol === "http:"
                          ? parsed.href
                          : undefined;
                    } catch {
                      safeSrc = undefined;
                    }
                    return safeSrc ? (
                      <img
                        src={safeSrc}
                        alt={isCommerce ? "Store logo" : "Workspace logo"}
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
