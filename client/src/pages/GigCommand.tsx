import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TaxExportButton } from "@/components/TaxExportButton";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Navigation,
  Car,
  Play,
  MapPin,
  Square,
  DollarSign,
  Route,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import AIInsightsCard from "@/components/AIInsightsCard";
import GigIQDashboard from "@/components/GigIQDashboard";

const GIG_PLATFORMS = [
  "DoorDash",
  "Uber Eats",
  "Instacart",
  "Lyft",
  "Uber",
  "Amazon Flex",
  "Shipt",
  "Grubhub",
  "Upwork",
  "Fiverr",
  "Client / project",
  "Other",
];

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function DemandBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-muted/50 text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[level]}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)} Demand
    </span>
  );
}

function localCalendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export default function GigCommand() {
  useAuth();
  const utils = trpc.useUtils();
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gpsGeneration = useRef(0);
  const restoredShiftId = useRef<number | null>(null);
  const pendingEnd = useRef<{
    shiftId: number;
    grossEarnings: number;
    tips: number;
    bonuses: number;
    totalMiles: number;
    mileageDate?: string;
  } | null>(null);
  const [endRetryLocked, setEndRetryLocked] = useState(false);
  const [endMileageDate, setEndMileageDate] = useState(localCalendarDate);
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [platform, setPlatform] = useState("DoorDash");
  const [customPlatform, setCustomPlatform] = useState("");
  const [gpsOptIn, setGpsOptIn] = useState(false);
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const namedWork = platform === "Other" || platform === "Client / project";
  const workName = namedWork ? customPlatform.trim() : platform;
  const [currentPos, setCurrentPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routePath, setRoutePath] = useState<
    Array<{ lat: number; lng: number }>
  >([]);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [intelligencePos, setIntelligencePos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Shift end form state
  const [endEarnings, setEndEarnings] = useState("");
  const [endTips, setEndTips] = useState("0");
  const [endBonuses, setEndBonuses] = useState("0");
  const [endFormError, setEndFormError] = useState("");
  const [endMiles, setEndMiles] = useState("");
  const [showEndForm, setShowEndForm] = useState(false);

  // tRPC queries
  const {
    data: activeShift,
    refetch: refetchActive,
    isLoading: loadingActive,
    isError: activeError,
  } = trpc.moneyManager.getActiveShift.useQuery(undefined, {
    refetchInterval: timerActive ? 30000 : false,
  });
  const {
    data: mileageSummary,
    isLoading: loadingMileage,
    isError: mileageError,
  } = trpc.moneyManager.getMileageSummary.useQuery({
    year: new Date().getFullYear(),
  });
  const {
    data: shiftsData,
    isLoading: loadingShifts,
    isError: shiftsError,
  } = trpc.moneyManager.listShifts.useQuery({
    limit: 10,
    offset: 0,
  });
  const recentShifts = shiftsData?.shifts ?? [];
  // Route intelligence is the Pro "Route Optimizer" feature — resolve access so
  // we can skip the query entirely for Starter (no wasted request / LLM spend)
  // and show an upgrade state instead of a misleading error.
  const routeAccess = trpc.gigWorker.checkFeatureAccess.useQuery({
    feature: "route_optimizer",
  });
  const routeLocked = routeAccess.data?.hasAccess === false;
  const {
    data: routeIntelligence,
    refetch: refetchIntelligence,
    isFetching: fetchingIntel,
    isError: intelError,
  } = trpc.moneyManager.getRouteIntelligence.useQuery(
    {
      lat: intelligencePos?.lat ?? 47.6062,
      lng: intelligencePos?.lng ?? -122.3321,
      platform: workName || platform,
    },
    {
      enabled: !!intelligencePos && routeAccess.data?.hasAccess === true,
      staleTime: 5 * 60 * 1000,
    }
  );

  // tRPC mutations
  const startShift = trpc.moneyManager.startShift.useMutation({
    onError: e => toast.error(e.message),
  });
  const endShift = trpc.moneyManager.endShift.useMutation({
    onError: e => toast.error(e.message),
  });
  const updateGPS = trpc.moneyManager.updateShiftGPS.useMutation({
    onError: e => toast.error(e.message),
  });
  const generateShortcuts = trpc.moneyManager.generateAIShortcuts.useMutation({
    onError: e => toast.error(e.message),
  });
  const [shortcuts, setShortcuts] = useState<
    Array<{
      title: string;
      description: string;
      category: string;
      impact: string;
      emoji: string;
    }>
  >([]);

  // Elapsed timer
  useEffect(() => {
    if (!timerActive || !startTs) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTs);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, startTs]);

  // Location is optional. A shift starts without requesting browser permission.
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError(
        "This browser does not support location. Your timer still works; enter miles manually when you finish."
      );
      return;
    }
    if (watchIdRef.current !== null)
      navigator.geolocation.clearWatch(watchIdRef.current);
    const generation = ++gpsGeneration.current;
    setGpsError("");
    setGpsRequesting(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        if (generation !== gpsGeneration.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsRequesting(false);
        setGpsEnabled(true);
        positionRef.current = { lat, lng };
        setCurrentPos({ lat, lng });
        setRoutePath(prev => [...prev, { lat, lng }]);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          if (markerRef.current) markerRef.current.position = { lat, lng };
          if (polylineRef.current)
            polylineRef.current
              .getPath()
              .push(new google.maps.LatLng(lat, lng));
        }
        setIntelligencePos(prev => prev ?? { lat, lng });
      },
      error => {
        if (generation !== gpsGeneration.current) return;
        if (watchIdRef.current !== null)
          navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setGpsRequesting(false);
        setGpsEnabled(false);
        positionRef.current = null;
        setCurrentPos(null);
        setIntelligencePos(null);
        setGpsError(
          error.code === 1
            ? "Location permission was declined. Your timer is still running. You can enter mileage manually, or enable location in your browser and try again."
            : "A location fix is unavailable. Your timer is still running; enter mileage manually or try GPS again."
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    gpsGeneration.current++;
    setCurrentPos(null);
    if (watchIdRef.current !== null)
      navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    gpsIntervalRef.current = null;
    positionRef.current = null;
    setGpsEnabled(false);
    setGpsRequesting(false);
    setIntelligencePos(null);
  }, []);

  // Reconcile server identity, including an active shift replaced in another tab.
  useEffect(() => {
    if (activeShift === undefined) return;
    const identity = activeShift?.id ?? null;
    if (identity !== restoredShiftId.current) {
      stopGPS();
      setRoutePath([]);
      setGpsError("");
      pendingEnd.current = null;
      setEndRetryLocked(false);
      setEndEarnings("");
      setEndTips("0");
      setEndBonuses("0");
      setEndMiles("");
      setEndMileageDate(localCalendarDate());
      setEndFormError("");
      setShowEndForm(false);
      restoredShiftId.current = identity;
    }
    if (!activeShift) {
      setTimerActive(false);
      setStartTs(null);
      setElapsed(0);
      stopGPS();
    } else {
      const startTime = new Date(activeShift.startTime).getTime();
      setStartTs(startTime);
      setElapsed(Math.max(0, Date.now() - startTime));
      setTimerActive(true);
      setPlatform(
        GIG_PLATFORMS.includes(activeShift.platform)
          ? activeShift.platform
          : "Other"
      );
      setCustomPlatform(activeShift.platform);
    }
  }, [activeShift, stopGPS]);

  useEffect(
    () => () => {
      gpsGeneration.current++;
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    },
    []
  );

  // Read the latest fix from a ref: moving should not restart the sync timer.
  const activeShiftId = activeShift?.id;
  useEffect(() => {
    if (!timerActive || !activeShiftId || !gpsEnabled) return;
    const interval = setInterval(() => {
      const position = positionRef.current;
      if (position)
        void updateGPS
          .mutateAsync({
            shiftId: activeShiftId,
            ...position,
            appendWaypoint: true,
          })
          .catch(() => {});
    }, 60000);
    gpsIntervalRef.current = interval;
    return () => clearInterval(interval);
    // The mutation identity changes on render; the active ID is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, activeShiftId, gpsEnabled]);

  async function refreshWorkData() {
    await Promise.allSettled([
      utils.moneyManager.getActiveShift.invalidate(),
      utils.moneyManager.listShifts.invalidate(),
      utils.moneyManager.getShiftStats.invalidate(),
      utils.moneyManager.getMileageSummary.invalidate(),
      utils.moneyManager.getYTDDeduction.invalidate(),
      utils.moneyManager.getShiftBreakdown.invalidate(),
      utils.workInsights.summary.invalidate(),
    ]);
  }

  const handleStartShift = async () => {
    if (!workName || startShift.isPending || timerActive) return;
    try {
      const created = await startShift.mutateAsync({ platform: workName });
      const startedAt = new Date(created.startTime).getTime();
      restoredShiftId.current = created.id;
      setStartTs(startedAt);
      setTimerActive(true);
      setElapsed(Math.max(0, Date.now() - startedAt));
      setRoutePath([]);
      setGpsError("");
      if (gpsOptIn) startGPS();
      void refreshWorkData();
      toast.success(`${workName} shift started. Your timer is running.`);
    } catch {
      // A response may be lost after insertion. Reconcile before another start.
      await refetchActive();
    }
  };

  const endAmounts = [endEarnings, endTips, endBonuses, endMiles];
  const endValuesValid = endAmounts.every(
    (value, index) =>
      value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= (index === 3 ? 999999.99 : 99999999.99) &&
      Number(value) === Number(Number(value).toFixed(2))
  );
  const totalReceived = endValuesValid
    ? Number(endEarnings) + Number(endTips) + Number(endBonuses)
    : null;
  const handleEndShift = async () => {
    if (!activeShift || endShift.isPending) return;
    if (!endRetryLocked && !endValuesValid) {
      setEndFormError(
        "Enter earnings and miles as zero or a positive number. Use at most two decimal places; pay must be below $100 million and miles below 1 million. Enter 0 explicitly if you earned nothing or did not drive."
      );
      return;
    }
    if (
      !endRetryLocked &&
      Number(endMiles) > 0 &&
      (!validCalendarDate(endMileageDate) ||
        endMileageDate > localCalendarDate() ||
        endMileageDate < localCalendarDate(new Date(activeShift.startTime)))
    ) {
      setEndFormError(
        "Choose the date you drove these miles, within this session and through today. Split mileage driven on different dates into separate dated mileage entries."
      );
      return;
    }
    setEndFormError("");
    const payload = pendingEnd.current ?? {
      shiftId: activeShift.id,
      grossEarnings: Number(endEarnings),
      tips: Number(endTips),
      bonuses: Number(endBonuses),
      totalMiles: Number(endMiles),
      ...(Number(endMiles) > 0 ? { mileageDate: endMileageDate } : {}),
    };
    pendingEnd.current = payload;
    try {
      await endShift.mutateAsync(payload);
      pendingEnd.current = null;
      setEndRetryLocked(false);
      setTimerActive(false);
      setStartTs(null);
      setElapsed(0);
      setShowEndForm(false);
      setEndEarnings("");
      setEndTips("0");
      setEndBonuses("0");
      setEndMiles("");
      stopGPS();
      void refreshWorkData();
      toast.success("Shift saved. Your earnings and mileage are updating.");
    } catch (error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "BAD_REQUEST"
      ) {
        pendingEnd.current = null;
        setEndRetryLocked(false);
        setEndFormError(error.message);
        return;
      }
      setEndRetryLocked(true);
      setEndFormError(
        "The save could not be confirmed. Your exact pay, miles and date are preserved for a safe retry. Check shift status before entering different work."
      );
    }
  };

  const handleGenerateShortcuts = async () => {
    try {
      const result = await generateShortcuts.mutateAsync({
        platform: workName || platform,
      });
      setShortcuts(result);
    } catch {
      toast.error("Could not generate AI shortcuts right now.");
    }
  };

  const ytdDeduction = mileageSummary?.totalDeduction ?? 0;
  const completedShifts = recentShifts.filter(
    shift => shift.status === "completed"
  );
  const timedShifts = completedShifts
    .filter(shift => (shift.durationMinutes ?? 0) > 0)
    .slice(0, 5);
  const totalTimedHours = timedShifts.reduce(
    (sum, shift) => sum + (shift.durationMinutes ?? 0) / 60,
    0
  );
  const earningsPerHour =
    totalTimedHours > 0
      ? timedShifts.reduce(
          (sum, shift) =>
            sum +
            Number(shift.grossEarnings ?? 0) +
            Number(shift.tips ?? 0) +
            Number(shift.bonuses ?? 0),
          0
        ) / totalTimedHours
      : null;

  const impactColor = (impact: string) =>
    ({
      high: "text-emerald-400",
      medium: "text-amber-400",
      low: "text-muted-foreground",
    })[impact] ?? "text-muted-foreground";

  return (
    <>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-6 w-6 text-primary" />
              Your work session
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track delivery, rideshare or freelance work. Start a timer, then
              record what you earned.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {timerActive && (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1 font-sans"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2 inline-block" />
                {formatDuration(elapsed)}
              </Badge>
            )}
          </div>
        </div>

        {/* Tax export (Pro) — download the full shift + mileage + tax record */}
        <div className="flex items-center justify-end">
          <TaxExportButton />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: Shift Control + Stats */}
          <div className="xl:col-span-1 space-y-4">
            {/* Shift Control Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  Start and finish work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingActive ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : activeError ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <p>
                      We could not check whether a shift is already running.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => void refetchActive()}
                    >
                      Retry shift status
                    </Button>
                  </div>
                ) : !timerActive ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="shift-platform" className="text-sm">
                        Platform or type of work
                      </Label>
                      <Select
                        value={platform}
                        onValueChange={setPlatform}
                        disabled={startShift.isPending}
                      >
                        <SelectTrigger id="shift-platform" className="min-h-11">
                          <SelectValue />
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
                    {namedWork && (
                      <div className="space-y-2">
                        <Label htmlFor="shift-work-name">
                          Client, project or platform name
                        </Label>
                        <Input
                          className="min-h-11"
                          id="shift-work-name"
                          value={customPlatform}
                          maxLength={100}
                          placeholder="e.g. Design project for Acme"
                          onChange={event =>
                            setCustomPlatform(event.target.value)
                          }
                        />
                      </div>
                    )}
                    <div className="rounded-lg border p-3 text-sm">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={gpsOptIn}
                          disabled={startShift.isPending}
                          onChange={event => setGpsOptIn(event.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>Use GPS for this shift (optional)</span>
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">
                        GPS records route points while this page is open. You
                        will still confirm total business miles when finishing.
                        Leave it off for desk work or manual mileage.
                      </p>
                    </div>
                    <Button
                      className="min-h-12 w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={handleStartShift}
                      disabled={startShift.isPending || !workName}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {startShift.isPending ? "Starting…" : "Start Shift"}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Timer display */}
                    <div className="text-center py-3">
                      <div className="font-sans text-4xl font-bold text-foreground tabular-nums">
                        {formatDuration(elapsed)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeShift?.platform ?? workName} shift in progress
                      </p>
                    </div>

                    {/* GPS indicator */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        GPS Tracking
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          {gpsRequesting
                            ? "Waiting for permission / location…"
                            : gpsEnabled
                              ? `Active · ${routePath.length} points`
                              : "Off · manual mileage"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={
                            gpsEnabled || gpsRequesting ? stopGPS : startGPS
                          }
                        >
                          {gpsEnabled || gpsRequesting
                            ? "Stop GPS"
                            : "Enable GPS"}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      The timer keeps running until you end the shift, including
                      waiting and admin time. GPS stops when you close this
                      page. Enter your final mileage when saving.
                    </p>
                    {gpsError && (
                      <p
                        role="status"
                        className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-300"
                      >
                        {gpsError}
                      </p>
                    )}
                    {!showEndForm ? (
                      <Button
                        variant="outline"
                        className="min-h-12 w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowEndForm(true)}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        End Shift
                      </Button>
                    ) : (
                      <form
                        className="space-y-4 border border-border rounded-lg p-4"
                        onSubmit={event => {
                          event.preventDefault();
                          void handleEndShift();
                        }}
                        noValidate
                      >
                        <div>
                          <h3 className="font-semibold">
                            Finish and save your shift
                          </h3>
                          <p
                            id="shift-earnings-help"
                            className="mt-1 text-xs text-muted-foreground"
                          >
                            Base pay excludes tips and bonuses. If your app only
                            shows a combined total, enter it as base pay and
                            keep tips and bonuses at 0 so money is counted once.
                          </p>
                        </div>
                        <fieldset
                          disabled={endShift.isPending || endRetryLocked}
                          className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3"
                        >
                          {(
                            [
                              [
                                "shift-base-pay",
                                "Base pay ($)",
                                endEarnings,
                                setEndEarnings,
                              ],
                              ["shift-tips", "Tips ($)", endTips, setEndTips],
                              [
                                "shift-bonuses",
                                "Bonuses ($)",
                                endBonuses,
                                setEndBonuses,
                              ],
                              [
                                "shift-miles",
                                "Business miles",
                                endMiles,
                                setEndMiles,
                              ],
                            ] as const
                          ).map(([id, label, value, change]) => (
                            <div key={id}>
                              <Label htmlFor={id}>{label}</Label>
                              <Input
                                id={id}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step={id === "shift-miles" ? "any" : "0.01"}
                                value={value}
                                onChange={event => {
                                  change(event.target.value);
                                  setEndFormError("");
                                }}
                                className="mt-1 min-h-11"
                                aria-describedby={
                                  id === "shift-miles"
                                    ? "shift-mileage-help"
                                    : "shift-earnings-help"
                                }
                                aria-invalid={
                                  value !== "" &&
                                  (!Number.isFinite(Number(value)) ||
                                    Number(value) < 0)
                                }
                              />
                            </div>
                          ))}
                        </fieldset>
                        {Number(endMiles) > 0 && (
                          <div>
                            <Label htmlFor="shift-mileage-date">
                              Date these business miles were driven
                            </Label>
                            <Input
                              id="shift-mileage-date"
                              type="date"
                              className="mt-1 min-h-11"
                              disabled={endShift.isPending || endRetryLocked}
                              value={endMileageDate}
                              min={
                                activeShift
                                  ? localCalendarDate(
                                      new Date(activeShift.startTime)
                                    )
                                  : undefined
                              }
                              max={localCalendarDate()}
                              onChange={event => {
                                setEndMileageDate(event.target.value);
                                setEndFormError("");
                              }}
                            />
                            <p className="mt-2 text-xs text-muted-foreground">
                              Confirm all miles were driven on this local
                              calendar date. For multiple dates, save zero here
                              and add separate dated mileage entries in
                              Earnings.
                            </p>
                          </div>
                        )}
                        <p
                          id="shift-mileage-help"
                          className="text-xs text-muted-foreground"
                        >
                          Include business driving between jobs. Enter 0 if you
                          did not drive; do not include personal miles.
                        </p>
                        <div className="rounded-lg bg-muted/30 p-3 text-sm">
                          <span>Total received: </span>
                          <strong>
                            {totalReceived === null
                              ? "Complete the fields above"
                              : totalReceived.toLocaleString("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                })}
                          </strong>
                        </div>
                        {endFormError && (
                          <p role="alert" className="text-sm text-destructive">
                            {endFormError}
                          </p>
                        )}
                        {endRetryLocked && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void refetchActive()}
                          >
                            Check shift status
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="submit"
                            className="min-h-11 flex-1 bg-red-600 hover:bg-red-500 text-white"
                            disabled={endShift.isPending || !activeShift}
                          >
                            {endShift.isPending
                              ? "Saving…"
                              : endRetryLocked
                                ? "Retry same shift save"
                                : "Save and end shift"}
                          </Button>
                          <Button
                            type="button"
                            className="min-h-11"
                            variant="outline"
                            disabled={endShift.isPending}
                            onClick={() => setShowEndForm(false)}
                          >
                            Keep working
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border bg-card">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">
                      Gross per hour
                    </span>
                  </div>
                  {loadingShifts ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {shiftsError || earningsPerHour === null
                        ? "—"
                        : `$${earningsPerHour?.toFixed(2) ?? "unavailable"}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {timedShifts.length
                      ? `${timedShifts.length} recent completed shifts · before costs/tax`
                      : "Complete a shift to see your rate"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Route className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      YTD Miles
                    </span>
                  </div>
                  {loadingMileage ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {mileageError
                        ? "—"
                        : (mileageSummary?.totalMiles ?? 0).toFixed(0)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">miles logged</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Tax Deduction
                    </span>
                  </div>
                  {loadingMileage ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {mileageError ? "—" : `$${ytdDeduction.toFixed(0)}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recorded mileage deductions
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Completed shifts
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {shiftsError ? "—" : completedShifts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">recent shifts</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Panel */}
            <GigIQDashboard period="month" className="mb-6" />

            <AIInsightsCard
              context="gig-command"
              title="Gig Command AI"
              dataContext={`Platform: ${activeShift?.platform ?? workName}. Gross earnings per hour (last 5 shifts): $${earningsPerHour?.toFixed(2) ?? "unavailable"}. YTD miles: ${(mileageSummary?.totalMiles ?? 0).toFixed(1)}. YTD tax deduction: $${ytdDeduction.toFixed(2)} (recorded mileage deductions; not tax savings). Recent shifts: ${recentShifts.length}. Shift currently ${timerActive ? `active (${formatDuration(elapsed)} elapsed)` : "not active"}.`}
              defaultCollapsed={true}
            />

            {/* AI Shortcuts */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Shortcuts
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11 text-xs"
                    onClick={handleGenerateShortcuts}
                    disabled={generateShortcuts.isPending}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1 ${generateShortcuts.isPending ? "animate-spin" : ""}`}
                    />
                    {generateShortcuts.isPending ? "Generating…" : "Generate"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {shortcuts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Click Generate to get AI-powered tips based on your shift
                    history.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shortcuts.map((s, i) => (
                      <div
                        key={i}
                        className="flex gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg leading-none mt-0.5">
                          {s.emoji}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-foreground">
                              {s.title}
                            </p>
                            <span
                              className={`text-xs font-medium ${impactColor(s.impact)}`}
                            >
                              {s.impact} impact
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {s.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Map + Intelligence + Mileage */}
          <div className="xl:col-span-2 space-y-4">
            {/* Map */}
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Route Map
                  {gpsEnabled && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs"
                    >
                      Live GPS
                    </Badge>
                  )}
                </CardTitle>
                {currentPos && (
                  <span className="text-xs text-muted-foreground font-sans">
                    {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {gpsEnabled && currentPos ? (
                  <div className="h-[280px] md:h-[400px]">
                    <MapView
                      initialCenter={
                        currentPos ?? { lat: 47.6062, lng: -122.3321 }
                      }
                      initialZoom={13}
                      onMapReady={map => {
                        mapRef.current = map;

                        // Draw route polyline
                        polylineRef.current = new google.maps.Polyline({
                          map,
                          path: routePath,
                          strokeColor: "#f39450",
                          strokeOpacity: 0.9,
                          strokeWeight: 4,
                        });

                        // Current position marker
                        if (currentPos) {
                          markerRef.current =
                            new google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: currentPos,
                              title: "Current Position",
                            });
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <h3 className="font-medium">Location is optional</h3>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Start your shift without GPS. Your timer and earnings log
                      work for driving and desk work alike. Enable GPS during a
                      shift to record route points.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Route Intelligence */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    Route Intelligence
                    {routeIntelligence && (
                      <DemandBadge level={routeIntelligence.estimatedDemand} />
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11 text-xs"
                    onClick={() => void refetchIntelligence()}
                    disabled={
                      fetchingIntel ||
                      routeAccess.data?.hasAccess !== true ||
                      !gpsEnabled ||
                      !intelligencePos
                    }
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1 ${fetchingIntel ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {routeLocked ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Route intelligence — hot zones, timing &amp; earnings tips
                      — is a Pro feature.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Link href="/gig-worker-plans">Upgrade to Pro</Link>
                    </Button>
                  </div>
                ) : !intelligencePos ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>
                      Optional: enable GPS during a shift to load route
                      intelligence.
                    </p>
                  </div>
                ) : fetchingIntel ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : intelError ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                    <p>Could not load route intelligence. Try refreshing.</p>
                  </div>
                ) : routeIntelligence ? (
                  <div className="space-y-4">
                    {/* Tips row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Timing
                        </p>
                        <p className="text-sm text-foreground">
                          {routeIntelligence.timingTip}
                        </p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Earnings
                        </p>
                        <p className="text-sm text-foreground">
                          {routeIntelligence.earningsTip}
                        </p>
                      </div>
                    </div>

                    {/* Weather alert */}
                    {routeIntelligence.weatherAlert && (
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-300">
                          {routeIntelligence.weatherAlert}
                        </p>
                      </div>
                    )}

                    {/* Hot zones */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Hot Zones Near You
                      </p>
                      <div className="space-y-2">
                        {routeIntelligence.hotZones?.map(
                          (
                            zone: {
                              name: string;
                              demand: "high" | "medium" | "low";
                              reason: string;
                            },
                            i: number
                          ) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 bg-muted/20 rounded-lg px-3 py-2.5"
                            >
                              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-foreground">
                                    {zone.name}
                                  </span>
                                  <DemandBadge level={zone.demand} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {zone.reason}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Could not load intelligence data. Try refreshing.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Mileage Log + Tax Calculator */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  Recent work &amp; mileage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Your mileage record</p>
                  <p className="mt-1 text-muted-foreground">
                    {loadingMileage
                      ? "Loading mileage…"
                      : mileageError
                        ? "Mileage could not load. Please retry from Money Manager."
                        : `${(mileageSummary?.totalMiles ?? 0).toFixed(1)} business miles logged this year · $${ytdDeduction.toFixed(2)} in recorded deductions.`}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    A deduction reduces taxable income; it is not cash saved or
                    tax owed. Use the tax tools for an estimate based on your
                    circumstances.
                  </p>
                </div>

                {/* Recent shifts table */}
                {loadingShifts ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : shiftsError ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                    <p>Could not load shifts. Try again later.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Date</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead className="text-right">Miles</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentShifts.slice(0, 8).map(shift => {
                          const miles = Number(shift.totalMiles ?? 0);
                          const earnings =
                            Number(shift.grossEarnings ?? 0) +
                            Number(shift.tips ?? 0) +
                            Number(shift.bonuses ?? 0);
                          return (
                            <TableRow
                              key={shift.id}
                              className="border-border/20 hover:bg-muted/20"
                            >
                              <TableCell className="text-muted-foreground">
                                {new Date(shift.startTime).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {shift.platform}
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {miles.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-400">
                                ${earnings.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {shift.status === "active"
                                  ? "In progress"
                                  : shift.status === "completed"
                                    ? "Saved"
                                    : "Cancelled"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {recentShifts.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-6 text-center text-muted-foreground"
                            >
                              No shifts logged yet. Start your first shift
                              above.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
