import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Palette, Sun, Moon, Globe, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsLayout from "./SettingsLayout";

const THEMES = [
  {
    value: "dark" as const,
    label: "Dark",
    icon: Moon,
    description: "Dark background, easy on the eyes",
    colors: ["#020202", "#1A1A2E", "#D4A843"],
  },
  {
    value: "light" as const,
    label: "Light",
    icon: Sun,
    description: "Bright and clean interface",
    colors: ["#FFFFFF", "#F8F9FA", "#0284C7"],
  },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Shanghai", label: "CST (Shanghai)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const prefs = trpc.user.getPreferences.useQuery();
  const utils = trpc.useUtils();

  const updatePrefs = trpc.user.updatePreferences.useMutation({
    onSuccess: (_data, variables) => {
      if (variables.theme) setTheme(variables.theme);
      utils.user.getPreferences.invalidate();
      toast.success("Preferences saved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleThemeChange = (value: "light" | "dark") => {
    updatePrefs.mutate({ theme: value });
  };

  if (prefs.isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </SettingsLayout>
    );
  }

  if (prefs.isError) {
    return (
      <SettingsLayout>
        <Card className="bg-card border-border">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-foreground font-medium">
                Failed to load preferences
              </p>
              <p className="text-muted-foreground text-sm max-w-md">
                {prefs.error?.message ||
                  "Could not connect to the server. Please try again later."}
              </p>
              <Button variant="outline" onClick={() => void prefs.refetch()}>
                Retry preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  const p = prefs.data;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Theme */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Theme
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose your preferred visual theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map(t => {
                const isActive = theme === t.value;
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    disabled={updatePrefs.isPending}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      isActive
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-white/3 hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isActive ? "bg-primary/10" : "bg-muted/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {t.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.description}
                        </p>
                      </div>
                    </div>
                    {/* Color preview */}
                    <div className="flex gap-1.5">
                      {t.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Theme preference is saved to your account and synced across
              devices.
            </p>
          </CardContent>
        </Card>

        {/* Localization */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Localization
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Language and timezone preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Language
              </Label>
              <Select
                value={p?.language ?? "en"}
                onValueChange={v => updatePrefs.mutate({ language: v })}
                disabled={updatePrefs.isPending}
              >
                <SelectTrigger className="bg-muted/40 border-border text-foreground focus:border-primary/50 w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This changes the display language of the interface. Additional
                languages are coming soon.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Timezone
              </Label>
              <Select
                value={p?.timezone ?? "UTC"}
                onValueChange={v => updatePrefs.mutate({ timezone: v })}
                disabled={updatePrefs.isPending}
              >
                <SelectTrigger className="bg-muted/40 border-border text-foreground focus:border-primary/50 w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for displaying dates, times, and scheduling in your local
                timezone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
