import { BrandMark, BrandLockup } from "@/components/Brand";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { landingPathForProduct } from "@/lib/primaryProduct";

const STEPS = [
  "Verifying your identity...",
  "Securing your session...",
  "Loading your workspace...",
];

/**
 * Returns an explicit, safe in-app `returnTo` path if one was provided, else
 * null. When null, the caller routes by the workspace's primary product
 * (gig-operator → /overview, commerce → /dashboard).
 */
function getExplicitReturnTo(): string | null {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo");
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return null;
}

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
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

        // Check for error param from failed auth attempts
        const errorParam = params.get("error");
        if (errorParam) {
          if (!cancelled) {
            navigate(`/login?error=${encodeURIComponent(errorParam)}`);
          }
          return;
        }

        // An explicit returnTo always wins (e.g. deep links, verify-email flow).
        const explicit = getExplicitReturnTo();
        if (explicit) {
          if (!cancelled) navigate(explicit);
          return;
        }

        // Otherwise route by the workspace's primary product: gig-operators
        // land on the gig home (/overview), commerce-first tenants on the
        // commerce dashboard (/dashboard). Falls back to the gig home.
        let dest = landingPathForProduct();
        try {
          const me = await utils.auth.me.fetch();
          if (me?.primaryProduct === "commerce") {
            dest = landingPathForProduct(me?.primaryProduct);
          }
        } catch {
          // Keep the gig-operator default on any lookup failure.
        }
        if (!cancelled) {
          navigate(dest);
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
  }, [navigate, utils]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#111416] flex flex-col items-center justify-center gap-6">
        <BrandLockup size={56} />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-[#f4f2ed]">Sign-in failed</h2>
          <p className="text-sm text-red-400 max-w-xs">{error}</p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-[#f39450] hover:text-[#ffad74] font-medium transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111416] flex flex-col items-center justify-center gap-8">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <BrandMark size={56} />
          <div
            className="absolute inset-0 -m-2 rounded-[14px] border-2 border-transparent border-t-[#f39450] animate-spin"
            style={{ borderRadius: "16px" }}
          />
        </div>

        <div className="text-center space-y-1">
          <h2 className="brand-wordmark">
            Unify<span>One</span>
          </h2>
          <p className="text-sm text-[#f39450] animate-pulse min-h-[20px]">
            {STEPS[stepIdx]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= stepIdx ? "w-6 bg-[#f39450]" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-[#a2aaa7] text-center max-w-xs">
        Establishing a secure connection to your workspace. This only takes a
        moment.
      </p>
    </div>
  );
}
