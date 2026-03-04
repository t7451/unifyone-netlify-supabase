import { useState, useEffect } from "react";
import { getOAuthUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ShoppingBag, BarChart3, Zap, Shield, ArrowRight, Loader2,
  Check, Globe, CreditCard, Users
} from "lucide-react";

// ── Feature highlights shown on the left panel ────────────────────────────────
const FEATURES = [
  { icon: ShoppingBag, text: "Multi-tenant product catalog & order management" },
  { icon: BarChart3, text: "Real-time analytics across every channel" },
  { icon: Zap, text: "Automated workflows via n8n, Zapier & Mailchimp" },
  { icon: CreditCard, text: "Stripe & PayPal payments, built in" },
  { icon: Users, text: "Team management with role-based access" },
  { icon: Globe, text: "Theme Store — launch branded storefronts instantly" },
];

// ── Animated logo mark ────────────────────────────────────────────────────────
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#lg)" />
      <path d="M10 14 L20 26 L30 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D9FF" />
          <stop offset="1" stopColor="#0066FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Main Login Page ───────────────────────────────────────────────────────────
export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleContinue = () => {
    setIsRedirecting(true);
    // Small delay to show branded loading state before OAuth redirect
    setTimeout(() => {
      window.location.href = getOAuthUrl();
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleContinue();
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

  return (
    <div className="min-h-screen bg-[#060D1F] flex">
      {/* ── Left panel: branding + features ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 bg-gradient-to-br from-[#0A1128] via-[#0D1A3A] to-[#060D1F] border-r border-white/5 p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <LogoMark size={36} />
            <span className="text-2xl font-bold text-white tracking-tight">UnifyOne</span>
          </div>
          <p className="text-sm text-slate-500 ml-[48px]">by 1Commerce Solutions</p>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              Your entire commerce<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-blue-400">
                ecosystem, unified.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              One platform to manage products, orders, payments, teams, and automations
              across every channel and integration.
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

        {/* Footer */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>© 2025 1Commerce Solutions</span>
            <span>·</span>
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-slate-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* ── Right panel: login form ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <LogoMark size={32} />
          <span className="text-xl font-bold text-white">UnifyOne</span>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm">Sign in to your UnifyOne workspace</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Work email</Label>
              <Input
                type="email"
                placeholder="you@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className={cn(
                  "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 transition-all",
                  "focus:border-[#00D9FF]/50 focus:bg-white/8 focus:ring-1 focus:ring-[#00D9FF]/20",
                  emailFocused && "border-[#00D9FF]/30"
                )}
                autoComplete="email"
                autoFocus
              />
            </div>

            <Button
              onClick={handleContinue}
              disabled={isRedirecting}
              className={cn(
                "w-full h-11 font-semibold text-sm transition-all",
                "bg-gradient-to-r from-[#00D9FF] to-blue-500 hover:from-[#00C4E8] hover:to-blue-600",
                "text-[#060D1F] shadow-lg shadow-[#00D9FF]/20",
                isRedirecting && "opacity-80 cursor-not-allowed"
              )}
            >
              {isRedirecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting securely…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <Separator className="bg-white/10" />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#060D1F] px-3 text-xs text-slate-600">
              or continue with
            </span>
          </div>

          {/* SSO / Social sign-in options */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={handleContinue}
              disabled={isRedirecting}
              className="h-11 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
            <Shield className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Your sign-in is protected by enterprise-grade OAuth 2.0 with JWT session tokens.
              UnifyOne never stores your password.
            </p>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-slate-500">
            New to UnifyOne?{" "}
            <button
              onClick={handleContinue}
              className="text-[#00D9FF] hover:text-[#00C4E8] font-medium transition-colors"
            >
              Create a free account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
