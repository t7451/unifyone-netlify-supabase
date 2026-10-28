import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import AIInsightsCard from "@/components/AIInsightsCard";
import ManualWorkEntry from "@/components/ManualWorkEntry";
import { getBusinessMileageRateForDate } from "@shared/mileageRates";

import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
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
import { Progress } from "@/components/ui/progress";
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
  PiggyBank,
  Target,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const ENVELOPE_CATEGORIES = [
  { value: "tax", label: "Tax" },
  { value: "savings", label: "Savings" },
  { value: "emergency", label: "Emergency" },
  { value: "goal", label: "Goal" },
] as const;

const fmtCents = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
  { value: "transfer", label: "Track an allocation" },
  { value: "notify", label: "Notify" },
  { value: "block", label: "Block" },
  { value: "tag", label: "Tag" },
  { value: "save", label: "Track set-aside" },
];

function localCalendarDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function validCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
function mileageRateDollars(value: string) {
  try {
    return getBusinessMileageRateForDate(value) / 100;
  } catch {
    return null;
  }
}
const MONEY_TABS = ["mileage", "import", "rules", "envelopes"] as const;
function validAmount(value: string, optional = false) {
  return (
    (optional && value.trim() === "") ||
    (value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0)
  );
}

export default function MoneyManager() {
  const { user } = useAuth();
  const search = useSearch();
  const [activeTab, setActiveTab] = useState("mileage");
  const [shiftOffset, setShiftOffset] = useState(0);
  const [confirmImportDelete, setConfirmImportDelete] = useState<number | null>(
    null
  );
  const [importError, setImportError] = useState("");
  const [confirmWorkDelete, setConfirmWorkDelete] = useState<number | null>(
    null
  );
  const [workDeleteError, setWorkDeleteError] = useState("");
  const importRequest = useRef(0);
  useEffect(() => {
    const tab = new URLSearchParams(search).get("tab");
    if (MONEY_TABS.some(value => value === tab)) setActiveTab(tab!);
  }, [search]);
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
    mileageDate: localCalendarDate(),
    notes: "",
  });
  const [mileageForm, setMileageForm] = useState({
    miles: "",
    date: localCalendarDate(),
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
  const [envelopeForm, setEnvelopeForm] = useState({
    name: "",
    category: "savings" as "tax" | "savings" | "emergency" | "goal",
    target: "",
  });
  const [showEndShift, setShowEndShift] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddEnvelope, setShowAddEnvelope] = useState(false);

  const utils = trpc.useUtils();
  const [importPlatform, setImportPlatform] = useState("DoorDash");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Awaited<
    ReturnType<typeof utils.moneyManager.previewEarningsImport.fetch>
  > | null>(null);
  const [parsingImport, setParsingImport] = useState(false);
  const [importRetryLocked, setImportRetryLocked] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [importDeleteError, setImportDeleteError] = useState("");
  const [deleteRetryId, setDeleteRetryId] = useState<number | null>(null);
  type ImportPayload = {
    platform: string;
    fileName?: string;
    rows: NonNullable<typeof importPreview>["rows"];
  };
  const submittedImport = useRef<ImportPayload | null>(null);

  const stats = trpc.moneyManager.getShiftStats.useQuery({ period });
  const shifts = trpc.moneyManager.listShifts.useQuery({
    limit: 10,
    offset: shiftOffset,
  });
  const activeShift = trpc.moneyManager.getActiveShift.useQuery();
  const currentShiftId = activeShift.data?.id ?? activeShiftId;
  const currentPlatform = activeShift.data?.platform ?? selectedPlatform;
  const mileage = trpc.moneyManager.getMileageSummary.useQuery({
    year: new Date().getFullYear(),
  });
  const rules = trpc.moneyManager.listRules.useQuery();
  const points = trpc.moneyManager.getPointsBalance.useQuery();
  const envelopes = trpc.moneyManager.listEnvelopes.useQuery();
  const taxEnvelope = trpc.moneyManager.getEnvelopeBalance.useQuery({
    category: "tax",
  });
  const taxEstimate = trpc.moneyManager.getTaxEstimate.useQuery();

  async function refreshRecordedWork() {
    await Promise.allSettled([
      utils.moneyManager.listShifts.invalidate(),
      utils.moneyManager.getShiftStats.invalidate(),
      utils.moneyManager.getMileageSummary.invalidate(),
      utils.moneyManager.getYTDDeduction.invalidate(),
      utils.moneyManager.getShiftBreakdown.invalidate(),
      utils.moneyManager.getTaxEstimate.invalidate(),
      utils.workInsights.summary.invalidate(),
    ]);
  }
  const removeWork = trpc.workRecords.remove.useMutation({
    onSuccess: () => {
      setConfirmWorkDelete(null);
      setWorkDeleteError("");
      setShiftOffset(0);
      toast.success(
        "Manual entry and its linked mileage removed. Your active timer is unchanged."
      );
      void refreshRecordedWork();
    },
    onError: error =>
      setWorkDeleteError(
        error.message ||
          "We could not confirm deletion. Refresh your work history before retrying."
      ),
  });

  const startShift = trpc.moneyManager.startShift.useMutation({
    onSuccess: data => {
      setActiveShiftId(data.id);
      void activeShift.refetch();
      toast.success(`${selectedPlatform} work session started.`);
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
        mileageDate: localCalendarDate(),
        notes: "",
      });
      shifts.refetch();
      stats.refetch();
      points.refetch();
      void activeShift.refetch();
      void mileage.refetch();
      void taxEstimate.refetch();
      void utils.moneyManager.getShiftStats.invalidate();
      toast.success(
        "Work session saved. Earnings include base pay, tips and bonuses."
      );
    },
    onError: () => toast.error("Failed to end shift"),
  });

  const logMileage = trpc.moneyManager.logMileage.useMutation({
    onSuccess: data => {
      setMileageForm({
        miles: "",
        date: localCalendarDate(),
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
      toast.success("Financial rule created.");
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
  const importBatches = trpc.moneyManager.listImportBatches.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  const commitImport = trpc.moneyManager.commitEarningsImport.useMutation();
  const deleteImportBatch = trpc.moneyManager.deleteImportBatch.useMutation();
  const importLocked =
    commitImport.isPending ||
    importRetryLocked ||
    deleteImportBatch.isPending ||
    deleteRetryId !== null;
  async function refreshImportedEarnings() {
    await Promise.allSettled([
      importBatches.refetch(),
      stats.refetch(),
      utils.moneyManager.getShiftBreakdown.invalidate(),
      utils.moneyManager.getTaxEstimate.invalidate(),
      utils.workInsights.summary.invalidate(),
      utils.workHistory.list.invalidate(),
    ]);
  }
  async function saveImport() {
    if (
      commitImport.isPending ||
      deleteImportBatch.isPending ||
      deleteRetryId !== null ||
      !importPreview
    )
      return;
    const payload = submittedImport.current ?? {
      platform: importPlatform,
      fileName: importFileName ?? undefined,
      rows: importPreview.rows,
    };
    submittedImport.current = payload;
    setImportError("");
    setImportNotice("");
    try {
      const result = await commitImport.mutateAsync(payload);
      const message = result.duplicate
        ? "This CSV was already imported. No earnings were added again."
        : `Saved ${result.inserted} earnings row(s).`;
      setImportNotice(message);
      toast.success(message);
      submittedImport.current = null;
      setImportRetryLocked(false);
      setImportPreview(null);
      setImportFileName(null);
      await refreshImportedEarnings();
    } catch (error) {
      const code =
        error instanceof TRPCClientError ? error.data?.code : undefined;
      const definitive = [
        "BAD_REQUEST",
        "FORBIDDEN",
        "UNAUTHORIZED",
        "NOT_FOUND",
        "PAYMENT_REQUIRED",
        "PRECONDITION_FAILED",
      ].includes(code ?? "");
      if (definitive) {
        submittedImport.current = null;
        setImportRetryLocked(false);
        setImportError(
          error instanceof Error
            ? error.message
            : "Check this import and try again."
        );
      } else {
        setImportRetryLocked(true);
        setImportError(
          "We could not confirm this import. It may already have saved. Your file, platform and rows are kept on this page. Retry the same import to confirm safely before uploading another file. Do not reload or leave this page until resolved."
        );
      }
    }
  }
  async function removeImport(batchId: number) {
    if (deleteImportBatch.isPending) return;
    setImportDeleteError("");
    try {
      await deleteImportBatch.mutateAsync({ batchId });
      setConfirmImportDelete(null);
      setDeleteRetryId(null);
      setImportNotice(
        "Import removed from recorded earnings. Your original CSV is unchanged."
      );
      await refreshImportedEarnings();
    } catch (error) {
      const code =
        error instanceof TRPCClientError ? error.data?.code : undefined;
      const definitive = ["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"].includes(
        code ?? ""
      );
      setDeleteRetryId(definitive ? null : batchId);
      setImportDeleteError(
        definitive
          ? error instanceof Error
            ? error.message
            : "This import could not be removed."
          : "We could not confirm removal. Your totals may already have changed. Retry removing this same import to confirm; do not import the file again yet."
      );
    }
  }

  function handleImportFile(file: File | undefined) {
    if (!file || importLocked) return;
    const requestId = ++importRequest.current;
    setImportPreview(null);
    setImportError("");
    setImportNotice("");
    setImportFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 512_000) {
      setImportError("Choose a CSV file no larger than 500 KB.");
      return;
    }
    setParsingImport(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const preview = await utils.moneyManager.previewEarningsImport.fetch({
          csvText: String(reader.result ?? ""),
          platform: importPlatform,
        });
        if (requestId !== importRequest.current) return;
        setImportPreview(preview);
        if (preview.rows.length === 0)
          setImportError(
            "No valid earnings rows were found. Check the required column names below."
          );
      } catch {
        if (requestId === importRequest.current)
          setImportError(
            "This CSV could not be previewed. Check the file format and try again; nothing was saved."
          );
      } finally {
        if (requestId === importRequest.current) setParsingImport(false);
      }
    };
    reader.onerror = () => {
      if (requestId === importRequest.current) {
        setParsingImport(false);
        setImportError(
          "Your browser could not read this file. Choose it again to retry."
        );
      }
    };
    reader.readAsText(file);
  }

  const createEnvelope = trpc.moneyManager.createEnvelope.useMutation({
    onSuccess: () => {
      setShowAddEnvelope(false);
      setEnvelopeForm({ name: "", category: "savings", target: "" });
      envelopes.refetch();
      taxEnvelope.refetch();
      toast.success("Planning envelope created. No money has been moved.");
    },
    onError: e => toast.error(e.message || "Failed to create envelope"),
  });

  if (!user) return null;

  const s = stats.data;
  const endMileageRate = mileageRateDollars(shiftEndForm.mileageDate);
  const logMileageRate = mileageRateDollars(mileageForm.date);
  const shiftAmountsValid =
    validAmount(shiftEndForm.grossEarnings) &&
    validAmount(shiftEndForm.totalMiles) &&
    validAmount(shiftEndForm.tips, true) &&
    validAmount(shiftEndForm.bonuses, true) &&
    (Number(shiftEndForm.totalMiles) === 0 ||
      (validCalendarDate(shiftEndForm.mileageDate) &&
        shiftEndForm.mileageDate <= localCalendarDate() &&
        endMileageRate !== null));
  const mileageAmountValid =
    validAmount(mileageForm.miles) && Number(mileageForm.miles) > 0;
  const mileageValid =
    mileageAmountValid &&
    validCalendarDate(mileageForm.date) &&
    mileageForm.date <= localCalendarDate() &&
    logMileageRate !== null;
  const ruleValid =
    ruleForm.name.trim().length > 0 &&
    ruleForm.name.trim().length <= 200 &&
    [ruleForm.triggerValue, ruleForm.actionValue, ruleForm.actionPercent].every(
      value => validAmount(value, true)
    ) &&
    (ruleForm.actionPercent === "" || Number(ruleForm.actionPercent) <= 100);
  const envelopeValid =
    envelopeForm.name.trim().length > 0 &&
    validAmount(envelopeForm.target, true);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Earnings &amp; mileage
          </h1>
          <p className="text-sm text-muted-foreground">
            Track earnings, review imports, and plan what to set aside.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/work-history">View work history</Link>
          </Button>
          <ManualWorkEntry
            initialOpen={new URLSearchParams(search).get("add") === "work"}
            onSaved={() => setShiftOffset(0)}
          />
          {points.data && (
            <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {points.data.totalPoints.toLocaleString()} pts · Lv
              {points.data.level}
            </Badge>
          )}
          <Select
            value={period}
            onValueChange={v => setPeriod(v as typeof period)}
          >
            <SelectTrigger
              aria-label="Earnings summary period"
              className="w-36 min-h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <section
        className="grid gap-3 sm:grid-cols-2"
        aria-label="Ways to add earnings"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("import");
            document
              .getElementById("money-tools")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Upload className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold">Bring in past earnings</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Preview a CSV export before adding it. Check plan access before
              saving.
            </span>
          </span>
          <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0" />
        </button>
        <Link
          href="/connected-money"
          className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DollarSign className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold">Connected accounts</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              See linking availability and bank activity. Connected records are
              shown separately from these logged earnings.
            </span>
          </span>
          <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0" />
        </Link>
      </section>
      {stats.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4 text-sm"
        >
          <span>
            Your earnings summary could not load. Your recorded data has not
            been replaced with zeros.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void stats.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry summary
          </Button>
        </div>
      )}
      {/* AI Insights Panel */}
      {s && (
        <AIInsightsCard
          context="money-manager"
          title="Help understanding your earnings"
          dataContext={`Earnings this ${period}: $${(s.totalEarnings ?? 0).toFixed(2)}. Total shifts: ${s.totalShifts ?? 0}. Hours worked: ${(s.totalHours ?? 0).toFixed(1)}h. Avg $/hour: $${(s.avgPerHour ?? 0).toFixed(2)}. Total miles: ${(s.totalMiles ?? 0).toFixed(1)}. Tax deduction: ${s.taxDeduction == null ? "unavailable for the recorded dates" : `$${s.taxDeduction.toFixed(2)}`} using date-specific recorded rates, not tax saved. Period: ${period}.`}
          defaultCollapsed
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Recorded earnings",
            value: `$${(s?.totalEarnings ?? 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-500",
          },
          {
            label: "Miles",
            value: `${(s?.totalMiles ?? 0).toFixed(1)}`,
            icon: Car,
            color: "text-muted-foreground",
          },
          {
            label: "Shifts",
            value: String(s?.totalShifts ?? 0),
            icon: BarChart3,
            color: "text-muted-foreground",
          },
          {
            label: "Hours",
            value: `${(s?.totalHours ?? 0).toFixed(1)}h`,
            icon: Clock,
            color: "text-muted-foreground",
          },
          {
            label: "Gross / tracked hour",
            value: `$${(s?.avgPerHour ?? 0).toFixed(2)}`,
            icon: TrendingUp,
            color: "text-muted-foreground",
          },
          {
            label: "Mileage deduction",
            value:
              s?.taxDeduction == null
                ? "Unavailable"
                : `$${s.taxDeduction.toFixed(2)}`,
            icon: FileText,
            color: "text-primary",
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

      <p className="text-xs leading-relaxed text-muted-foreground">
        Earnings include recorded shifts and saved CSV imports, before costs and
        taxes. Hourly pay uses sessions with recorded hours; imports without
        hours are excluded. A mileage deduction reduces taxable income—it is not
        cash saved or tax owed.
      </p>
      {/* Shift Commander */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Track a work session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeShift.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : activeShift.isError ? (
            <div role="alert" className="text-sm text-muted-foreground">
              We could not check for an active session.{" "}
              <Button variant="link" onClick={() => void activeShift.refetch()}>
                Retry before starting
              </Button>
            </div>
          ) : !currentShiftId ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
              >
                <SelectTrigger
                  aria-label="Work platform"
                  className="flex-1 min-h-11"
                >
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
                {startShift.isPending ? "Starting..." : "Start work session"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-400">
                  Work session in progress — {currentPlatform}
                </span>
              </div>
              <Dialog open={showEndShift} onOpenChange={setShowEndShift}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Square className="h-3.5 w-3.5" />
                    Finish session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Finish session — {currentPlatform}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Enter base pay before tips and bonuses; each is added
                      once. Include all business miles, or enter 0 if this work
                      involved no driving. Blank tips and bonuses count as 0.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="session-base">
                          Base pay, before tips ($)
                        </Label>
                        <Input
                          className="min-h-11"
                          id="session-base"
                          type="number"
                          min="0"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          aria-invalid={
                            shiftEndForm.grossEarnings !== "" &&
                            !validAmount(shiftEndForm.grossEarnings)
                          }
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
                        <Label htmlFor="session-tips">Tips ($)</Label>
                        <Input
                          className="min-h-11"
                          id="session-tips"
                          type="number"
                          min="0"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          aria-invalid={
                            shiftEndForm.tips !== "" &&
                            !validAmount(shiftEndForm.tips)
                          }
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
                        <Label htmlFor="session-bonuses">Bonuses ($)</Label>
                        <Input
                          className="min-h-11"
                          id="session-bonuses"
                          type="number"
                          min="0"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          aria-invalid={
                            shiftEndForm.bonuses !== "" &&
                            !validAmount(shiftEndForm.bonuses)
                          }
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
                        <Label htmlFor="session-miles">Miles Driven</Label>
                        <Input
                          className="min-h-11"
                          id="session-miles"
                          type="number"
                          min="0"
                          inputMode="decimal"
                          step="0.1"
                          placeholder="0.0"
                          aria-invalid={
                            shiftEndForm.totalMiles !== "" &&
                            !validAmount(shiftEndForm.totalMiles)
                          }
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
                      <Label htmlFor="session-notes">Notes (optional)</Label>
                      <Input
                        className="min-h-11"
                        id="session-notes"
                        placeholder="Any notes about this shift..."
                        maxLength={1000}
                        value={shiftEndForm.notes}
                        onChange={e =>
                          setShiftEndForm(f => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {Number(shiftEndForm.totalMiles) > 0 && (
                      <div>
                        <Label htmlFor="session-mileage-date">
                          Date these business miles were driven
                        </Label>
                        <Input
                          className="min-h-11"
                          id="session-mileage-date"
                          type="date"
                          value={shiftEndForm.mileageDate}
                          max={localCalendarDate()}
                          onChange={event =>
                            setShiftEndForm(previous => ({
                              ...previous,
                              mileageDate: event.target.value,
                            }))
                          }
                          aria-describedby="session-mileage-date-help"
                        />
                        <p
                          id="session-mileage-date-help"
                          className="mt-1 text-xs text-muted-foreground"
                        >
                          Confirm these miles were driven on this local date.
                          For driving across dates or a rate change, record
                          mileage separately by date.
                        </p>
                      </div>
                    )}
                    {validAmount(shiftEndForm.totalMiles) && (
                      <p className="text-xs text-muted-foreground">
                        {endMileageRate === null ? (
                          "No deduction preview is available for this date."
                        ) : (
                          <>
                            Estimated mileage deduction:{" "}
                            <span className="font-medium text-green-400">
                              $
                              {(
                                Number(shiftEndForm.totalMiles) * endMileageRate
                              ).toFixed(2)}
                            </span>{" "}
                            at ${endMileageRate.toFixed(3).replace(/0+$/, "")}{" "}
                            per mile for the selected mileage date. A deduction
                            is not tax saved.
                          </>
                        )}
                      </p>
                    )}
                    {!shiftAmountsValid && (
                      <p className="text-xs text-muted-foreground">
                        Enter base pay and miles as zero or more. Optional tips
                        and bonuses must also be zero or more.
                      </p>
                    )}
                    <Button
                      className="w-full"
                      disabled={endShift.isPending || !shiftAmountsValid}
                      onClick={() =>
                        endShift.mutate({
                          shiftId: currentShiftId!,
                          grossEarnings: Number(shiftEndForm.grossEarnings),
                          tips: Number(shiftEndForm.tips || 0),
                          bonuses: Number(shiftEndForm.bonuses || 0),
                          totalMiles: Number(shiftEndForm.totalMiles || 0),
                          ...(Number(shiftEndForm.totalMiles) > 0
                            ? { mileageDate: shiftEndForm.mileageDate }
                            : {}),
                          notes: shiftEndForm.notes || undefined,
                        })
                      }
                    >
                      {endShift.isPending
                        ? "Saving..."
                        : "Save completed session"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Recent work */}
          {shifts.isLoading ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent work
              </p>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : shifts.isError ? (
            <p className="pt-2 text-xs text-muted-foreground">
              Could not load work history.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void shifts.refetch()}
              >
                Retry
              </button>
            </p>
          ) : shifts.data?.shifts && shifts.data.shifts.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent work
              </p>
              {shifts.data.shifts.map(shift => (
                <div
                  key={shift.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
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
                    <Badge variant="outline" className="text-xs">
                      {shift.entrySource === "manual"
                        ? "Added manually"
                        : "Timed session"}
                    </Badge>
                    {shift.durationMinutes && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round((shift.durationMinutes / 60) * 10) / 10}h
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      {shift.status === "active"
                        ? "In progress"
                        : `$${(
                            Number(shift.grossEarnings) +
                            Number(shift.tips) +
                            Number(shift.bonuses)
                          ).toFixed(2)}`}
                    </div>
                    {Number(shift.totalMiles) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {Number(shift.totalMiles).toFixed(1)} mi
                      </div>
                    )}
                    {shift.entrySource === "manual" &&
                      shift.status === "completed" && (
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                          <ManualWorkEntry
                            editRecordId={shift.id}
                            editLabel={`Edit manual entry for ${shift.platform}`}
                            triggerDisabled={removeWork.isPending}
                            onSaved={() => {
                              setConfirmWorkDelete(null);
                              setWorkDeleteError("");
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 min-h-10 text-muted-foreground"
                            disabled={removeWork.isPending}
                            aria-label={`Delete manual entry for ${shift.platform}`}
                            onClick={() => {
                              setConfirmWorkDelete(shift.id);
                              setWorkDeleteError("");
                            }}
                          >
                            Delete entry
                          </Button>
                        </div>
                      )}
                  </div>
                  {shift.entrySource === "manual" &&
                    shift.status === "completed" &&
                    confirmWorkDelete === shift.id && (
                      <div
                        role="group"
                        aria-label="Delete completed work"
                        className="w-full space-y-3 rounded-lg border border-destructive/30 p-4 text-sm"
                      >
                        <p>
                          Delete this completed entry and its linked mileage? It
                          will be removed from your earnings totals. Your active
                          timer and other work stay unchanged.
                        </p>
                        {workDeleteError && (
                          <p role="alert" className="text-destructive">
                            {workDeleteError}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="min-h-11"
                            disabled={removeWork.isPending}
                            onClick={() =>
                              removeWork.mutate({ recordId: shift.id })
                            }
                          >
                            {removeWork.isPending
                              ? "Deleting…"
                              : "Delete completed entry"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11"
                            disabled={removeWork.isPending}
                            onClick={() => {
                              setConfirmWorkDelete(null);
                              setWorkDeleteError("");
                            }}
                          >
                            Keep entry
                          </Button>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-2 text-center text-xs text-muted-foreground">
              No work logged yet. Add completed work above, or start a timer for
              your next session.
            </div>
          )}
          {(shifts.data?.total ?? 0) > 10 && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                disabled={shiftOffset === 0 || shifts.isFetching}
                onClick={() => setShiftOffset(value => Math.max(0, value - 10))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {shiftOffset + 1}–
                {Math.min(shiftOffset + 10, shifts.data?.total ?? 0)} of{" "}
                {shifts.data?.total}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  shiftOffset + 10 >= (shifts.data?.total ?? 0) ||
                  shifts.isFetching
                }
                onClick={() => setShiftOffset(value => value + 10)}
              >
                Next
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This starts a timer only. For optional GPS tracking, use{" "}
            <Link href="/gig-command" className="underline">
              Track work
            </Link>
            . You can record delivery, rideshare, or freelance time here.
          </p>
        </CardContent>
      </Card>

      <Tabs id="money-tools" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
          <TabsTrigger className="min-h-11" value="mileage">
            Mileage & Tax
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="import">
            Import earnings
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="rules">
            Planning rules
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="envelopes">
            Set-aside plan
          </TabsTrigger>
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
                  <Label htmlFor="mileage-miles">Miles Driven</Label>
                  <Input
                    className="min-h-11"
                    id="mileage-miles"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0.0"
                    aria-invalid={mileageForm.miles !== "" && !mileageValid}
                    value={mileageForm.miles}
                    onChange={e =>
                      setMileageForm(f => ({ ...f, miles: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mileage-purpose">Purpose</Label>
                  <Select
                    value={mileageForm.purpose}
                    onValueChange={v =>
                      setMileageForm(f => ({ ...f, purpose: v }))
                    }
                  >
                    <SelectTrigger className="min-h-11" id="mileage-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="mileage-date">
                  Date these miles were driven
                </Label>
                <Input
                  className="min-h-11"
                  id="mileage-date"
                  type="date"
                  value={mileageForm.date}
                  max={localCalendarDate()}
                  onChange={event =>
                    setMileageForm(previous => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  aria-describedby="mileage-date-help"
                />
                <p
                  id="mileage-date-help"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Use the local calendar date you drove these miles. Enter trips
                  from different dates separately; the selected date determines
                  the rate.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mileage-from">From (optional)</Label>
                  <Input
                    className="min-h-11"
                    id="mileage-from"
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
                  <Label htmlFor="mileage-to">To (optional)</Label>
                  <Input
                    className="min-h-11"
                    id="mileage-to"
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
              {mileageAmountValid && (
                <p className="text-xs text-muted-foreground">
                  {logMileageRate === null ? (
                    "No deduction preview is available for this date."
                  ) : (
                    <>
                      Estimated deduction:{" "}
                      <span className="font-medium text-green-400">
                        $
                        {(Number(mileageForm.miles) * logMileageRate).toFixed(
                          2
                        )}
                      </span>{" "}
                      at ${logMileageRate.toFixed(3).replace(/0+$/, "")} per
                      mile for the selected mileage date. A deduction reduces
                      taxable income; it is not cash saved.
                    </>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Add business miles not already recorded by a work session. Do
                not log the same trip twice. Enter miles above zero.
              </p>
              <Button
                onClick={() =>
                  logMileage.mutate({
                    miles: Number(mileageForm.miles),
                    date: mileageForm.date,
                    purpose: mileageForm.purpose,
                    startAddress: mileageForm.startAddress || undefined,
                    endAddress: mileageForm.endAddress || undefined,
                  })
                }
                disabled={logMileage.isPending || !mileageValid}
                className="w-full gap-2"
              >
                <MapPin className="h-4 w-4" />
                {logMileage.isPending ? "Logging..." : "Save business miles"}
              </Button>
            </CardContent>
          </Card>

          {/* Mileage Summary */}
          {mileage.isError && (
            <div role="alert" className="rounded-lg border p-4 text-sm">
              Mileage totals could not load.{" "}
              <Button variant="link" onClick={() => void mileage.refetch()}>
                Retry mileage
              </Button>
            </div>
          )}
          {mileage.data && (
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  Totals preserve deduction amounts and rates saved with each
                  mileage record. Older records are not recalculated using
                  today’s rate. Review the original saved rate before filing.
                </p>
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
                {mileage.data.logs.length > 0 && (
                  <details className="mt-4 border-t pt-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Review saved mileage rates
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[430px] text-left text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 pr-3">Date</th>
                            <th className="px-3 py-2 text-right">Miles</th>
                            <th className="px-3 py-2 text-right">
                              Saved rate / mile
                            </th>
                            <th className="py-2 pl-3 text-right">
                              Saved deduction
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {mileage.data.logs.slice(0, 20).map(log => (
                            <tr key={log.id} className="border-b last:border-0">
                              <td className="py-3 pr-3">
                                {new Date(log.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                {Number(log.miles).toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums">
                                $
                                {(Number(log.irsRateCents) / 100)
                                  .toFixed(3)
                                  .replace(/0+$/, "")}
                              </td>
                              <td className="py-3 pl-3 text-right tabular-nums">
                                ${(log.deductionCents / 100).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {mileage.data.logs.length > 20 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Showing 20 of {mileage.data.logs.length} saved mileage
                        records. Use your tax export for the complete record.
                      </p>
                    )}
                  </details>
                )}
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
                Upload earnings from a gig platform or freelance source. Review
                the recognized rows before saving. Nothing is imported until you
                confirm. Repeating the same normalized CSV for the same platform
                is detected. Overlapping earnings in different files or manual
                work sessions are not automatically reconciled; review them to
                avoid double-counting.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                CSV up to 500 KB. Include a date and gross/base earnings column.
                Tips, bonuses and miles are optional. Column names such as date,
                earnings, tips, bonuses and miles are recognized.
              </p>
              <a
                href="data:text/csv;charset=utf-8,date%2Cearnings%2Ctips%2Cbonuses%2Cmiles%0A"
                download="unifyone-earnings-template.csv"
                className="inline-flex text-sm font-medium text-primary underline underline-offset-4"
              >
                Download a blank CSV template
              </a>
              {importAccess.data?.hasAccess === false && (
                <div className="rounded-lg border border-primary/25 p-3 text-sm">
                  Previewing is free. Saving earnings imports requires Pro.{" "}
                  <Link href="/gig-worker-plans" className="underline">
                    Compare plans
                  </Link>{" "}
                  before uploading.
                </div>
              )}
              {importAccess.isError && (
                <p role="alert" className="text-sm">
                  We could not check import access.{" "}
                  <button
                    className="underline"
                    onClick={() => void importAccess.refetch()}
                  >
                    Retry
                  </button>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="import-platform">Platform</Label>
                  <Select
                    value={importPlatform}
                    disabled={parsingImport || importLocked}
                    onValueChange={value => {
                      importRequest.current++;
                      setImportPlatform(value);
                      setImportPreview(null);
                      setImportFileName(null);
                      setImportError("");
                      setImportNotice("");
                    }}
                  >
                    <SelectTrigger className="min-h-11" id="import-platform">
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
                  <Label htmlFor="import-file">CSV File</Label>
                  <Input
                    className="min-h-11"
                    id="import-file"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={parsingImport || importLocked}
                    onChange={e => {
                      handleImportFile(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                CSV contents are sent to preview and save your earnings. Unsaved
                details stay only in this page’s memory; they are not stored in
                your browser. Saved imports remain in your account until
                removed.
              </p>
              {importNotice && (
                <p role="status" className="rounded-lg border p-3 text-sm">
                  {importNotice}
                </p>
              )}
              {importError && (
                <p role="alert" className="text-sm text-destructive">
                  {importError}
                </p>
              )}
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

                  {importPreview.skipped.length > 0 && (
                    <details className="rounded-lg border border-amber-500/30 p-3 text-sm">
                      <summary className="cursor-pointer font-medium">
                        Review skipped rows ({importPreview.skipped.length})
                      </summary>
                      <p className="mt-2 text-xs text-muted-foreground">
                        These rows will not be saved. Correct them in your
                        original file and preview again if needed.
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {importPreview.skipped
                          .slice(0, 10)
                          .map((row, index) => (
                            <li key={index}>
                              Line {row.line}: {row.reason}
                            </li>
                          ))}
                      </ul>
                      {importPreview.skipped.length > 10 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Showing the first 10 skipped rows.
                        </p>
                      )}
                    </details>
                  )}
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
                      className="w-full border-border text-primary hover:bg-muted"
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
                        deleteImportBatch.isPending ||
                        deleteRetryId !== null ||
                        parsingImport ||
                        importAccess.isLoading ||
                        importAccess.isError ||
                        importAccess.data?.hasAccess !== true ||
                        importPreview.rows.length === 0
                      }
                      onClick={() => void saveImport()}
                    >
                      <Upload className="h-4 w-4" />
                      {commitImport.isPending
                        ? "Saving…"
                        : importRetryLocked
                          ? "Retry same import"
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
              {importDeleteError && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg border border-destructive/30 p-3 text-sm"
                >
                  {importDeleteError}
                </p>
              )}
              {importBatches.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : importBatches.isError ? (
                <div role="alert" className="text-sm text-muted-foreground">
                  Import history could not load.{" "}
                  <Button
                    variant="link"
                    onClick={() => void importBatches.refetch()}
                  >
                    Retry history
                  </Button>
                </div>
              ) : importBatches.data && importBatches.data.length > 0 ? (
                <div className="space-y-2">
                  {importBatches.data.map(batch => (
                    <div
                      key={batch.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border last:border-0"
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
                        className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                        disabled={
                          deleteImportBatch.isPending ||
                          importLocked ||
                          deleteRetryId !== null
                        }
                        onClick={() => {
                          setConfirmImportDelete(batch.id);
                          setImportDeleteError("");
                        }}
                        aria-label={`Remove import ${batch.fileName ?? batch.platform}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {confirmImportDelete === batch.id && (
                        <div className="w-full rounded-lg border border-destructive/30 p-3 text-sm">
                          <p>
                            Remove these {batch.rowCount} rows from your
                            recorded earnings
                            {typeof batch.totalDollars === "number"
                              ? ` (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(batch.totalDollars)})`
                              : ""}
                            ? This changes your totals; your original CSV is
                            untouched.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteImportBatch.isPending}
                              onClick={() => void removeImport(batch.id)}
                            >
                              {deleteImportBatch.isPending
                                ? "Removing…"
                                : deleteRetryId === batch.id
                                  ? "Retry removing import"
                                  : "Remove imported rows"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                deleteImportBatch.isPending ||
                                deleteRetryId === batch.id
                              }
                              onClick={() => {
                                setConfirmImportDelete(null);
                                setImportDeleteError("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Rules organize your recorded income and planning balances. A tracked
            allocation or set-aside does not transfer money between bank
            accounts.
          </p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rules.isLoading
                ? "Loading rules…"
                : `${rules.data?.filter(rule => rule.enabled).length ?? 0} active planning rules`}
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
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      className="min-h-11"
                      id="rule-name"
                      placeholder="e.g. Save 20% of every DoorDash payout"
                      maxLength={200}
                      value={ruleForm.name}
                      onChange={e =>
                        setRuleForm(f => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="rule-type">Rule Type</Label>
                      <Select
                        value={ruleForm.type}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            type: v as typeof ruleForm.type,
                          }))
                        }
                      >
                        <SelectTrigger className="min-h-11" id="rule-type">
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
                      <Label htmlFor="rule-trigger">Trigger</Label>
                      <Select
                        value={ruleForm.triggerType}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            triggerType: v as typeof ruleForm.triggerType,
                          }))
                        }
                      >
                        <SelectTrigger className="min-h-11" id="rule-trigger">
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
                      <Label htmlFor="rule-trigger-value">
                        Trigger Value ($)
                      </Label>
                      <Input
                        className="min-h-11"
                        id="rule-trigger-value"
                        type="number"
                        min="0"
                        inputMode="decimal"
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
                      <Label htmlFor="rule-action">Action</Label>
                      <Select
                        value={ruleForm.actionType}
                        onValueChange={v =>
                          setRuleForm(f => ({
                            ...f,
                            actionType: v as typeof ruleForm.actionType,
                          }))
                        }
                      >
                        <SelectTrigger className="min-h-11" id="rule-action">
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
                      <Label htmlFor="rule-action-value">
                        Action Value ($)
                      </Label>
                      <Input
                        className="min-h-11"
                        id="rule-action-value"
                        type="number"
                        min="0"
                        inputMode="decimal"
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
                      <Label htmlFor="rule-percent">Action % (optional)</Label>
                      <Input
                        className="min-h-11"
                        id="rule-percent"
                        type="number"
                        min="0"
                        inputMode="decimal"
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
                  {!ruleValid && (
                    <p className="text-xs text-muted-foreground">
                      Name your rule. Dollar values must be zero or more;
                      percentages must be between 0 and 100.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={createRule.isPending || !ruleValid}
                    onClick={() =>
                      createRule.mutate({
                        name: ruleForm.name.trim(),
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
                      : "Create planning rule"}
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
              <Button variant="link" onClick={() => void rules.refetch()}>
                Retry rules
              </Button>
            </div>
          )}

          {!rules.isLoading && !rules.isError && rules.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No financial rules yet.</p>
              <p className="text-xs mt-1">
                Start with a notification or a virtual set-aside rule. You stay
                in control of any real bank transfers.
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
                      aria-label={`${rule.enabled ? "Pause" : "Enable"} rule ${rule.name}`}
                      disabled={toggleRule.isPending}
                      checked={rule.enabled}
                      onCheckedChange={v =>
                        toggleRule.mutate({ ruleId: rule.id, enabled: v })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                      aria-label={`Delete rule ${rule.name}`}
                      disabled={deleteRule.isPending}
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

        {/* Envelopes / Set-Aside Tab */}
        <TabsContent value="envelopes" className="space-y-4 mt-4">
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Envelopes are a virtual plan, not bank balances. Amounts here do not
            prove money is saved or taxes are paid. Move actual funds separately
            in your bank when appropriate.
          </p>
          {/* Tax set-aside progress — balance vs quarterly estimate */}
          {(() => {
            const setAsideCents = taxEnvelope.data?.balanceCents ?? 0;
            const targetCents =
              taxEstimate.data?.quarterly?.quarterlyPaymentCents ?? 0;
            const pct =
              targetCents > 0
                ? Math.min(100, Math.round((setAsideCents / targetCents) * 100))
                : 0;
            return (
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    Tax Set-Aside
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {taxEnvelope.isLoading || taxEstimate.isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : taxEnvelope.isError || taxEstimate.isError ? (
                    <p role="alert" className="text-sm">
                      Your tax plan could not load.{" "}
                      <Button
                        variant="link"
                        onClick={() => {
                          void taxEnvelope.refetch();
                          void taxEstimate.refetch();
                        }}
                      >
                        Retry tax plan
                      </Button>
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-green-400">
                          {fmtCents(setAsideCents)}
                        </span>{" "}
                        allocated in your plan toward{" "}
                        <span className="font-semibold">
                          {fmtCents(targetCents)}
                        </span>{" "}
                        estimated quarterly tax
                      </p>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {targetCents === 0
                          ? "Log some shifts to see your estimated quarterly tax."
                          : setAsideCents >= targetCents
                            ? "Your virtual allocation meets this estimate. Check your actual savings and tax payments separately."
                            : `${pct}% allocated in your plan. This estimate may change as you add income.`}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {envelopes.data?.length ?? 0} envelope
              {(envelopes.data?.length ?? 0) === 1 ? "" : "s"}
            </p>
            <Dialog open={showAddEnvelope} onOpenChange={setShowAddEnvelope}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Envelope
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Envelope</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="envelope-name">Envelope Name</Label>
                    <Input
                      className="min-h-11"
                      id="envelope-name"
                      placeholder="e.g. Quarterly Taxes"
                      maxLength={100}
                      value={envelopeForm.name}
                      onChange={e =>
                        setEnvelopeForm(f => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="envelope-category">Category</Label>
                      <Select
                        value={envelopeForm.category}
                        onValueChange={v =>
                          setEnvelopeForm(f => ({
                            ...f,
                            category: v as typeof envelopeForm.category,
                          }))
                        }
                      >
                        <SelectTrigger
                          className="min-h-11"
                          id="envelope-category"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENVELOPE_CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="envelope-target">
                        Target ($, optional)
                      </Label>
                      <Input
                        className="min-h-11"
                        id="envelope-target"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        aria-invalid={
                          envelopeForm.target !== "" &&
                          !validAmount(envelopeForm.target)
                        }
                        value={envelopeForm.target}
                        onChange={e =>
                          setEnvelopeForm(f => ({
                            ...f,
                            target: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  {!envelopeValid && (
                    <p className="text-xs text-muted-foreground">
                      Enter an envelope name. If you add a target, use zero or a
                      positive dollar amount.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={createEnvelope.isPending || !envelopeValid}
                    onClick={() =>
                      createEnvelope.mutate({
                        name: envelopeForm.name.trim(),
                        category: envelopeForm.category,
                        targetCents: envelopeForm.target
                          ? Math.round(Number(envelopeForm.target) * 100)
                          : undefined,
                      })
                    }
                  >
                    {createEnvelope.isPending
                      ? "Creating..."
                      : "Create Envelope"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {envelopes.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {envelopes.isError && (
            <div className="text-center py-12 text-muted-foreground">
              <PiggyBank className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Could not load envelopes.</p>
              <Button variant="link" onClick={() => void envelopes.refetch()}>
                Retry envelopes
              </Button>
            </div>
          )}

          {!envelopes.isLoading &&
            !envelopes.isError &&
            envelopes.data?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <PiggyBank className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No envelopes yet.</p>
                <p className="text-xs mt-1">
                  Add a tax or savings goal. Planning rules can record virtual
                  allocations as income is logged; they do not move money.
                </p>
              </div>
            )}

          <div className="grid gap-3 sm:grid-cols-2">
            {envelopes.data?.map(env => {
              const pct =
                env.targetCents && env.targetCents > 0
                  ? Math.min(
                      100,
                      Math.round((env.balanceCents / env.targetCents) * 100)
                    )
                  : null;
              return (
                <Card key={env.id} className="border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {env.name}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {env.category}
                        </Badge>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-green-400">
                          {fmtCents(env.balanceCents)}
                        </div>
                        {env.targetCents ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Target className="h-3 w-3" />
                            {fmtCents(env.targetCents)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {pct !== null && <Progress value={pct} className="h-2" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
