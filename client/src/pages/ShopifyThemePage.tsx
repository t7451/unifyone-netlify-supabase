import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2, RefreshCw, Gauge } from "lucide-react";
import { toast } from "sonner";

const SECTION_ICONS: Record<string, string> = {
  hero: "🦸",
  "trust-bar": "🔒",
  "featured-collections": "🗂️",
  "brand-story": "📖",
  "featured-products": "🌟",
  testimonials: "💬",
  newsletter: "📧",
};

type SectionKey =
  | "hero"
  | "trust-bar"
  | "featured-collections"
  | "brand-story"
  | "featured-products"
  | "testimonials"
  | "newsletter";

const ALL_SECTIONS: SectionKey[] = [
  "hero",
  "trust-bar",
  "featured-collections",
  "brand-story",
  "featured-products",
  "testimonials",
  "newsletter",
];

export default function ShopifyThemePage() {
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});

  const sectionsQuery = trpc.shopifyTheme.getSections.useQuery({});
  const performanceQuery = trpc.shopifyTheme.getPerformance.useQuery({ tenantId: 1 });

  const updateSection = trpc.shopifyTheme.updateSection.useMutation({
    onSuccess: () => {
      toast.success("Section settings updated");
      setEditingSection(null);
      void sectionsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const syncConfig = trpc.shopifyTheme.syncConfig.useMutation({
    onSuccess: () => toast.success("Theme synced to Shopify"),
    onError: (e) => toast.error(e.message),
  });

  const sections = (sectionsQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const perf = (performanceQuery.data as Record<string, unknown> | undefined) ?? {};

  const getSectionData = (key: SectionKey) =>
    sections.find((s) => s.name === key || s.section === key) ?? {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🛍️ Shopify Theme — Section Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage theme sections and sync settings to your Shopify storefront.
          </p>
        </div>
        <Button
          onClick={() =>
            syncConfig.mutate({
              tenantId: 1,
              section: "all",
              settings: {},
            })
          }
          disabled={syncConfig.isPending}
        >
          {syncConfig.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync to Shopify
        </Button>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Storefront Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {performanceQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              {["performance", "accessibility", "seo", "best_practices"].map((metric) => (
                <div key={metric} className="text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{
                      color:
                        Number(perf[metric] ?? 0) >= 90
                          ? "#22c55e"
                          : Number(perf[metric] ?? 0) >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {Number(perf[metric] ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {metric.replace("_", " ")}
                  </p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_SECTIONS.map((sectionKey) => {
          const data = getSectionData(sectionKey);
          return (
            <Card key={sectionKey}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{SECTION_ICONS[sectionKey]}</span>
                    <span className="capitalize">{sectionKey.replace(/-/g, " ")}</span>
                  </CardTitle>
                  <Badge variant={data.enabled !== false ? "outline" : "secondary"}>
                    {data.enabled !== false ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {String(data.description ?? `Theme section: ${sectionKey}`)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditingSection(sectionKey);
                    setEditSettings({});
                  }}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Settings Dialog */}
      <Dialog
        open={editingSection !== null}
        onOpenChange={(open) => !open && setEditingSection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {SECTION_ICONS[editingSection ?? "hero"]}{" "}
              {(editingSection ?? "").replace(/-/g, " ")} Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Heading</Label>
              <Input
                placeholder="Enter heading text..."
                value={editSettings.heading ?? ""}
                onChange={(e) =>
                  setEditSettings((s) => ({ ...s, heading: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subheading</Label>
              <Input
                placeholder="Enter subheading text..."
                value={editSettings.subheading ?? ""}
                onChange={(e) =>
                  setEditSettings((s) => ({ ...s, subheading: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateSection.isPending}
              onClick={() => {
                if (!editingSection) return;
                updateSection.mutate({
                  tenantId: 1,
                  section: editingSection,
                  settings: editSettings,
                });
              }}
            >
              {updateSection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
