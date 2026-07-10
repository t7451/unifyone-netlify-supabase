import { useState } from "react";
import { Link } from "wouter";
import AIInsightsCard from "@/components/AIInsightsCard";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxExportButton } from "@/components/TaxExportButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DollarSign,
  Car,
  Clock,
  TrendingUp,
  Plus,
  Play,
  Square,
  MapPin,
  Zap,
  Settings,
  Trash2,
  BarChart3,
  FileText,
  Upload,
  Lock,
} from "lucide-react";

const GIG_PLATFORMS = [
  "DoorDash",
  "Uber Eats",
  "Instacart",
  "Lyft",
  "Uber",
  "Grubhub",
  "Amazon Flex",
  "Shipt",
  "Upwork",
  "Fiverr",
  "Other",
];

const RULE_TYPES = [
  { value: "auto_save", label: "Auto-Save" },
  { value: "budget_cap", label: "Budget Cap" },
  { value: "alert", label: "Alert" },
  { value: "allocation", label: "Allocation" },
  { value: "goal", label: "Goal" },
];

const TRIGGER_TYPES = [
  { value: "income_received", label: "Income Received" },
  { value: "expense_over", label: "Expense Over" },
  { value: "balance_below", label: "Balance Below" },
  { value: "balance_above", label: "Balance Above" },
  { value: "scheduled", label: "Scheduled" },
  { value: "manual", label: "Manual" },
];

const ACTION_TYPES = [
  { value: "transfer", label: "Transfer" },
  { value: "notify", label: "Notify" },
  { value: "block", label: "Block" },
  { value: "tag", label: "Tag" },
  { value: "save", label: "Save" },
];

