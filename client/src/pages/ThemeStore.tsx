import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag, Search, Star, Download, Sparkles, ArrowRight,
  Filter, Grid3X3, List, ChevronRight, Package, Globe, Zap, Tag,
  Lock, CheckCircle2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Complexity badge colors ───────────────────────────────────────────────────
const COMPLEXITY_STYLES: Record<string, string> = {
  starter: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  standard: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  advanced: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

// ── Price badge ───────────────────────────────────────────────────────────────
function PriceBadge({ priceType, price }: { priceType: string; price: string }) {
  if (priceType === "free") {
    return (
      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
        Free
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-[#00D9FF] bg-[#00D9FF]/10 border border-[#00D9FF]/20 px-2 py-0.5 rounded-full">
      ${price}
    </span>
  );
}

// ── Theme Card ────────────────────────────────────────────────────────────────
function ThemeCard({ theme, onSelect }: { theme: any; onSelect: (t: any) => void }) {
  const thumbnail = theme.thumbnailUrl || `https://placehold.co/400x280/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`;

  return (
    <div
      onClick={() => onSelect(theme)}
      className="group cursor-pointer bg-[#0D1A3A] border border-white/8 rounded-xl overflow-hidden hover:border-[#00D9FF]/30 hover:shadow-lg hover:shadow-[#00D9FF]/5 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#060D1F]">
        <img
          src={thumbnail}
          alt={theme.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/400x280/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`;
          }}
        />
        {theme.featured && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <PriceBadge priceType={theme.priceType} price={theme.price} />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#060D1F]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" className="bg-[#00D9FF] text-[#060D1F] hover:bg-[#00C4E8] font-semibold gap-1.5">
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-1 group-hover:text-[#00D9FF] transition-colors">
            {theme.name}
          </h3>
          <span className={cn("text-xs px-1.5 py-0.5 rounded border flex-shrink-0", COMPLEXITY_STYLES[theme.complexity] ?? COMPLEXITY_STYLES.standard)}>
            {theme.complexity}
          </span>
        </div>

        {theme.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{theme.description}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {theme.installCount.toLocaleString()}
            </span>
            {theme.reviewCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {Number(theme.averageRating).toFixed(1)}
              </span>
            )}
          </div>
          {theme.industry && (
            <span className="text-xs text-slate-600">{theme.industry}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Theme Detail Modal ────────────────────────────────────────────────────────
function ThemeDetailModal({ theme, onClose }: { theme: any; onClose: () => void }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: installed } = trpc.themes.checkInstalled.useQuery(
    { themeId: theme.id },
    { enabled: isAuthenticated }
  );

  const installFree = trpc.themes.installFree.useMutation({
    onSuccess: (data) => {
      if (data.alreadyInstalled) {
        toast.info("Already installed", { description: "This theme is already in your library." });
      } else {
        toast.success("Theme installed!", { description: `${theme.name} has been added to your library.` });
      }
      utils.themes.myThemes.invalidate();
      utils.themes.checkInstalled.invalidate({ themeId: theme.id });
    },
    onError: (err) => toast.error("Install failed", { description: err.message }),
  });

  const createCheckout = trpc.themes.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout…");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error("Checkout failed", { description: err.message }),
  });

  const handleInstall = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (theme.priceType === "free") {
      installFree.mutate({ themeId: theme.id });
    } else {
      createCheckout.mutate({ themeId: theme.id, origin: window.location.origin });
    }
  };

  const screenshots = theme.screenshotUrls?.length
    ? theme.screenshotUrls
    : [theme.thumbnailUrl || `https://placehold.co/800x500/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0A1128] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00D9FF]/20 to-blue-600/20 border border-[#00D9FF]/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7 text-[#00D9FF]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{theme.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <PriceBadge priceType={theme.priceType} price={theme.price} />
                <span className={cn("text-xs px-1.5 py-0.5 rounded border", COMPLEXITY_STYLES[theme.complexity] ?? COMPLEXITY_STYLES.standard)}>
                  {theme.complexity}
                </span>
                {theme.industry && (
                  <span className="text-xs text-slate-500">{theme.industry}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none p-1">×</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Main content */}
          <div className="lg:col-span-2 p-6 space-y-6 border-r border-white/8">
            {/* Screenshot */}
            <div className="rounded-xl overflow-hidden border border-white/8 aspect-[16/10] bg-[#060D1F]">
              <img
                src={screenshots[0]}
                alt={theme.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/800x500/0D1A3A/00D9FF?text=${encodeURIComponent(theme.name)}`;
                }}
              />
            </div>

            {/* Description */}
            {(theme.longDescription || theme.description) && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">About this theme</h3>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                  {theme.longDescription || theme.description}
                </p>
              </div>
            )}

            {/* Features */}
            {theme.features?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">What's included</h3>
                <div className="grid grid-cols-2 gap-2">
                  {theme.features.map((f: string) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech stack */}
            {theme.techStack?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Tech stack</h3>
                <div className="flex flex-wrap gap-2">
                  {theme.techStack.map((t: string) => (
                    <span key={t} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded text-slate-300">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="p-6 space-y-6">
            {/* CTA */}
            <div className="space-y-3">
              {installed?.installed ? (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2" disabled>
                  <CheckCircle2 className="w-4 h-4" />
                  Installed
                </Button>
              ) : (
                <Button
                  onClick={handleInstall}
                  disabled={installFree.isPending || createCheckout.isPending}
                  className={cn(
                    "w-full font-semibold gap-2",
                    theme.priceType === "free"
                      ? "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600 text-[#060D1F]"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  )}
                >
                  {theme.priceType === "free" ? (
                    <><Download className="w-4 h-4" /> Install Free</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Purchase — ${theme.price}</>
                  )}
                </Button>
              )}

              {theme.previewUrl && (
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 gap-2"
                  onClick={() => window.open(theme.previewUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Live Preview
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3 pt-2 border-t border-white/8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Installs</span>
                <span className="text-white font-medium">{theme.installCount.toLocaleString()}</span>
              </div>
              {theme.reviewCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Rating</span>
                  <span className="text-white font-medium">{Number(theme.averageRating).toFixed(1)} / 5</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Complexity</span>
                <span className="text-white font-medium capitalize">{theme.complexity}</span>
              </div>
            </div>

            {/* Tags */}
            {theme.tags?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {theme.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-white/5 border border-white/8 rounded text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Theme Store Page ─────────────────────────────────────────────────────
export default function ThemeStore() {
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rating" | "price_asc" | "price_desc">("newest");
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categories = [] } = trpc.themes.listCategories.useQuery();
  const { data: themes = [], isLoading } = trpc.themes.list.useQuery({
    search: search || undefined,
    priceType: priceFilter !== "all" ? (priceFilter as any) : undefined,
    complexity: complexityFilter !== "all" ? (complexityFilter as any) : undefined,
    sortBy,
    limit: 48,
    offset: 0,
  });

  const featuredThemes = useMemo(() => themes.filter((t: any) => t.featured), [themes]);
  const regularThemes = useMemo(() => themes.filter((t: any) => !t.featured), [themes]);

  return (
    <div className="min-h-screen bg-[#060D1F] text-white">
      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A1128] via-[#0D1A3A] to-[#060D1F] border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-[#00D9FF]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShoppingBag className="w-6 h-6 text-[#00D9FF]" />
            <span className="text-sm font-semibold text-[#00D9FF] uppercase tracking-widest">Theme Store</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Launch faster with<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-blue-400">
              premium templates
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Browse professionally designed website templates. Free and paid options for every industry and use case.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search themes by name, industry, or technology…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#00D9FF]/40 text-sm"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> {themes.length} templates</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Multiple industries</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Free & paid options</span>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mr-2">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>

          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-32 h-9 bg-white/5 border-white/10 text-sm text-slate-300">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent className="bg-[#0D1A3A] border-white/10">
              <SelectItem value="all">All prices</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={complexityFilter} onValueChange={setComplexityFilter}>
            <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-sm text-slate-300">
              <SelectValue placeholder="Complexity" />
            </SelectTrigger>
            <SelectContent className="bg-[#0D1A3A] border-white/10">
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-3">
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-sm text-slate-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1A3A] border-white/10">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className={cn("grid gap-5", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1")}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#0D1A3A] border border-white/8 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && themes.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No themes found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {search ? `No themes match "${search}". Try a different search term.` : "No themes have been published yet. Check back soon!"}
            </p>
            {search && (
              <Button variant="outline" onClick={() => setSearch("")} className="border-white/10 text-slate-300">
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Featured section */}
        {!isLoading && featuredThemes.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Featured themes</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredThemes.map((theme: any) => (
                <ThemeCard key={theme.id} theme={theme} onSelect={setSelectedTheme} />
              ))}
            </div>
          </section>
        )}

        {/* All themes */}
        {!isLoading && regularThemes.length > 0 && (
          <section>
            {featuredThemes.length > 0 && (
              <div className="flex items-center gap-2 mb-5">
                <Tag className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white">All themes</h2>
                <span className="text-xs text-slate-500">({regularThemes.length})</span>
              </div>
            )}
            <div className={cn(
              "grid gap-5",
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}>
              {regularThemes.map((theme: any) => (
                <ThemeCard key={theme.id} theme={theme} onSelect={setSelectedTheme} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Theme detail modal */}
      {selectedTheme && (
        <ThemeDetailModal theme={selectedTheme} onClose={() => setSelectedTheme(null)} />
      )}
    </div>
  );
}
