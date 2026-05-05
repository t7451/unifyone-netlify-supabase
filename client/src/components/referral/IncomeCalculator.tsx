import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Mirrors server/routers/referral.ts CREDIT_AWARDS
const CREDITS_PER_SIGNUP = 500;
const CREDITS_PER_CONVERSION = 2000;
const CREDITS_PER_DOLLAR = 100;

interface Props {
  monthlyPlanPrice?: number;
}

export default function IncomeCalculator({ monthlyPlanPrice = 19 }: Props) {
  const [signups, setSignups] = useState([10]);
  const [conversionRate, setConversionRate] = useState([20]);

  const numSignups = signups[0];
  const conversions = Math.round(numSignups * (conversionRate[0] / 100));
  const signupCredits = numSignups * CREDITS_PER_SIGNUP;
  const conversionCredits = conversions * CREDITS_PER_CONVERSION;
  const totalCredits = signupCredits + conversionCredits;
  const dollarValue = totalCredits / CREDITS_PER_DOLLAR;
  const monthsCovered =
    monthlyPlanPrice > 0 ? Math.floor(dollarValue / monthlyPlanPrice) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          Earnings Calculator
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          See what you'd earn from referrals. {CREDITS_PER_DOLLAR} credits = $1
          off your next UnifyOne invoice.
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Users size={16} className="text-primary" /> Signups via your
                link
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {signups[0]}
              </Badge>
            </div>
            <Slider
              value={signups}
              onValueChange={setSignups}
              min={1}
              max={100}
              step={1}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">
              People who created an account from your referral link
            </p>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-secondary" /> Conversion
                rate
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {conversionRate[0]}%
              </Badge>
            </div>
            <Slider
              value={conversionRate}
              onValueChange={setConversionRate}
              min={0}
              max={100}
              step={5}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">
              {conversions} of {signups[0]} signups upgrade to a paid plan (Pro
              $19 / Scale $99)
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">
                Total credits
              </h4>
              <p className="text-3xl font-bold mt-1">
                {totalCredits.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <DollarSign size={24} className="text-secondary" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Worth{" "}
            <span className="font-bold text-foreground">
              ${dollarValue.toLocaleString()}
            </span>{" "}
            — covers{" "}
            <span className="font-bold text-foreground">{monthsCovered}</span>{" "}
            month{monthsCovered === 1 ? "" : "s"} of Pro
          </div>
        </Card>

        <Card className="p-4">
          <h5 className="font-semibold text-sm mb-3">Breakdown</h5>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {signups[0]} signups × {CREDITS_PER_SIGNUP}
              </span>
              <span className="font-semibold">
                {signupCredits.toLocaleString()} credits
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {conversions} conversions × {CREDITS_PER_CONVERSION}
              </span>
              <span className="font-semibold">
                {conversionCredits.toLocaleString()} credits
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total dollar value</span>
              <span>${dollarValue.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {monthsCovered >= 12 && (
          <Card className="p-4 bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/30">
            <div className="flex items-start gap-3">
              <Sparkles
                size={20}
                className="text-secondary flex-shrink-0 mt-0.5"
              />
              <div>
                <h5 className="font-semibold text-sm mb-1">
                  A full year of Pro, free
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  At this referral volume, your credits cover 12+ months of
                  UnifyOne Pro at $19/mo.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="bg-muted/30 p-4 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
        Credits are earned when your referrals sign up ({CREDITS_PER_SIGNUP})
        and again when they convert to paid ({CREDITS_PER_CONVERSION}). Social
        shares earn additional credits (50–75 each). See your{" "}
        <a href="/referrals" className="underline">
          Referrals dashboard
        </a>{" "}
        for full credit history.
      </div>
    </div>
  );
}
