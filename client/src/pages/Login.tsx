import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import LoadingExperience from "@/components/LoadingExperience";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Loader2,
  Globe,
  CreditCard,
  Users,
  Mail,
  AtSign,
} from "lucide-react";
import { useClerk, useSession } from "@clerk/clerk-react";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function getReturnTo(): string {
  if (typeof window === "undefined") return "/dashboard";
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? params.get("next");
  const plan = params.get("plan");
  if (returnTo && returnTo.startsWith("/")) return returnTo;
  if (plan && ["starter", "pro", "scale"].includes(plan)) {
    return `/checkout?plan=${plan}`;
  }
  return "/dashboard";
}

function getTenantSlug(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant")?.trim().toLowerCase() ?? "";
}

const FEATURES = [
  {
    icon: ShoppingBag,
    text: "Multi-tenant product catalog & order management",
  },
  { icon: BarChart3, text: "Real-time analytics across every channel" },
  { icon: Zap, text: "Automated workflows via n8n, Zapier & Mailchimp" },
  { icon: CreditCard, text: "Stripe & PayPal payments, built in" },
  { icon: Users, text: "Team management with role-based access" },
  { icon: Globe, text: "Theme Store — launch branded storefronts instantly" },
];

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="url(#lg)" />
      <path
        d="M10 14 L20 26 L30 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="lg"
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

type AuthMode = "password" | "sign-in" | "sign-up" | "forgot-password";

type LoginIntent = "signin" | "signup";

/**
 * Renders a "Continue with Clerk" button and handles the post-sign-in token
 * exchange.  Only mounted when VITE_CLERK_PUBLISHABLE_KEY is present, which
 * means ClerkProvider is wrapping the app and the Clerk hooks are available.
 */
function ClerkSignInSection({
  returnTo,
  onSuccess,
}: {
  returnTo: string;
  onSuccess: () => void;
}) {
  const { openSignIn } = useClerk();
  const { isSignedIn, session } = useSession();
  const [isClerkSubmitting, setIsClerkSubmitting] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);
  // Tracks whether a token exchange is currently in-flight to prevent
  // concurrent requests when Clerk session state changes mid-request.
  const isExchangingRef = useRef(false);
  // Tracks whether exchange has already succeeded, preventing re-exchange.
  const hasExchangedTokenRef = useRef(false);

  // When Clerk reports a signed-in session, exchange it for an app cookie.
  useEffect(() => {
    if (!isSignedIn || !session) return;
    if (hasExchangedTokenRef.current || isExchangingRef.current) return;
    isExchangingRef.current = true;

    let cancelled = false;

    session
      .getToken()
      .then(async token => {
        if (cancelled) return;
        if (!token) throw new Error("No session token");
        const res = await fetch("/api/auth/clerk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionToken: token }),
        });
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Clerk exchange failed");
        }
        hasExchangedTokenRef.current = true;
        setIsClerkSubmitting(false);
        onSuccess();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        isExchangingRef.current = false;
        setClerkError(
          err instanceof Error ? err.message : "Clerk sign-in failed"
        );
        setIsClerkSubmitting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, session, onSuccess]);

  const handleClerkSignIn = () => {
    setIsClerkSubmitting(true);
    setClerkError(null);
    openSignIn({ afterSignInUrl: returnTo, afterSignUpUrl: returnTo });
  };

  return (
    <>
      {clerkError && (
        <p className="text-red-400 text-xs text-center">{clerkError}</p>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={handleClerkSignIn}
        disabled={isClerkSubmitting}
        className="w-full h-11 border-white/10 bg-white/5 hover:bg-white/10 text-white"
      >
        {isClerkSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening Clerk…
          </span>
        ) : (
          "Continue with Clerk"
        )}
      </Button>
    </>
  );
}