export default function MoneyManager() {
  const { user } = useAuth();
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("DoorDash");
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">(
    "month"
  );
  const [shiftEndForm, setShiftEndForm] = useState({
    grossEarnings: "",
    tips: "",
    bonuses: "",
    totalMiles: "",
    notes: "",
  });
  const [mileageForm, setMileageForm] = useState({
    miles: "",
    purpose: "business",
    startAddress: "",
    endAddress: "",
  });
  const [ruleForm, setRuleForm] = useState({
    name: "",
    type: "alert" as const,
    triggerType: "income_received" as const,
    triggerValue: "",
    actionType: "notify" as const,
    actionValue: "",
    actionPercent: "",
  });
  const [showEndShift, setShowEndShift] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);

  const utils = trpc.useUtils();
  const [importPlatform, setImportPlatform] = useState("DoorDash");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Awaited<
    ReturnType<typeof utils.moneyManager.previewEarningsImport.fetch>
  > | null>(null);
  const [parsingImport, setParsingImport] = useState(false);

  const stats = trpc.moneyManager.getShiftStats.useQuery({ period });
  const shifts = trpc.moneyManager.listShifts.useQuery({
    limit: 10,
    offset: 0,
  });
  const mileage = trpc.moneyManager.getMileageSummary.useQuery({
    year: new Date().getFullYear(),
  });
  const rules = trpc.moneyManager.listRules.useQuery();
  const points = trpc.moneyManager.getPointsBalance.useQuery();

  const startShift = trpc.moneyManager.startShift.useMutation({
    onSuccess: data => {
      setActiveShiftId(data.id);
      toast.success(`${selectedPlatform} shift started! Go earn! 🚀`);
    },
    onError: () => toast.error("Failed to start shift"),
  });

  const endShift = trpc.moneyManager.endShift.useMutation({
    onSuccess: () => {
      setActiveShiftId(null);
      setShowEndShift(false);
      setShiftEndForm({
        grossEarnings: "",
        tips: "",
        bonuses: "",
        totalMiles: "",
        notes: "",
      });
      shifts.refetch();
      stats.refetch();
      points.refetch();
      toast.success("Shift completed! Points awarded 🏆");
    },
    onError: () => toast.error("Failed to end shift"),
  });

  const logMileage = trpc.moneyManager.logMileage.useMutation({
    onSuccess: data => {
      setMileageForm({
        miles: "",
        purpose: "business",
        startAddress: "",
        endAddress: "",
      });
      mileage.refetch();
      points.refetch();
      toast.success(
        `Mileage logged! Tax deduction: $${data.deductionDollars.toFixed(2)}`
      );
    },
    onError: () => toast.error("Failed to log mileage"),
  });

  const createRule = trpc.moneyManager.createRule.useMutation({
    onSuccess: () => {
      setShowAddRule(false);
      setRuleForm({
        name: "",
        type: "alert",
        triggerType: "income_received",
        triggerValue: "",
        actionType: "notify",
        actionValue: "",
        actionPercent: "",
      });
      rules.refetch();
      points.refetch();
      toast.success("Financial rule created! +15 points 🎯");
    },
    onError: () => toast.error("Failed to create rule"),
  });

  const toggleRule = trpc.moneyManager.toggleRule.useMutation({
    onSuccess: () => rules.refetch(),
    onError: e => toast.error(e.message),
  });

  const deleteRule = trpc.moneyManager.deleteRule.useMutation({
    onSuccess: () => {
      rules.refetch();
      toast.success("Rule deleted");
    },
    onError: e => toast.error(e.message),
  });

  // ── Earnings Import ─────────────────────────────────────────────────────────
  const importAccess = trpc.gigWorker.checkFeatureAccess.useQuery({
    feature: "earnings_import",
  });
  const importBatches = trpc.moneyManager.listImportBatches.useQuery();

  const commitImport = trpc.moneyManager.commitEarningsImport.useMutation({
    onSuccess: data => {
      toast.success(`Imported ${data.inserted} earnings row(s) 📥`);
      setImportPreview(null);
      setImportFileName(null);
      importBatches.refetch();
      stats.refetch();
      // Blended platform breakdown lives behind another query — invalidate it so
      // the GigIQ view reflects the new imported earnings on next read.
      utils.moneyManager.getShiftBreakdown.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteImportBatch = trpc.moneyManager.deleteImportBatch.useMutation({
    onSuccess: () => {
      toast.success("Import removed");
      importBatches.refetch();
      stats.refetch();
      utils.moneyManager.getShiftBreakdown.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportFileName(file.name);
    setParsingImport(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result ?? "");
        const preview = await utils.moneyManager.previewEarningsImport.fetch({
          csvText: text,
          platform: importPlatform,
        });
        setImportPreview(preview);
        if (preview.rows.length === 0) {
          toast.error("No valid earnings rows found in that file");
        }
      } catch {
        toast.error("Could not read that CSV file");
      } finally {
        setParsingImport(false);
      }
    };
    reader.onerror = () => {
      setParsingImport(false);
      toast.error("Could not read that file");
    };
    reader.readAsText(file);
  }

  if (!user) return null;

  const s = stats.data;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Money Manager</h1>
          <p className="text-sm text-muted-foreground">
            Gig tracker · Tax deductions · Financial rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          {points.data && (
            <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              {points.data.totalPoints.toLocaleString()} pts · Lv
              {points.data.level}
            </Badge>
          )}
          <Select
            value={period}
            onValueChange={v => setPeriod(v as typeof period)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Insights Panel */}
      {s && (
        <AIInsightsCard
          context="money-manager"
          title="Money Manager AI Insights"
          dataContext={`Earnings this ${period}: $${(s.totalEarnings ?? 0).toFixed(2)}. Total shifts: ${s.totalShifts ?? 0}. Hours worked: ${(s.totalHours ?? 0).toFixed(1)}h. Avg $/hour: $${(s.avgPerHour ?? 0).toFixed(2)}. Total miles: ${(s.totalMiles ?? 0).toFixed(1)}. Tax deduction: $${(s.taxDeduction ?? 0).toFixed(2)} (IRS 2025 rate $0.70/mile). Period: ${period}.`}
          defaultCollapsed={false}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Earnings",
            value: `$${(s?.totalEarnings ?? 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-500",
          },
          {
            label: "Miles",
            value: `${(s?.totalMiles ?? 0).toFixed(1)}`,
            icon: Car,
            color: "text-blue-500",
          },
          {
            label: "Shifts",
            value: String(s?.totalShifts ?? 0),
            icon: BarChart3,
            color: "text-purple-500",
          },
          {
            label: "Hours",
            value: `${(s?.totalHours ?? 0).toFixed(1)}h`,
            icon: Clock,
            color: "text-orange-500",
          },
          {
            label: "$/Hour",
            value: `$${(s?.avgPerHour ?? 0).toFixed(2)}`,
            icon: TrendingUp,
            color: "text-cyan-500",
          },
          {
            label: "Tax Deduction",
            value: `$${(s?.taxDeduction ?? 0).toFixed(2)}`,
            icon: FileText,
            color: "text-yellow-500",
          },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">
                  {kpi.label}
                </span>
              </div>
              {stats.isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : stats.isError ? (
                <div className="text-lg font-bold text-muted-foreground">—</div>
              ) : (
                <div className="text-lg font-bold text-foreground">
                  {kpi.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shift Commander */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Shift Commander
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeShiftId ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {GIG_PLATFORMS.map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  startShift.mutate({ platform: selectedPlatform })
                }
                disabled={startShift.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="h-4 w-4" />
                {startShift.isPending ? "Starting..." : "Start Shift"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-400">
                  Shift Active — {selectedPlatform}
                </span>
              </div>
              <Dialog open={showEndShift} onOpenChange={setShowEndShift}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Square className="h-3.5 w-3.5" />
                    End Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>End Shift — {selectedPlatform}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Gross Earnings ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={shiftEndForm.grossEarnings}
                          onChange={e =>
                            setShiftEndForm(f => ({
                              ...f,
                              grossEarnings: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Tips ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={shiftEndForm.tips}
                          onChange={e =>
                            setShiftEndForm(f => ({
                              ...f,
                              tips: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Bonuses ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={shiftEndForm.bonuses}
                          onChange={e =>
                            setShiftEndForm(f => ({
                              ...f,
                              bonuses: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Miles Driven</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={shiftEndForm.totalMiles}
                          onChange={e =>
                            setShiftEndForm(f => ({
                              ...f,
                              totalMiles: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Input
                        placeholder="Any notes about this shift..."
                        value={shiftEndForm.notes}
                        onChange={e =>
                          setShiftEndForm(f => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {shiftEndForm.totalMiles && (
                      <p className="text-xs text-muted-foreground">
                        Tax deduction:{" "}
                        <span className="text-green-400 font-medium">
                          ${(Number(shiftEndForm.totalMiles) * 0.7).toFixed(2)}
                        </span>{" "}
                        (IRS 2025: $0.70/mile)
                      </p>
                    )}
                    <Button
                      className="w-full"
                      disabled={
                        endShift.isPending || !shiftEndForm.grossEarnings
                      }
                      onClick={() =>
                        endShift.mutate({
                          shiftId: activeShiftId!,
                          grossEarnings: Number(shiftEndForm.grossEarnings),
                          tips: Number(shiftEndForm.tips || 0),
                          bonuses: Number(shiftEndForm.bonuses || 0),
                          totalMiles: Number(shiftEndForm.totalMiles || 0),
                          notes: shiftEndForm.notes || undefined,
                        })
                      }
                    >
                      {endShift.isPending
                        ? "Saving..."
                        : "Complete Shift (+25 pts)"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Recent Shifts */}
          {shifts.isLoading ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Shifts
              </p>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : shifts.isError ? (
            <p className="pt-2 text-xs text-muted-foreground">
              Could not load recent shifts. Try again later.
            </p>
          ) : shifts.data?.shifts && shifts.data.shifts.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Shifts
              </p>
              {shifts.data.shifts.slice(0, 5).map(shift => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        shift.status === "active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {shift.platform}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(shift.startTime).toLocaleDateString()}
                    </span>
                    {shift.durationMinutes && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round((shift.durationMinutes / 60) * 10) / 10}h
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      $
                      {(
                        Number(shift.grossEarnings) +
                        Number(shift.tips) +
                        Number(shift.bonuses)
                      ).toFixed(2)}
                    </div>
                    {Number(shift.totalMiles) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {Number(shift.totalMiles).toFixed(1)} mi
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-2 text-center text-xs text-muted-foreground">
              No shifts logged yet. Start a shift above to begin tracking.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mileage">
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="mileage">Mileage & Tax</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="rules">Financial Rules</TabsTrigger>
        </TabsList>

        {/* Mileage Tab */}
        <TabsContent value="mileage" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Export your shifts, mileage &amp; estimated tax for your CPA.
            </p>
            <TaxExportButton />
          </div>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Log Mileage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Miles Driven</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={mileageForm.miles}
                    onChange={e =>
                      setMileageForm(f => ({ ...f, miles: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Select
                    value={mileageForm.purpose}
                    onValueChange={v =>
                      setMileageForm(f => ({ ...f, purpose: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="charity">Charity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From (optional)</Label>
                  <Input
                    placeholder="Start address"
                    value={mileageForm.startAddress}
                    onChange={e =>
                      setMileageForm(f => ({
                        ...f,
                        startAddress: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>To (optional)</Label>
                  <Input
                    placeholder="End address"
                    value={mileageForm.endAddress}
                    onChange={e =>
                      setMileageForm(f => ({
                        ...f,
                        endAddress: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {mileageForm.miles && (
                <p className="text-xs text-muted-foreground">
                  Estimated deduction:{" "}
                  <span className="text-green-400 font-medium">
                    ${(Number(mileageForm.miles) * 0.7).toFixed(2)}
                  </span>{" "}
                  at IRS 2025 rate ($0.70/mile)
                </p>
              )}
              <Button
                onClick={() =>
                  logMileage.mutate({
                    miles: Number(mileageForm.miles),
                    purpose: mileageForm.purpose,
                    startAddress: mileageForm.startAddress || undefined,
                    endAddress: mileageForm.endAddress || undefined,
                  })
                }
                disabled={logMileage.isPending || !mileageForm.miles}
                className="w-full gap-2"
              >
                <MapPin className="h-4 w-4" />
                {logMileage.isPending ? "Logging..." : "Log Mileage (+10 pts)"}
              </Button>
            </CardContent>
          </Card>

          {/* Mileage Summary */}
          {mileage.data && (
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {mileage.data.totalMiles.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Miles {new Date().getFullYear()}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      ${mileage.data.totalDeduction.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tax Deduction
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Import Tab — multi-platform earnings consolidation */}
        <TabsContent value="import" className="space-y-4 mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Import Earnings (CSV)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a CSV export from DoorDash, Uber, Lyft, Instacart, or any
                gig platform. We map the columns, preview the rows, then blend
                them into your consolidated earnings and miles.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select
                    value={importPlatform}
                    onValueChange={setImportPlatform}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {GIG_PLATFORMS.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CSV File</Label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={e =>
                      handleImportFile(e.target.files?.[0] ?? undefined)
                    }
                  />
                </div>
              </div>
              {parsingImport && (
                <p className="text-xs text-muted-foreground">Parsing file…</p>
              )}

              {importPreview && (
                <div className="space-y-3 pt-1">
                  {/* Totals + skipped summary */}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {importPreview.totals.rowCount} row(s)
                    </span>
                    <span className="text-green-400 font-medium">
                      ${importPreview.totals.totalDollars.toFixed(2)} total
                    </span>
                    <span className="text-muted-foreground">
                      {importPreview.totals.miles.toFixed(1)} mi
                    </span>
                    {importPreview.skipped.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {importPreview.skipped.length} skipped
                      </Badge>
                    )}
                    {importFileName && (
                      <span className="text-muted-foreground truncate">
                        {importFileName}
                      </span>
                    )}
                  </div>

                  {/* Normalized rows table */}
                  {importPreview.rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground text-xs">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Platform</th>
                            <th className="pb-2 font-medium text-right">
                              Gross
                            </th>
                            <th className="pb-2 font-medium text-right">
                              Tips
                            </th>
                            <th className="pb-2 font-medium text-right">
                              Bonus
                            </th>
                            <th className="pb-2 font-medium text-right">
                              Miles
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importPreview.rows.slice(0, 100).map((r, i) => (
                            <tr key={`${r.earnedDate}-${i}`}>
                              <td className="py-2 whitespace-nowrap">
                                {new Date(r.earnedDate).toLocaleDateString()}
                              </td>
                              <td className="py-2">{r.platform}</td>
                              <td className="py-2 text-right tabular-nums">
                                ${r.grossDollars.toFixed(2)}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                ${r.tipsDollars.toFixed(2)}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                ${r.bonusDollars.toFixed(2)}
                              </td>
                              <td className="py-2 text-right tabular-nums text-muted-foreground">
                                {r.miles == null ? "—" : r.miles.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.rows.length > 100 && (
                        <p className="pt-2 text-xs text-muted-foreground">
                          Showing first 100 of {importPreview.rows.length} rows
                          — all will be saved.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Save action — gated behind the Pro feature */}
                  {importAccess.data && !importAccess.data.hasAccess ? (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-violet-500/40 text-violet-200 hover:bg-violet-500/10"
                    >
                      <Link href="/gig-worker-plans">
                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                        Unlock earnings import — Pro
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      disabled={
                        commitImport.isPending ||
                        importPreview.rows.length === 0
                      }
                      onClick={() =>
                        commitImport.mutate({
                          platform: importPlatform,
                          fileName: importFileName ?? undefined,
                          rows: importPreview.rows,
                        })
                      }
                    >
                      <Upload className="h-4 w-4" />
                      {commitImport.isPending
                        ? "Saving…"
                        : `Save import (${importPreview.rows.length} rows)`}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past import batches */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Past Imports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importBatches.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : importBatches.data && importBatches.data.length > 0 ? (
                <div className="space-y-2">
                  {importBatches.data.map(batch => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-xs">
                          {batch.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {batch.fileName ?? "import"} · {batch.rowCount} rows
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteImportBatch.isPending}
                        onClick={() =>
                          deleteImportBatch.mutate({ batchId: batch.id })
                        }
                        aria-label="Undo import"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No imports yet. Upload a platform CSV above to consolidate
                  your earnings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Rules Tab */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rules.data?.length ?? 0} rules active
            </p>
            <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Financial Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      placeholder="e.g. Save 20% of every DoorDash payout"
                      value={ruleForm.name}
                      onChange={e =>
                        setRuleForm(f => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Rule Type</Label>
                      <Select
                        value={ruleForm.type}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            type: v as typeof ruleForm.type,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Trigger</Label>
                      <Select
                        value={ruleForm.triggerType}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            triggerType: v as typeof ruleForm.triggerType,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Trigger Value ($)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={ruleForm.triggerValue}
                        onChange={e =>
                          setRuleForm(f => ({
                            ...f,
                            triggerValue: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Action</Label>
                      <Select
                        value={ruleForm.actionType}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            actionType: v as typeof ruleForm.actionType,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Action Value ($)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={ruleForm.actionValue}
                        onChange={e =>
                          setRuleForm(f => ({
                            ...f,
                            actionValue: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Action % (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0-100"
                        value={ruleForm.actionPercent}
                        onChange={e =>
                          setRuleForm(f => ({
                            ...f,
                            actionPercent: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={createRule.isPending || !ruleForm.name}
                    onClick={() =>
                      createRule.mutate({
                        name: ruleForm.name,
                        type: ruleForm.type,
                        triggerType: ruleForm.triggerType,
                        triggerValue: ruleForm.triggerValue
                          ? Number(ruleForm.triggerValue)
                          : undefined,
                        actionType: ruleForm.actionType,
                        actionValue: ruleForm.actionValue
                          ? Number(ruleForm.actionValue)
                          : undefined,
                        actionPercent: ruleForm.actionPercent
                          ? Number(ruleForm.actionPercent)
                          : undefined,
                      })
                    }
                  >
                    {createRule.isPending
                      ? "Creating..."
                      : "Create Rule (+15 pts)"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rules.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {rules.isError && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Could not load financial rules.</p>
              <p className="text-xs mt-1">Please try again later.</p>
            </div>
          )}

          {!rules.isLoading && !rules.isError && rules.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No financial rules yet.</p>
              <p className="text-xs mt-1">
                Create your first rule to automate money management and earn
                points.
              </p>
            </div>
          )}

          {rules.data?.map(rule => (
            <Card key={rule.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground truncate">
                        {rule.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {rule.type.replace("_", " ")}
                      </Badge>
                      {!rule.enabled && (
                        <Badge variant="secondary" className="text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      When: {rule.triggerType.replace(/_/g, " ")} →{" "}
                      {rule.actionType}
                      {rule.triggerValue &&
                        ` $${Number(rule.triggerValue).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={v =>
                        toggleRule.mutate({ ruleId: rule.id, enabled: v })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteRule.mutate({ ruleId: rule.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
