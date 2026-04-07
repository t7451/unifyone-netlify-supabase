import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
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
  KeyRound,
} from "lucide-react";

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

type AuthMode = "password" | "magic-link";

async function exchangeSupabaseSession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return false;

  const res = await fetch("/api/auth/supabase-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ access_token: session.access_token }),
  });
  return res.ok;
}

type LoginIntent = "signin" | "signup";

export default function Login({
  initialIntent = "signin",
}: { initialIntent?: LoginIntent } = {}) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [intent, setIntent] = useState<LoginIntent>(initialIntent);
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  // Check URL for error params (e.g., from failed magic link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError === "invalid_link") {
      setError("That link has expired or is invalid. Please try again.");
    }
  }, []);

  const handlePasswordSignIn = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(authError.message);
        }
        return;
      }

      const exchanged = await exchangeSupabaseSession();
      if (exchanged) {
        navigate("/dashboard");
      } else {
        setError("Failed to create session. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSignUp = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // If email confirmation is required, Supabase won't return a session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const exchanged = await exchangeSupabaseSession();
        if (exchanged) {
          navigate("/dashboard");
          return;
        }
      }

      setError(null);
      setMagicLinkSent(true); // Reuse the "check your email" UI
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (mode === "password") {
      handlePasswordSignIn();
    } else {
      handleMagicLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LogoMark size={48} />
          <div className="w-6 h-6 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <LogoMark size={48} />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-slate-400 text-sm">
              We sent a sign-in link to{" "}
              <span className="text-white font-medium">{email}</span>.
              <br />
              Click the link in the email to sign in to your workspace.
            </p>
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
              setMagicLinkSent(false);
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

        <div className="w-full max-w-[400px] space-y-8">
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

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => {
                setMode("password");
                setError(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                mode === "password"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Password
            </button>
            <button
              onClick={() => {
                setMode("magic-link");
                setError(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                mode === "magic-link"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Mail className="w-3.5 h-3.5" />
              Magic Link
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Email</Label>
              <Input
                type="email"
                placeholder="you@yourcompany.com"
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

            {mode === "password" && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Password</Label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                    "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20"
                  )}
                  autoComplete="current-password"
                />
              </div>
            )}

            <Button
              onClick={
                mode === "password"
                  ? intent === "signup"
                    ? handlePasswordSignUp
                    : handlePasswordSignIn
                  : handleMagicLink
              }
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
                  {mode === "password"
                    ? intent === "signup"
                      ? "Creating account..."
                      : "Signing in..."
                    : "Sending magic link..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "password"
                    ? intent === "signup"
                      ? "Create account"
                      : "Sign in"
                    : "Send magic link"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>

          {mode === "password" && (
            <>
              <Separator className="bg-white/10" />
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
              Your sign-in is protected by Supabase Auth with PKCE flow.
              UnifyOne never stores your password directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
