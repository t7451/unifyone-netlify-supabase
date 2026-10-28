import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  Mail,
  Loader2,
  Copy,
  Check,
  Calendar,
  Shield,
  Fingerprint,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function AccountSettings() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile changes saved");
      setName("");
      setUsername("");
      refresh();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSave = () => {
    const nextName = name.trim();
    const nextUsername = username.trim().toLowerCase();
    if (!nextName && !nextUsername) return;
    updateProfile.mutate({
      name: nextName || undefined,
      username: nextUsername || undefined,
    });
  };

  const copyId = () => {
    if (user?.openId) {
      navigator.clipboard.writeText(user.openId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your personal information and display name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar + basic info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border border-border">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-lg truncate">
                  {user?.name ?? "Unnamed User"}
                </p>
                <p className="text-muted-foreground text-sm truncate">
                  {user?.email ?? "No email"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary text-xs capitalize"
                  >
                    {user?.role ?? "user"}
                  </Badge>
                  {user?.emailVerified && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 text-xs"
                    >
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-muted/40" />

            {/* Edit name */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">
                Display Name
              </Label>
              <Input
                value={name || user?.name || ""}
                onChange={e => setName(e.target.value)}
                placeholder="Your display name"
                className="bg-muted/40 border-border text-foreground focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Username</Label>
              <Input
                value={
                  username ||
                  (user as { username?: string | null })?.username ||
                  ""
                }
                onChange={e => setUsername(e.target.value)}
                placeholder="yourname"
                className="bg-muted/40 border-border text-foreground focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                You can sign in with this username or your email address.
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </Label>
              <Input
                value={user?.email ?? ""}
                disabled
                className="bg-muted/40 border-border text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Email is managed through your authentication provider.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={
                  updateProfile.isPending || (!name.trim() && !username.trim())
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Unique identifiers and account metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Account ID */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Account ID
                </p>
                <p className="text-foreground text-sm font-mono mt-0.5">
                  {user?.openId
                    ? `${user.openId.slice(0, 8)}...${user.openId.slice(-4)}`
                    : "N/A"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 hover:bg-muted/40"
                onClick={copyId}
              >
                {copiedId ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* User ID */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  User ID
                </p>
                <p className="text-foreground text-sm font-mono mt-0.5">
                  {user?.id ?? "N/A"}
                </p>
              </div>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Role */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Role
                </p>
                <p className="text-foreground text-sm mt-0.5 capitalize">
                  {user?.role ?? "user"}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  user?.role === "admin"
                    ? "border-amber-500/30 text-amber-400 text-xs"
                    : "border-primary/30 text-primary text-xs"
                }
              >
                {user?.role ?? "user"}
              </Badge>
            </div>

            {/* Login Method */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Login Method
                </p>
                <p className="text-foreground text-sm mt-0.5 capitalize">
                  {(user as { loginMethod?: string | null })?.loginMethod ??
                    "OAuth"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Username
                </p>
                <p className="text-foreground text-sm mt-0.5">
                  {(user as { username?: string | null })?.username ??
                    "Not set"}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Member Since
                  </p>
                </div>
                <p className="text-foreground text-sm">
                  {formatDate(
                    (user as Record<string, unknown>)?.createdAt as
                      | string
                      | undefined
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Last Sign-In
                  </p>
                </div>
                <p className="text-foreground text-sm">
                  {formatDate(
                    (user as Record<string, unknown>)?.lastSignedIn as
                      | string
                      | undefined
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
