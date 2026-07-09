import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Lock,
  Mail,
  Monitor,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function SecuritySettings() {
  const { user, logout } = useAuth();

  // ── Change password state ────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success(
        "Password updated. You will be signed out so the change takes effect."
      );
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => logout(), 1500);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ── Change email state ───────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");

  const changeEmail = trpc.user.changeEmail.useMutation({
    onSuccess: () => {
      toast.success(
        "Email updated. Check your inbox to verify, then sign back in."
      );
      setNewEmail("");
      setEmailPw("");
      setTimeout(() => logout(), 1500);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ── Delete account state ─────────────────────────────────────────────────
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted. You will be signed out.");
      setTimeout(() => logout(), 1500);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const revokeAll = trpc.user.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast.success(
        "All other sessions have been revoked. You will need to sign in again."
      );
      setTimeout(() => logout(), 1500);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const handleChangeEmail = () => {
    if (!newEmail || !emailPw) {
      toast.error("Email and password are both required.");
      return;
    }
    changeEmail.mutate({ newEmail, currentPassword: emailPw });
  };

  const handleDeleteAccount = () => {
    if (!confirmEmail || !deletePw) {
      toast.error("Email confirmation and password are both required.");
      return;
    }
    deleteAccount.mutate({ confirmEmail, currentPassword: deletePw });
  };

  const handlePasswordReset = () => {
    window.location.href = "/reset-password";
  };

  const handleSignOutAll = () => {
    revokeAll.mutate();
  };

  const userRecord = user as Record<string, unknown> | undefined;
  const hasPassword = !!userRecord?.hasPassword;
  const passwordChangedAt = userRecord?.passwordChangedAt as string | undefined;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Password */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-[#D4A843]" />
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

            {hasPassword ? (
              <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-[#D4A843]" />
                  <p className="text-white text-sm font-medium">
                    Change Password
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-pw" className="text-xs text-gray-400">
                    Current password
                  </Label>
                  <Input
                    id="current-pw"
                    type="password"
                    autoComplete="current-password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw" className="text-xs text-gray-400">
                    New password (min 8 characters)
                  </Label>
                  <Input
                    id="new-pw"
                    type="password"
                    autoComplete="new-password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw" className="text-xs text-gray-400">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    changePassword.isPending ||
                    !currentPw ||
                    !newPw ||
                    !confirmPw
                  }
                  className="bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20"
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-600">
                  All active sessions including this one will be revoked.
                </p>
              </div>
            ) : (
              <Button
                onClick={handlePasswordReset}
                variant="outline"
                className="border-white/10 text-gray-300 hover:text-white hover:border-white/20"
              >
                <Key className="w-4 h-4 mr-2" />
                Set Password
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Email */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D4A843]" />
              Email Address
            </CardTitle>
            <CardDescription className="text-gray-400">
              Change the email address you use to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-500">Current</p>
              <p className="text-white text-sm font-medium">
                {user?.email ?? "—"}
              </p>
            </div>

            {hasPassword ? (
              <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-xs text-gray-400">
                    New email
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    autoComplete="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-pw" className="text-xs text-gray-400">
                    Current password
                  </Label>
                  <Input
                    id="email-pw"
                    type="password"
                    autoComplete="current-password"
                    value={emailPw}
                    onChange={e => setEmailPw(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleChangeEmail}
                  disabled={changeEmail.isPending || !newEmail || !emailPw}
                  className="bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20"
                >
                  {changeEmail.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Update Email
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-600">
                  Your new email will need to be re-verified. Sessions will be
                  revoked for security.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Set a password before changing your email address.
              </p>
            )}
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A843]/10 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-[#D4A843]" />
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
                disabled={revokeAll.isPending}
                variant="outline"
                className="border-white/10 text-gray-300 hover:text-white hover:border-white/20"
              >
                {revokeAll.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Revoke All Sessions
                  </>
                )}
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
            <p className="text-xs text-gray-600">
              Revoking all sessions invalidates every active login token,
              including this one. You will be signed out.
            </p>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="bg-card border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </CardTitle>
            <CardDescription className="text-gray-400">
              Permanently remove your account from UnifyOne. This is
              irreversible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-gray-400 space-y-1">
              <p className="text-red-300">
                What happens when you delete your account:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  Your access is revoked immediately and you are signed out.
                </li>
                <li>
                  Tenant, products, orders, and other data are preserved for 30
                  days for legal/audit purposes, then permanently removed.
                </li>
                <li>
                  Your email and username become available for reuse after 30
                  days.
                </li>
                <li>
                  Active subscriptions are NOT auto-cancelled. Cancel in Stripe
                  first if applicable.
                </li>
              </ul>
            </div>

            {!showDelete ? (
              <Button
                onClick={() => setShowDelete(true)}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />I understand — show delete
                options
              </Button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg bg-red-500/5 border border-red-500/30">
                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-email"
                    className="text-xs text-gray-400"
                  >
                    Type your email ({user?.email ?? "—"}) to confirm
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    autoComplete="off"
                    value={confirmEmail}
                    onChange={e => setConfirmEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-pw" className="text-xs text-gray-400">
                    Current password
                  </Label>
                  <Input
                    id="delete-pw"
                    type="password"
                    autoComplete="current-password"
                    value={deletePw}
                    onChange={e => setDeletePw(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteAccount.isPending || !confirmEmail || !deletePw
                    }
                    className="bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
                  >
                    {deleteAccount.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Permanently Delete Account
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDelete(false);
                      setConfirmEmail("");
                      setDeletePw("");
                    }}
                    variant="outline"
                    className="border-white/10 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
