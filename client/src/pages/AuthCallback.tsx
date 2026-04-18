import { useEffect, useState } from "react";
import { useLocation } from "wouter";

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
  "Verifying your identity...",
  "Securing your session...",
  "Loading your workspace...",
];

function getReturnTo(): string {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo");
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/dashboard";
}

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const returnTo = getReturnTo();

        // Check for error param from failed auth attempts
        const errorParam = params.get("error");
        if (errorParam) {
          if (!cancelled) {
            navigate(`/login?error=${encodeURIComponent(errorParam)}`);
          }
          return;
        }

        // If no special params, redirect to returnTo (defaults to /dashboard)
        // Email verification is handled by /verify-email route
        // Password reset is handled by /reset-password route
        if (!cancelled) {
          navigate(returnTo);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[AuthCallback] Error:", err);
          setError("An error occurred during sign-in. Please try again.");
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex flex-col items-center justify-center gap-6">
        <LogoMark size={56} />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Sign-in failed</h2>
          <p className="text-sm text-red-400 max-w-xs">{error}</p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-[#00D9FF] hover:text-[#00C4E8] font-medium transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060D1F] flex flex-col items-center justify-center gap-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D9FF]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <LogoMark size={56} />
          <div
            className="absolute inset-0 -m-2 rounded-[14px] border-2 border-transparent border-t-[#00D9FF] animate-spin"
            style={{ borderRadius: "16px" }}
          />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">UnifyOne</h2>
          <p className="text-sm text-[#00D9FF] animate-pulse min-h-[20px]">
            {STEPS[stepIdx]}
          </p>
        </div>
      </div>

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
