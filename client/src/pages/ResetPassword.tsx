import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="url(#lg-rp)" />
      <path
        d="M10 14 L20 26 L30 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="lg-rp"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00D9FF" />
          <stop offset="1" stopColor="#0066FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <LogoMark size={48} />
          <div className="flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Invalid reset link
            </h2>
            <p className="text-slate-400 text-sm">
              This reset link is invalid. Please request a new one.
            </p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className={cn(
              "h-11 px-6 font-semibold text-sm transition-all",
              "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600",
              "text-[#060D1F] shadow-lg shadow-[#00D9FF]/20"
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
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <LogoMark size={48} />
          <div className="flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-[#00D9FF]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Password updated!</h2>
            <p className="text-slate-400 text-sm">
              You can now sign in with your new password.
            </p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className={cn(
              "h-11 px-6 font-semibold text-sm transition-all",
              "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600",
              "text-[#060D1F] shadow-lg shadow-[#00D9FF]/20"
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
    <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <LogoMark size={44} />
          <span className="text-xl font-bold text-white">UnifyOne</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Reset your password
          </h2>
          <p className="text-slate-400 text-sm">
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
            <Label className="text-slate-300 text-sm">New password</Label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
              )}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Confirm password</Label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
              )}
              autoComplete="new-password"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "w-full h-11 font-semibold text-sm transition-all",
              "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600",
              "text-[#060D1F] shadow-lg shadow-[#00D9FF]/20",
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
          <Shield className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Your password is securely hashed with scrypt. UnifyOne never stores
            your password in plain text.
          </p>
        </div>
      </div>
    </div>
  );
}
