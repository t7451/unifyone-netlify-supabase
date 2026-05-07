import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

export default function PixelforgePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    width: 16,
    height: 16,
    assetType: "sprite" as "sprite" | "tileset" | "animation",
  });

  const assetsQuery = trpc.pixelforge.listAssets.useQuery({ limit: 50 });

  const createAsset = trpc.pixelforge.createAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset created");
      setShowCreate(false);
      void assetsQuery.refetch();
    },
    onError: e => toast.error(e.message),
  });

  const exportSheet = trpc.pixelforge.exportSpriteSheet.useMutation({
    onSuccess: data => {
      const d = data as Record<string, unknown>;
      toast.success(`Exported: ${Number(d.frame_count ?? 0)} frames`);
    },
    onError: e => toast.error(e.message),
  });

  const assets =
    (assetsQuery.data as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🎨 PixelForge Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage pixel art assets, sprites, tilesets, and animations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a
              href="https://ksksrbiz-arch.github.io/skaggsk/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Editor
            </a>
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Asset
          </Button>
        </div>
      </div>

      {/* Asset Grid */}
      {assetsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              No assets yet. Create your first pixel art asset or open the
              editor.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {assets.map((asset, i) => (
            <Card key={String(asset.id ?? i)} className="overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {asset.thumbnail_url ? (
                  <img
                    src={String(asset.thumbnail_url)}
                    alt={String(asset.name ?? "Asset")}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-4xl">🎨</span>
                )}
              </div>
              <CardContent className="p-2 space-y-1.5">
                <p className="text-xs font-medium truncate">
                  {String(asset.name ?? "—")}
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {String(asset.asset_type ?? asset.type ?? "—")}
                </Badge>
                <p className="text-[10px] text-muted-foreground">
                  {Number(asset.width ?? 0)}×{Number(asset.height ?? 0)}px
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-6 text-[10px]"
                  disabled={exportSheet.isPending}
                  onClick={() =>
                    exportSheet.mutate({ assetId: String(asset.id ?? "") })
                  }
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Asset Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pixel Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="My Sprite"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={form.width}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      width: parseInt(e.target.value) || 16,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  min={1}
                  max={512}
                  value={form.height}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      height: parseInt(e.target.value) || 16,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Asset Type</Label>
              <Select
                value={form.assetType}
                onValueChange={v =>
                  setForm(f => ({
                    ...f,
                    assetType: v as "sprite" | "tileset" | "animation",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sprite">Sprite</SelectItem>
                  <SelectItem value="tileset">Tileset</SelectItem>
                  <SelectItem value="animation">Animation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name.trim() || createAsset.isPending}
              onClick={() =>
                createAsset.mutate({
                  name: form.name.trim(),
                  width: form.width,
                  height: form.height,
                  assetType: form.assetType,
                })
              }
            >
              {createAsset.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating…
                </>
              ) : (
                "Create Asset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
