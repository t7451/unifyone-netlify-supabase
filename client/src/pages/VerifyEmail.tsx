import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { landingPathForProduct } from "@/lib/primaryProduct";

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="url(#lg-ve)" />
      <path
        d="M10 14 L20 26 L30 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="lg-ve"
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

type VerifyState = "loading" | "success" | "error" | "no-token";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const token = getToken();

  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "no-token"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (data.success === true) {
          setState("success");
        } else {
          setErrorMessage(
            data.error || "Verification failed. Please try again."
          );
          setState("error");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("An unexpected error occurred. Please try again.");
          setState("error");
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <LogoMark size={48} />

        {state === "loading" && (
          <>
            <div className="flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#00D9FF] animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Verifying your email...
              </h2>
              <p className="text-slate-400 text-sm">
                Please wait while we confirm your email address.
              </p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-[#00D9FF]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Email verified!</h2>
              <p className="text-slate-400 text-sm">
                Your account is now active.
              </p>
            </div>
            <Button
              onClick={() => navigate(landingPathForProduct())}
              className={cn(
                "h-11 px-6 font-semibold text-sm transition-all",
                "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600",
                "text-[#060D1F] shadow-lg shadow-[#00D9FF]/20"
              )}
            >
              Go to dashboard
            </Button>
          </>
        )}

        {(state === "error" || state === "no-token") && (
          <>
            <div className="flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Verification failed
              </h2>
              <p className="text-slate-400 text-sm">
                {state === "no-token"
                  ? "This verification link is invalid."
                  : errorMessage}
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm h-11 px-6"
            >
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
