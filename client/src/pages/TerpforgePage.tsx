import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TerpforgePage() {
  const [puritySlug, setPuritySlug] = useState("beta-caryophyllene");
  const [purityPct, setPurityPct] = useState(85);
  const [simulationResult, setSimulationResult] = useState<Record<string, unknown> | null>(null);

  const compoundsQuery = trpc.terpforge.listCompounds.useQuery({});
  const coaQuery = trpc.terpforge.getCoaData.useQuery({});
  const productsQuery = trpc.terpforge.listProducts.useQuery({});

  const simulatePurity = trpc.terpforge.simulatePurity.useMutation({
    onSuccess: (data) => {
      setSimulationResult(data as Record<string, unknown>);
    },
    onError: (e) => toast.error(e.message),
  });

  const compounds = (compoundsQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const coaData = (coaQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const products = (productsQuery.data as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          🧬 TerpForge — Compound & Product Tools
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore terpene compounds, run purity simulations, and browse COA lab data.
        </p>
      </div>

      <Tabs defaultValue="compounds">
        <TabsList>
          <TabsTrigger value="compounds">Compounds</TabsTrigger>
          <TabsTrigger value="simulator">Purity Simulator</TabsTrigger>
          <TabsTrigger value="coa">COA Data</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* Compound Library */}
        <TabsContent value="compounds" className="mt-4">
          {compoundsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : compounds.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No compounds found. Connect TerpForge to load compound library.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compounds.map((c, i) => (
                <Card key={String(c.slug ?? i)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{String(c.name ?? "—")}</CardTitle>
                      <Badge
                        style={{
                          backgroundColor: String(c.profileColor ?? "#888"),
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        {String(c.profile ?? "—")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{String(c.formula ?? "")}</p>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>BP: {String(c.bp ?? "—")} | MW: {String(c.mw ?? "—")}</p>
                    <p className="line-clamp-2">{String(c.aroma ?? "")}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => {
                        setPuritySlug(String(c.slug ?? ""));
                      }}
                    >
                      Simulate Purity
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Purity Simulator */}
        <TabsContent value="simulator" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Purity Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm">Compound Slug</Label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm bg-background"
                  value={puritySlug}
                  onChange={(e) => setPuritySlug(e.target.value)}
                  placeholder="e.g. beta-caryophyllene"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Purity: {purityPct}%</Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[purityPct]}
                  onValueChange={([v]) => setPurityPct(v ?? purityPct)}
                />
              </div>
              <Button
                disabled={simulatePurity.isPending || !puritySlug}
                onClick={() =>
                  simulatePurity.mutate({
                    compoundSlug: puritySlug,
                    purityPercentage: purityPct,
                  })
                }
              >
                {simulatePurity.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Simulating…
                  </>
                ) : (
                  "Run Simulation"
                )}
              </Button>
              {simulationResult && (
                <div className="mt-4 rounded-lg border p-4 space-y-1">
                  <p className="text-sm font-semibold">
                    Tier: {String(simulationResult.tier ?? "—")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {String(simulationResult.note ?? "")}
                  </p>
                  <Badge variant={simulationResult.pass ? "outline" : "destructive"}>
                    {simulationResult.pass ? "PASS ✓" : "FAIL ✗"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COA Data */}
        <TabsContent value="coa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificate of Analysis (COA)</CardTitle>
            </CardHeader>
            <CardContent>
              {coaQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : coaData.length === 0 ? (
                <p className="text-muted-foreground text-sm">No COA records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Product</th>
                        <th className="text-left py-2 pr-4 font-medium">Lab</th>
                        <th className="text-left py-2 pr-4 font-medium">Terpenes %</th>
                        <th className="text-left py-2 pr-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coaData.map((row, i) => (
                        <tr key={String(row.id ?? i)} className="border-b last:border-0">
                          <td className="py-2 pr-4">{String(row.product ?? "—")}</td>
                          <td className="py-2 pr-4">{String(row.lab ?? "—")}</td>
                          <td className="py-2 pr-4">{Number(row.terpenes_pct ?? 0).toFixed(2)}%</td>
                          <td className="py-2 pr-4">
                            <Badge variant={row.pass ? "outline" : "destructive"}>
                              {row.pass ? "Pass" : "Fail"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products */}
        <TabsContent value="products" className="mt-4">
          {productsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No products found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p, i) => (
                <Card key={String(p.id ?? i)}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">{String(p.name ?? "—")}</CardTitle>
                    <Badge variant="secondary">{String(p.category ?? "—")}</Badge>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p>${Number(p.price ?? 0).toFixed(2)}</p>
                    {p.profile && <p className="mt-1">Profile: {String(p.profile)}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
