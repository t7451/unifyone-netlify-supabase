import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  Smartphone,
  ShoppingCart,
  Users,
  Megaphone,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function NotificationSettings() {
  const prefs = trpc.user.getPreferences.useQuery();
  const utils = trpc.useUtils();

  const updatePrefs = trpc.user.updatePreferences.useMutation({
    onSuccess: () => {
      utils.user.getPreferences.invalidate();
      toast.success("Notification preferences saved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const toggle = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
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
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
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
              <p className="text-white font-medium">
                Failed to load preferences
              </p>
              <p className="text-gray-500 text-sm max-w-md">
                {prefs.error?.message ||
                  "Could not connect to the server. Please try again later."}
              </p>
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
        {/* Channels */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00D9FF]" />
              Notification Channels
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <ToggleRow
              icon={<Mail className="w-4 h-4 text-blue-400" />}
              label="Email Notifications"
              description="Receive important updates and alerts via email"
              checked={p?.emailNotifications ?? true}
              onToggle={v => toggle("emailNotifications", v)}
              disabled={updatePrefs.isPending}
            />
            <Separator className="bg-white/5" />
            <ToggleRow
              icon={<Smartphone className="w-4 h-4 text-emerald-400" />}
              label="Push Notifications"
              description="Get real-time push notifications in your browser"
              checked={p?.pushNotifications ?? true}
              onToggle={v => toggle("pushNotifications", v)}
              disabled={updatePrefs.isPending}
            />
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notification Categories
            </CardTitle>
            <CardDescription className="text-gray-400">
              Fine-tune which types of notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <ToggleRow
              icon={<ShoppingCart className="w-4 h-4 text-[#00D9FF]" />}
              label="Order Updates"
              description="New orders, status changes, and fulfillment alerts"
              checked={p?.orderUpdates ?? true}
              onToggle={v => toggle("orderUpdates", v)}
              disabled={updatePrefs.isPending}
            />
            <Separator className="bg-white/5" />
            <ToggleRow
              icon={<Users className="w-4 h-4 text-purple-400" />}
              label="Team Alerts"
              description="Team member invitations, role changes, and activity"
              checked={p?.teamAlerts ?? true}
              onToggle={v => toggle("teamAlerts", v)}
              disabled={updatePrefs.isPending}
            />
            <Separator className="bg-white/5" />
            <ToggleRow
              icon={<Megaphone className="w-4 h-4 text-pink-400" />}
              label="Marketing Emails"
              description="Product updates, tips, and promotional content"
              checked={p?.marketingEmails ?? false}
              onToggle={v => toggle("marketingEmails", v)}
              disabled={updatePrefs.isPending}
            />
            <Separator className="bg-white/5" />
            <ToggleRow
              icon={<BarChart3 className="w-4 h-4 text-green-400" />}
              label="Weekly Digest"
              description="Weekly summary of your store's performance"
              checked={p?.weeklyDigest ?? true}
              onToggle={v => toggle("weeklyDigest", v)}
              disabled={updatePrefs.isPending}
            />
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Privacy
            </CardTitle>
            <CardDescription className="text-gray-400">
              Control how your data is used to improve the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleRow
              icon={<BarChart3 className="w-4 h-4 text-emerald-400" />}
              label="Analytics Sharing"
              description="Help improve the app by sharing anonymous usage data. No personal information is collected."
              checked={p?.analyticsSharing ?? true}
              onToggle={v => toggle("analyticsSharing", v)}
              disabled={updatePrefs.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1 gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <Label className="text-white text-sm font-medium">{label}</Label>
          <p className="text-gray-500 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="shrink-0"
      />
    </div>
  );
}
