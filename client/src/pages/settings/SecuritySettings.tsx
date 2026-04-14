import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Lock,
  Monitor,
  LogOut,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function SecuritySettings() {
  const { user, logout } = useAuth();

  const handlePasswordReset = () => {
    window.location.href = "/reset-password";
  };

  const handleSignOutAll = () => {
    toast.info(
      "To sign out all sessions, reset your password. This invalidates all active tokens."
    );
  };

  const userRecord = user as Record<string, unknown> | undefined;
  const hasPassword = !!userRecord?.passwordHash;
  const passwordChangedAt = userRecord?.passwordChangedAt as string | undefined;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Password */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-[#00D9FF]" />
              Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your password and sign-in credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {hasPassword ? "Password set" : "No password set"}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {passwordChangedAt
                      ? `Last changed ${new Date(passwordChangedAt).toLocaleDateString()}`
                      : hasPassword
                        ? "Set during account creation"
                        : "You signed up with OAuth. Set a password for email login."}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  hasPassword
                    ? "border-emerald-500/30 text-emerald-400"
                    : "border-amber-500/30 text-amber-400"
                }
              >
                {hasPassword ? "Active" : "Not Set"}
              </Badge>
            </div>

            <Button
              onClick={handlePasswordReset}
              variant="outline"
              className="border-white/10 text-gray-300 hover:text-white hover:border-white/20"
            >
              <Key className="w-4 h-4 mr-2" />
              {hasPassword ? "Change Password" : "Set Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Authentication
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your sign-in methods and security status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Login method */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-[#00D9FF]" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium capitalize">
                    {(userRecord?.loginMethod as string) ?? "OAuth"} Login
                  </p>
                  <p className="text-gray-500 text-xs">
                    Primary sign-in method
                  </p>
                </div>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Email verification */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    user?.emailVerified
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10"
                  }`}
                >
                  {user?.emailVerified ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    Email Verification
                  </p>
                  <p className="text-gray-500 text-xs">
                    {user?.emailVerified
                      ? "Your email address is verified"
                      : "Verify your email for enhanced security"}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  user?.emailVerified
                    ? "border-emerald-500/30 text-emerald-400 text-xs"
                    : "border-amber-500/30 text-amber-400 text-xs"
                }
              >
                {user?.emailVerified ? "Verified" : "Pending"}
              </Badge>
            </div>

            {hasPassword && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6A1B9A]/10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#6A1B9A]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      Password Authentication
                    </p>
                    <p className="text-gray-500 text-xs">
                      Email + password sign-in enabled
                    </p>
                  </div>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400" />
              Sessions
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your active sessions and sign-out options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-white text-sm font-medium">
                    Current Session
                  </p>
                  <p className="text-gray-500 text-xs">
                    This browser - Active now
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 text-xs"
              >
                Active
              </Badge>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSignOutAll}
                variant="outline"
                className="border-white/10 text-gray-300 hover:text-white hover:border-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out All Sessions
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
