import { trpc } from "@/lib/trpc";
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
import { Palette, Sun, Moon, Globe, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsLayout from "./SettingsLayout";

const THEMES = [
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Dark background, easy on the eyes",
    colors: ["#0A1128", "#1A1A2E", "#00D9FF"],
  },
  {
    value: "light",
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
  const prefs = trpc.user.getPreferences.useQuery();
  const utils = trpc.useUtils();

  const updatePrefs = trpc.user.updatePreferences.useMutation({
    onSuccess: () => {
      utils.user.getPreferences.invalidate();
      toast.success("Preferences saved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

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

  const p = prefs.data;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Theme */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#00D9FF]" />
              Theme
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose your preferred visual theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map(theme => {
                const isActive = (p?.theme ?? "dark") === theme.value;
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.value}
                    onClick={() =>
                      updatePrefs.mutate({
                        theme: theme.value as "light" | "dark",
                      })
                    }
                    disabled={updatePrefs.isPending}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      isActive
                        ? "border-[#00D9FF]/50 bg-[#00D9FF]/5"
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isActive ? "bg-[#00D9FF]/10" : "bg-white/5"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-[#00D9FF]" : "text-gray-400"
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isActive ? "text-white" : "text-gray-400"
                          )}
                        >
                          {theme.label}
                        </p>
                        <p className="text-xs text-gray-600">
                          {theme.description}
                        </p>
                      </div>
                    </div>
                    {/* Color preview */}
                    <div className="flex gap-1.5">
                      {theme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border border-white/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Theme preference is saved to your account and syncs across
              devices. Note: Light mode is coming soon, dark mode is currently
              the default.
            </p>
          </CardContent>
        </Card>

        {/* Localization */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Localization
            </CardTitle>
            <CardDescription className="text-gray-400">
              Language and timezone preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Language
              </Label>
              <Select
                value={p?.language ?? "en"}
                onValueChange={v => updatePrefs.mutate({ language: v })}
                disabled={updatePrefs.isPending}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50 w-full sm:w-64">
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
              <p className="text-xs text-gray-600">
                This changes the display language of the interface. Additional
                languages are coming soon.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Timezone
              </Label>
              <Select
                value={p?.timezone ?? "UTC"}
                onValueChange={v => updatePrefs.mutate({ timezone: v })}
                disabled={updatePrefs.isPending}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50 w-full sm:w-80">
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
              <p className="text-xs text-gray-600">
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
