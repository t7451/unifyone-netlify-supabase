import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Target, TrendingUp, Zap, Search } from "lucide-react";
import { toast } from "sonner";

export default function DealflowPage() {
  const [search, setSearch] = useState("");

  const dealsQuery = trpc.dealflow.listDeals.useQuery({ limit: 20 });
  const flagsQuery = trpc.dealflow.getFeatureFlags.useQuery({});

  const generateContent = trpc.dealflow.generateContent.useMutation({
    onSuccess: () => toast.success("Content generated successfully"),
    onError: (e) => toast.error(e.message),
  });

  const setFlag = trpc.dealflow.setFeatureFlag.useMutation({
    onSuccess: () => {
      toast.success("Feature flag updated");
      void flagsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deals = (dealsQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const flags = (flagsQuery.data as Record<string, unknown>[] | undefined) ?? [];

  const filteredDeals = search
    ? deals.filter(
        (d) =>
          String(d.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
          String(d.brand ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : deals;

  const totalDeals = deals.length;
  const totalConversions = deals.reduce(
    (sum, d) => sum + (Number(d.conversions) || 0),
    0
  );
  const topCategory =
    deals.length > 0 ? String(deals[0].category ?? "N/A") : "N/A";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          🎯 DealFlow — Referral & Affiliate Tools
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage referral deals, track conversions, and run A/B experiments.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Total Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalConversions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{topCategory}</p>
          </CardContent>
        </Card>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Deal Listings</CardTitle>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {dealsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDeals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No deals found. Connect DealFlow to start importing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Brand</th>
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-left py-2 pr-4 font-medium">Bonus</th>
                    <th className="text-left py-2 pr-4 font-medium">Difficulty</th>
                    <th className="text-left py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal, i) => (
                    <tr key={String(deal.id ?? i)} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{String(deal.brand ?? "—")}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">{String(deal.category ?? "—")}</Badge>
                      </td>
                      <td className="py-2 pr-4">${Number(deal.bonusAmount ?? 0).toFixed(0)}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={
                            deal.difficulty === "easy"
                              ? "outline"
                              : deal.difficulty === "hard"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {String(deal.difficulty ?? "—")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generateContent.isPending}
                          onClick={() =>
                            generateContent.mutate({
                              dealId: String(deal.id ?? ""),
                              contentType: "blog_post",
                            })
                          }
                        >
                          {generateContent.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Generate Content"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags Panel */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          {flagsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : flags.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No feature flags configured.
            </p>
          ) : (
            <div className="space-y-3">
              {flags.map((flag, i) => (
                <div
                  key={String(flag.id ?? i)}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{String(flag.name ?? flag.id ?? "Flag")}</p>
                    <p className="text-xs text-muted-foreground">
                      Rollout: {Number(flag.rollout_percentage ?? 100)}%
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(flag.enabled)}
                    onCheckedChange={(enabled) =>
                      setFlag.mutate({
                        flagId: String(flag.id ?? ""),
                        enabled,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