export default function Login({
  initialIntent = "signin",
}: { initialIntent?: LoginIntent } = {}) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [intent, setIntent] = useState<LoginIntent>(initialIntent);
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAuth0Submitting, setIsAuth0Submitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const returnTo = getReturnTo();
  const tenantSlug = getTenantSlug();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [isAuthenticated, loading, navigate, returnTo]);

  // Check URL for error params (e.g., from failed magic link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError === "invalid_link") {
      setError("That link has expired or is invalid. Please try again.");
    } else if (urlError?.startsWith("google_oauth")) {
      const googleErrors: Record<string, string> = {
        google_oauth_denied: "Google sign-in was cancelled.",
        google_oauth_invalid:
          "Google sign-in could not be verified. Please try again.",
        google_oauth_config:
          "Google sign-in is not configured correctly yet. Please contact the workspace owner.",
        google_oauth_unverified:
          "Google did not verify this account's email address. Please use a verified Google account.",
        google_oauth_failed:
          "Google sign-in failed. Please try again or use email and password.",
        google_oauth_not_ready:
          "Google sign-in is not available yet. Please sign in with your email and password, or contact support.",
      };
      setError(
        googleErrors[urlError] ||
          "Google sign-in failed. Please try again or use email and password."
      );
    } else if (urlError?.startsWith("auth0_oauth")) {
      const auth0Errors: Record<string, string> = {
        auth0_oauth_denied: "Auth0 sign-in was cancelled.",
        auth0_oauth_invalid:
          "Auth0 sign-in could not be verified. Please try again.",
        auth0_oauth_config:
          "Auth0 sign-in is not configured correctly yet. Please check the Netlify Auth0 extension settings.",
        auth0_oauth_unverified:
          "Auth0 did not verify this account's email address. Please use a verified account.",
        auth0_oauth_failed:
          "Auth0 sign-in failed. Please try again or use another sign-in method.",
      };
      setError(
        auth0Errors[urlError] ||
          "Auth0 sign-in failed. Please try again or use another sign-in method."
      );
    }
  }, []);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setErrorCode(null);
    setSuccessMessage(null);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setIsResendingVerification(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSuccessMessage(
        "A new verification link has been sent to your email. Please check your inbox."
      );
      setError(null);
      setErrorCode(null);
    } catch {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter your email or username and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // For rate-limit responses include a human-readable retry hint
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : null;
          setError(
            seconds && seconds > 0
              ? `Too many sign-in attempts. Please wait ${seconds} second${seconds === 1 ? "" : "s"} before trying again.`
              : "Too many sign-in attempts. Please wait a moment before trying again."
          );
        } else {
          setError(data.error || "Invalid email or password.");
        }
        if (data.code) setErrorCode(data.code);
        return;
      }

      // Session cookie set by server — redirect
      navigate(returnTo);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!username || !email || !password) {
      setError("Please enter a username, email, and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username, name: username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : null;
          setError(
            seconds && seconds > 0
              ? `Too many sign-up attempts. Please wait ${seconds} second${seconds === 1 ? "" : "s"} before trying again.`
              : "Too many sign-up attempts. Please wait a moment before trying again."
          );
        } else {
          setError(data.error || "Failed to create account.");
        }
        return;
      }

      // If the server requires email verification, surface the check-your-email
      // screen instead of redirecting silently.
      if (data.user?.emailVerified === false) {
        setSuccessMessage(
          data.message ||
            "Account created! Please check your email to verify your address before signing in."
        );
        return;
      }

      // Session cookie set by server — redirect directly
      navigate(returnTo);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setIsGoogleSubmitting(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenantSlug: tenantSlug || undefined, returnTo }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.authorizationUrl) {
        setError(data.error || "Google OAuth is not configured yet.");
        return;
      }

      window.location.href = data.authorizationUrl as string;
    } catch {
      setError("Failed to start Google OAuth. Please try again.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleAuth0OAuth = async () => {
    setIsAuth0Submitting(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/auth/auth0/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.authorizationUrl) {
        setError(data.error || "Auth0 is not configured yet.");
        return;
      }

      window.location.href = data.authorizationUrl as string;
    } catch {
      setError("Failed to start Auth0 sign-in. Please try again.");
    } finally {
      setIsAuth0Submitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccessMessage(
        "If an account with that email exists, a password reset link has been sent. Please check your inbox (and spam folder)."
      );
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    switch (mode) {
      case "password":
        return intent === "signup" ? handleSignUp() : handleSignIn();
      case "sign-in":
        return handleSignIn();
      case "sign-up":
        return handleSignUp();
      case "forgot-password":
        return handleForgotPassword();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  if (loading) {
    return (
      <LoadingExperience
        fullScreen
        title="Checking your session"
        description="Looking for an active account session so we can send you to the right workspace instantly."
        label="Authentication loading"
      />
    );
  }

  // Success message (magic link sent, confirmation sent, etc.)
  if (successMessage) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <LogoMark size={48} />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-slate-400 text-sm">{successMessage}</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
            <Mail className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              The link will expire in 1 hour. If you don't see the email, check
              your spam folder.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSuccessMessage(null);
              setError(null);
            }}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm"
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  const showPasswordField =
    mode === "password" || mode === "sign-in" || mode === "sign-up";

  const isSignInMode =
    mode === "sign-in" || (mode === "password" && intent === "signin");
  return (
    <div className="min-h-screen bg-[#060D1F] flex">
      {/* Left panel: branding + features */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 bg-gradient-to-br from-[#0A1128] via-[#0D1A3A] to-[#060D1F] border-r border-white/5 p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <LogoMark size={36} />
            <span className="text-2xl font-bold text-white tracking-tight">
              UnifyOne
            </span>
          </div>
          <p className="text-sm text-slate-500 ml-[48px]">
            by 1Commerce Solutions
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              Your entire commerce
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-blue-400">
                ecosystem, unified.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              One platform to manage products, orders, payments, teams, and
              automations across every channel and integration.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#00D9FF]" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>&copy; 2025 1Commerce Solutions</span>
            <span>&middot;</span>
            <a
              href="/privacy"
              className="hover:text-slate-400 transition-colors"
            >
              Privacy
            </a>
            <span>&middot;</span>
            <a href="/terms" className="hover:text-slate-400 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* Right panel: login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <LogoMark size={32} />
          <span className="text-xl font-bold text-white">UnifyOne</span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {intent === "signup" ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="text-slate-400 text-sm">
              {intent === "signup"
                ? "Start free. No credit card required."
                : "Sign in to your UnifyOne workspace"}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-2">
              <p>{error}</p>
              {errorCode === "email_not_verified" && (
                <button
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="text-[#00D9FF] hover:text-[#00C4E8] transition-colors text-xs underline underline-offset-2 disabled:opacity-50"
                >
                  {isResendingVerification
                    ? "Sending..."
                    : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">
                {intent === "signup" ? "Email" : "Email or username"}
              </Label>
              <Input
                type={intent === "signup" ? "email" : "text"}
                placeholder={
                  intent === "signup"
                    ? "you@yourcompany.com"
                    : "you@yourcompany.com or yourname"
                }
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                  "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
                )}
                autoComplete="email"
                autoFocus
              />
            </div>

            {intent === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Username</Label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase())}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 pl-9 transition-all",
                      "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
                    )}
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Lowercase letters, numbers, dots, hyphens, and underscores.
                </p>
              </div>
            )}

            {showPasswordField && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">Password</Label>
                  {isSignInMode && (
                    <button
                      onClick={() => switchMode("forgot-password")}
                      className="text-xs text-[#00D9FF] hover:text-[#00C4E8] transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder={
                    intent === "signup"
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                    "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
                  )}
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                />
              </div>
            )}

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
                  {mode === "forgot-password"
                    ? "Sending..."
                    : intent === "signup"
                      ? "Creating account..."
                      : "Signing in..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "forgot-password"
                    ? "Send reset link"
                    : intent === "signup"
                      ? "Create account"
                      : "Sign in"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>

          <Separator className="bg-white/10" />
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleOAuth}
            disabled={isGoogleSubmitting || isAuth0Submitting}
            className="w-full h-11 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            {isGoogleSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Google...
              </span>
            ) : (
              "Continue with Google"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAuth0OAuth}
            disabled={isAuth0Submitting || isGoogleSubmitting}
            className="w-full h-11 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            {isAuth0Submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Auth0...
              </span>
            ) : (
              "Continue with Auth0"
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Google and Auth0 sign-in use the configured provider settings and
            create the same secure UnifyOne session.
          </p>

          {CLERK_PUBLISHABLE_KEY && (
            <ClerkSignInSection
              returnTo={returnTo}
              onSuccess={() => navigate(returnTo)}
            />
          )}

          {mode === "password" && (
            <>
              <p className="text-center text-sm text-slate-500">
                {intent === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setIntent("signin");
                        setError(null);
                      }}
                      disabled={isSubmitting}
                      className="text-[#00D9FF] hover:text-[#00C4E8] font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New to UnifyOne?{" "}
                    <button
                      onClick={() => {
                        setIntent("signup");
                        setError(null);
                      }}
                      disabled={isSubmitting}
                      className="text-[#00D9FF] hover:text-[#00C4E8] font-medium transition-colors"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </p>
            </>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
            <Shield className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Your password is securely hashed with scrypt. UnifyOne never
              stores your password in plain text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
