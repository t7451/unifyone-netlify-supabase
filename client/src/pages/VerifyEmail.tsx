import { BrandLockup } from "@/components/Brand";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { landingPathForProduct } from "@/lib/primaryProduct";

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
    <div className="min-h-screen bg-[#111416] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <BrandLockup size={48} />

        {state === "loading" && (
          <>
            <div className="flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#f39450] animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#f4f2ed]">
                Verifying your email...
              </h2>
              <p className="text-[#b5bab7] text-sm">
                Please wait while we confirm your email address.
              </p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-[#f39450]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#f4f2ed]">Email verified!</h2>
              <p className="text-[#b5bab7] text-sm">
                Your account is now active.
              </p>
            </div>
            <Button
              // Email verification happens before a tenant/product exists, so
              // there is no primaryProduct to resolve yet — land on the
              // operator-first default (/overview), matching the column default.
              onClick={() => navigate(landingPathForProduct())}
              className={cn(
                "h-11 px-6 font-semibold text-sm transition-all",
                "bg-[#f39450] hover:bg-[#ffad74]",
                "text-[#111416] shadow-none"
              )}
            >
              Go to your workspace
            </Button>
          </>
        )}

        {(state === "error" || state === "no-token") && (
          <>
            <div className="flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#f4f2ed]">
                Verification failed
              </h2>
              <p className="text-[#b5bab7] text-sm">
                {state === "no-token"
                  ? "This verification link is invalid."
                  : errorMessage}
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-[#d0d3ce] hover:text-[#f4f2ed] text-sm h-11 px-6"
            >
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
