import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Download, ExternalLink, Package, ArrowRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyThemes() {
  const [, navigate] = useLocation();
  const { data: installs = [], isLoading } = trpc.themes.myThemes.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Themes</h1>
          <p className="text-slate-400 text-sm mt-1">Your installed website templates</p>
        </div>
        <Button
          onClick={() => navigate("/themes")}
          className="bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600 text-[#060D1F] font-semibold gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Theme Store
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#0D1A3A] border border-white/8 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && installs.length === 0 && (
        <div className="text-center py-20 bg-[#0D1A3A] border border-white/8 rounded-xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No themes installed yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Browse the Theme Store to find free and premium templates for your storefront.
          </p>
          <Button
            onClick={() => navigate("/themes")}
            className="bg-gradient-to-r from-[#00D9FF] to-blue-500 text-[#060D1F] font-semibold gap-2"
          >
            Browse Theme Store <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Installed themes grid */}
      {!isLoading && installs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {installs.map((install: any) => {
            const theme = install.theme;
            if (!theme) return null;
            const thumbnail = theme.thumbnailUrl || `https://placehold.co/400x280/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`;

            return (
              <div key={install.id} className="bg-[#0D1A3A] border border-white/8 rounded-xl overflow-hidden hover:border-[#00D9FF]/30 transition-all">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#060D1F]">
                  <img
                    src={thumbnail}
                    alt={theme.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x280/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`;
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    {Number(install.amountPaid) > 0 ? (
                      <span className="text-xs font-semibold text-[#00D9FF] bg-[#00D9FF]/10 border border-[#00D9FF]/20 px-2 py-0.5 rounded-full">
                        ${install.amountPaid}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{theme.name}</h3>
                    {theme.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{theme.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="w-3 h-3" />
                    Installed {new Date(install.installedAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {theme.downloadUrl && (
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-gradient-to-r from-[#00D9FF] to-blue-500 text-[#060D1F] font-semibold text-xs gap-1.5"
                        onClick={() => window.open(theme.downloadUrl, "_blank")}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>
                    )}
                    {theme.previewUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/10 bg-white/5 text-slate-300 text-xs gap-1.5"
                        onClick={() => window.open(theme.previewUrl, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
