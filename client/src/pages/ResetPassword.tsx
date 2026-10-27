import { BrandLockup } from "@/components/Brand";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = getToken();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#111416] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <BrandLockup size={48} />
          <div className="flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#f4f2ed]">
              Invalid reset link
            </h2>
            <p className="text-[#b5bab7] text-sm">
              This reset link is invalid. Please request a new one.
            </p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className={cn(
              "h-11 px-6 font-semibold text-sm transition-all",
              "bg-[#f39450] hover:bg-[#ffad74]",
              "text-[#111416] shadow-none"
            )}
          >
            Request new link
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#111416] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <BrandLockup size={48} />
          <div className="flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-[#f39450]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#f4f2ed]">Password updated!</h2>
            <p className="text-[#b5bab7] text-sm">
              You can now sign in with your new password.
            </p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className={cn(
              "h-11 px-6 font-semibold text-sm transition-all",
              "bg-[#f39450] hover:bg-[#ffad74]",
              "text-[#111416] shadow-none"
            )}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen bg-[#111416] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <BrandLockup size={44} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#f4f2ed] mb-1">
            Reset your password
          </h2>
          <p className="text-[#b5bab7] text-sm">
            Enter and confirm your new password below.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#d0d3ce] text-sm">New password</Label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "bg-white/5 border-white/10 text-[#f4f2ed] placeholder:text-[#a2aaa7] h-11 transition-all",
                "focus:border-[#f39450]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#f39450]/20"
              )}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#d0d3ce] text-sm">Confirm password</Label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "bg-white/5 border-white/10 text-[#f4f2ed] placeholder:text-[#a2aaa7] h-11 transition-all",
                "focus:border-[#f39450]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#f39450]/20"
              )}
              autoComplete="new-password"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "w-full h-11 font-semibold text-sm transition-all",
              "bg-[#f39450] hover:bg-[#ffad74]",
              "text-[#111416] shadow-none",
              isSubmitting && "opacity-80 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating password...
              </span>
            ) : (
              "Update password"
            )}
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
          <Shield className="w-4 h-4 text-[#f39450] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#a2aaa7] leading-relaxed">
            Your password is securely hashed with scrypt. UnifyOne never stores
            your password in plain text.
          </p>
        </div>
      </div>
    </div>
  );
}
