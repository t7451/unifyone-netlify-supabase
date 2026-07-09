import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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

const IRS_RATE = 0.7; // 2025 rate per mile
const GIG_PLATFORMS = [
  "DoorDash",
  "Uber Eats",
  "Instacart",
  "Lyft",
  "Uber",
  "Amazon Flex",
  "Shipt",
  "Grubhub",
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
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[level]}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)} Demand
    </span>
  );
}

export default function GigCommand() {
  useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [platform, setPlatform] = useState("DoorDash");
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
  const [_showShortcuts, setShowShortcuts] = useState(false);

  // Shift end form state
  const [endEarnings, setEndEarnings] = useState("");
  const [endTips, setEndTips] = useState("");
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
      platform,
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
  const { data: gigSubscription } = trpc.gigWorker.getSubscription.useQuery();
  const [shortcuts, setShortcuts] = useState<
    Array<{
      title: string;
      description: string;
      category: string;
      impact: string;
      emoji: string;
    }>
  >([]);

  // Restore active shift timer on mount
  useEffect(() => {
    if (activeShift && !timerActive) {
      const startTime = new Date(activeShift.startTime).getTime();
      setStartTs(startTime);
      setTimerActive(true);
      setPlatform(activeShift.platform);
    }
    // timerActive is intentionally omitted — we only want to restore state when
    // activeShift is (re)loaded, not when the timer is toggled by user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShift]);

  // Elapsed timer
  useEffect(() => {
    if (!timerActive || !startTs) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTs);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, startTs]);

  // GPS tracking
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsEnabled(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentPos({ lat, lng });
        setRoutePath(prev => [...prev, { lat, lng }]);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          if (markerRef.current) {
            markerRef.current.position = { lat, lng };
          }
          if (polylineRef.current) {
            const path = polylineRef.current.getPath();
            path.push(new google.maps.LatLng(lat, lng));
          }
        }
        // Set intelligence position on first fix
        setIntelligencePos(prev => prev ?? { lat, lng });
      },
      err => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    setGpsEnabled(false);
  }, []);

  // Sync waypoints to server every 60s when shift is active
  useEffect(() => {
    if (!timerActive || !activeShift || !currentPos) return;
    const interval = setInterval(async () => {
      if (currentPos) {
        // A failed GPS sync should not throw unhandled; the mutation's
        // onError already surfaces a toast.
        await updateGPS
          .mutateAsync({
            shiftId: activeShift.id,
            lat: currentPos.lat,
            lng: currentPos.lng,
            appendWaypoint: true,
          })
          .catch(() => {});
      }
    }, 60000);
    gpsIntervalRef.current = interval;
    return () => clearInterval(interval);
    // updateGPS mutation identity changes on every render; we only want to
    // restart the interval when shift state or position changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, activeShift, currentPos]);

  const handleStartShift = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
        })
      ).catch(() => null);

      await startShift.mutateAsync({
        platform,
        startLat: pos?.coords.latitude ?? undefined,
        startLng: pos?.coords.longitude ?? undefined,
      });

      const now = Date.now();
      setStartTs(now);
      setTimerActive(true);
      setElapsed(0);
      setRoutePath([]);
      startGPS();
      await refetchActive();
      toast.success(`${platform} shift started! GPS tracking active.`);
    } catch (e: unknown) {
      toast.error(`Failed to start shift: ${(e as Error).message}`);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    try {
      await endShift.mutateAsync({
        shiftId: activeShift.id,
        grossEarnings: parseFloat(endEarnings) || 0,
        tips: parseFloat(endTips) || 0,
        totalMiles: parseFloat(endMiles) || 0,
      });
      setTimerActive(false);
      setStartTs(null);
      setElapsed(0);
      setShowEndForm(false);
      setEndEarnings("");
      setEndTips("");
      setEndMiles("");
      stopGPS();
      await refetchActive();
      toast.success("Shift completed! Earnings and mileage logged.");
    } catch (e: unknown) {
      toast.error(`Failed to end shift: ${(e as Error).message}`);
    }
  };

  const handleGenerateShortcuts = async () => {
    try {
      const result = await generateShortcuts.mutateAsync({ platform });
      setShortcuts(result);
      setShowShortcuts(true);
    } catch {
      toast.error("Could not generate AI shortcuts right now.");
    }
  };

  const ytdDeduction = (mileageSummary?.totalMiles ?? 0) * IRS_RATE;
  const earningsPerHour =
    recentShifts.length > 0
      ? recentShifts
          .slice(0, 5)
          .reduce((s, r) => s + parseFloat(String(r.grossEarnings)), 0) /
        Math.max(
          recentShifts
            .slice(0, 5)
            .reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / 60,
          0.1
        )
      : 0;

  const impactColor = (impact: string) =>
    ({
      high: "text-emerald-400",
      medium: "text-amber-400",
      low: "text-gray-400",
    })[impact] ?? "text-gray-400";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-6 w-6 text-primary" />
              Gig Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              GPS-aware shift control, route intelligence, and AI optimization
            </p>
          </div>
          <div className="flex items-center gap-2">
            {timerActive && (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1 font-mono"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2 inline-block" />
                {formatDuration(elapsed)}
              </Badge>
            )}
          </div>
        </div>

        {/* Gig subscription upgrade banner (shown only on Starter plan) */}
        {gigSubscription && gigSubscription.plan?.tier === "starter" && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-violet-900/30 border border-violet-500/40">
            <div className="flex items-center gap-2 text-sm text-violet-200">
              <span className="text-violet-400">⚡</span>
              <span>
                <strong>{gigSubscription.plan.name}</strong> —{" "}
                {gigSubscription.aiCreditsRemaining} AI credits remaining this
                month. Upgrade for route optimizer, tax export &amp; more AI
                credits.
              </span>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              <Link href="/gig-worker-plans">Upgrade</Link>
            </Button>
          </div>
        )}

        {/* Tax export (Pro) — download the full shift + mileage + tax record */}
        <div className="flex items-center justify-end">
          <TaxExportButton />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: Shift Control + Stats */}
          <div className="xl:col-span-1 space-y-4">
            {/* Shift Control Card */}
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  Shift Control
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
                    <p>Could not load shift status. Try again later.</p>
                  </div>
                ) : !timerActive ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Platform
                      </Label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="h-9">
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
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={handleStartShift}
                      disabled={startShift.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {startShift.isPending ? "Starting…" : "Start Shift"}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Timer display */}
                    <div className="text-center py-3">
                      <div className="font-mono text-4xl font-bold text-foreground tabular-nums">
                        {formatDuration(elapsed)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {platform} shift in progress
                      </p>
                    </div>

                    {/* GPS indicator */}
                    <div className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        GPS Tracking
                      </span>
                      {gpsEnabled ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active · {routePath.length} pts
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={startGPS}
                        >
                          Enable
                        </Button>
                      )}
                    </div>

                    {!showEndForm ? (
                      <Button
                        variant="outline"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowEndForm(true)}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        End Shift
                      </Button>
                    ) : (
                      <div className="space-y-3 border border-border/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Log shift results
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Earnings $
                            </Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={endEarnings}
                              onChange={e => setEndEarnings(e.target.value)}
                              className="h-8 text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Tips $
                            </Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={endTips}
                              onChange={e => setEndTips(e.target.value)}
                              className="h-8 text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Miles
                            </Label>
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={endMiles}
                              onChange={e => setEndMiles(e.target.value)}
                              className="h-8 text-sm mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white"
                            onClick={handleEndShift}
                            disabled={endShift.isPending}
                          >
                            {endShift.isPending ? "Saving…" : "Confirm End"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowEndForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">
                      Avg $/hr
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    ${earningsPerHour.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">last 5 shifts</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Route className="h-3.5 w-3.5 text-blue-400" />
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
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
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
                    YTD @ $0.70/mi
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs text-muted-foreground">
                      Total Shifts
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {recentShifts.length}
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
              dataContext={`Platform: ${platform}. Avg $/hour (last 5 shifts): $${earningsPerHour.toFixed(2)}. YTD miles: ${(mileageSummary?.totalMiles ?? 0).toFixed(1)}. YTD tax deduction: $${ytdDeduction.toFixed(2)} (IRS 2025 $0.70/mile). Recent shifts: ${recentShifts.length}. Shift currently ${timerActive ? `active (${formatDuration(elapsed)} elapsed)` : "not active"}.`}
              defaultCollapsed={false}
            />

            {/* AI Shortcuts */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    AI Shortcuts
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
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
            <Card className="border-border/50 bg-card/80 overflow-hidden">
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
                  <span className="text-xs text-muted-foreground font-mono">
                    {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[340px] md:h-[400px]">
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
                        strokeColor: "#6366f1",
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
              </CardContent>
            </Card>

            {/* Route Intelligence */}
            <Card className="border-border/50 bg-card/80">
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
                    className="h-7 text-xs"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(pos => {
                          setIntelligencePos({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                          });
                          setTimeout(() => refetchIntelligence(), 100);
                        });
                      } else {
                        refetchIntelligence();
                      }
                    }}
                    disabled={fetchingIntel}
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
                    <Sparkles className="h-8 w-8 text-violet-400" />
                    <p className="text-sm text-muted-foreground">
                      Route intelligence — hot zones, timing &amp; earnings tips
                      — is a Pro feature.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <Link href="/gig-worker-plans">Upgrade to Pro</Link>
                    </Button>
                  </div>
                ) : !intelligencePos ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>
                      Enable GPS or start a shift to load route intelligence.
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
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-400" />
                  Mileage Log &amp; Tax Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tax summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">YTD Miles</p>
                    <p className="text-lg font-bold text-blue-400">
                      {(mileageSummary?.totalMiles ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">IRS Rate</p>
                    <p className="text-lg font-bold text-emerald-400">$0.70</p>
                    <p className="text-xs text-muted-foreground">per mile</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Tax Deduction
                    </p>
                    <p className="text-lg font-bold text-amber-400">
                      ${ytdDeduction.toFixed(2)}
                    </p>
                  </div>
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
                        <TableRow className="border-border/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead className="text-right">Miles</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                          <TableHead className="text-right">
                            Deduction
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentShifts.slice(0, 8).map(shift => {
                          const miles = parseFloat(String(shift.totalMiles));
                          const earnings =
                            parseFloat(String(shift.grossEarnings)) +
                            parseFloat(String(shift.tips));
                          const deduction = miles * IRS_RATE;
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
                              <TableCell className="text-right text-amber-400">
                                ${deduction.toFixed(2)}
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
    </DashboardLayout>
  );
}
