import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
  const { user } = useAuth();
  const tenant = tenantList.data?.find(item => item.id === user?.tenantId);
  const utils = trpc.useUtils();
  const [name, setName] = useState<string | undefined>();
  const [domain, setDomain] = useState<string | undefined>();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [copiedSlug, setCopiedSlug] = useState(false);

  const updateTenant = trpc.tenant.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      setName(undefined);
      setDomain(undefined);
      setLogoUrl(undefined);
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
    if (name !== undefined) {
      const nextName = name.trim();
      if (nextName.length < 2 || nextName.length > 255) {
        toast.error("Use a workspace name with 2–255 characters.");
        return;
      }
      data.name = nextName;
    }
    if (domain !== undefined) data.domain = domain.trim();
    if (logoUrl !== undefined) data.logoUrl = logoUrl.trim();
    if (name === undefined && domain === undefined && logoUrl === undefined) {
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

  if (tenantList.isError || !tenant)
    return (
      <SettingsLayout>
        <div
          role="alert"
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <p className="font-medium">
            Could not load this workspace’s settings
          </p>
          <p className="text-sm text-muted-foreground">
            {tenantList.error?.message ??
              "No owned workspace matches your current workspace."}
          </p>
          <Button variant="outline" onClick={() => void tenantList.refetch()}>
            Retry workspace settings
          </Button>
        </div>
      </SettingsLayout>
    );

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Primary Experience */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              {isCommerce ? (
                <Store className="w-4 h-4 text-primary" />
              ) : (
                <Car className="w-4 h-4 text-primary" />
              )}
              Primary Experience
            </CardTitle>
            <CardDescription className="text-muted-foreground">
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
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-muted/40 hover:border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <option.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {isCommerce ? "Store Identity" : "Workspace Identity"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your {isCommerce ? "store" : "workspace"} name and identifier used
              across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">
                {nameLabel}
              </Label>
              <Input
                value={name ?? tenant?.name ?? ""}
                onChange={e => setName(e.target.value)}
                placeholder={
                  tenant?.name ??
                  (isCommerce ? "Your store name" : "Your workspace name")
                }
                className="bg-muted/40 border-border text-foreground focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">
                {isCommerce ? "Store Slug" : "Workspace Slug"}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tenant?.slug ?? ""}
                  disabled
                  className="bg-muted/40 border-border text-muted-foreground"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 border border-border hover:bg-muted/40"
                  onClick={copySlug}
                >
                  {copiedSlug ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Slug cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Status</Label>
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
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Domain & Branding
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Custom domain and visual identity for your{" "}
              {isCommerce ? "store" : "workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">
                Custom Domain
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={domain ?? tenant?.domain ?? ""}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="shop.yourdomain.com"
                  className="bg-muted/40 border-border text-foreground focus:border-primary/50"
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
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Point your domain's CNAME to unifyone.app to use a custom
                domain.
              </p>
            </div>

            <Separator className="bg-muted" />

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Logo URL</Label>
              <Input
                value={logoUrl ?? tenant?.logoUrl ?? ""}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="bg-muted/40 border-border text-foreground focus:border-primary/50"
              />
              {(logoUrl ?? tenant?.logoUrl) && (
                <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-border inline-flex items-center gap-3">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  {(() => {
                    const rawSrc = logoUrl ?? tenant?.logoUrl;
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
            disabled={
              updateTenant.isPending ||
              (name === undefined &&
                domain === undefined &&
                logoUrl === undefined)
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
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
