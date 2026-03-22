import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const AUTH_REFRESH_INTERVAL_MS = 900;
const MAX_AUTH_REFRESH_ATTEMPTS = 5;

// ── Animated logo mark ────────────────────────────────────────────────────────
function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="url(#lg2)" />
      <path
        d="M10 14 L20 26 L30 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="lg2"
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

const STEPS = [
  "Verifying your identity…",
  "Securing your session…",
  "Loading your workspace…",
];

export default function AuthCallback() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, loading, refresh } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  // Cycle through status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  // Once auth resolves, redirect to dashboard
  useEffect(() => {
    const returnTo = (() => {
      try {
        const url = new URL(window.location.origin + location);
        const path = url.searchParams.get("returnTo");
        if (!path || !path.startsWith("/")) return "/dashboard";
        return path;
      } catch {
        return "/dashboard";
      }
    })();

    if (!loading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [loading, isAuthenticated, location, navigate]);

  useEffect(() => {
    if (loading || isAuthenticated) return;

    if (refreshAttempts >= MAX_AUTH_REFRESH_ATTEMPTS) {
      navigate("/login");
      return;
    }

    const timeout = window.setTimeout(() => {
      setRefreshAttempts(current => current + 1);
      void refresh();
    }, AUTH_REFRESH_INTERVAL_MS);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, loading, navigate, refresh, refreshAttempts]);

  return (
    <div className="min-h-screen bg-[#060D1F] flex flex-col items-center justify-center gap-8">
      {/* Glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D9FF]/5 rounded-full blur-3xl" />
      </div>

      {/* Logo + spinner */}
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <LogoMark size={56} />
          {/* Spinning ring around logo */}
          <div
            className="absolute inset-0 -m-2 rounded-[14px] border-2 border-transparent border-t-[#00D9FF] animate-spin"
            style={{ borderRadius: "16px" }}
          />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">UnifyOne</h2>
          <p className="text-sm text-[#00D9FF] animate-pulse min-h-[20px]">
            {refreshAttempts > 0 && !isAuthenticated
              ? `Finalizing your session${".".repeat(Math.min(refreshAttempts, 3))}`
              : STEPS[stepIdx]}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= stepIdx ? "w-6 bg-[#00D9FF]" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-slate-600 text-center max-w-xs">
        Establishing a secure connection to your workspace. This only takes a
        moment.
      </p>
    </div>
  );
}
