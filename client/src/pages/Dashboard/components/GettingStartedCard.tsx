import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/userTracking";

import { STARTER_ACTIONS } from "../Dashboard.constants";

type GettingStartedCardProps = {
  navigate: (path: string) => void;
};

export function GettingStartedCard({ navigate }: GettingStartedCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-white">Getting started</CardTitle>
        <p className="text-sm text-slate-400">
          Your workspace is ready. Pick a starting point — track your gig
          shifts, manage your money, or set up your store.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STARTER_ACTIONS.map(action => (
            <button
              key={action.title}
              type="button"
              onClick={() => {
                // Funnel: which first action a new user pursues from the
                // getting-started empty state (intent → activation_event).
                trackEvent("getting_started_click", {
                  action: action.href,
                });
                navigate(action.href);
              }}
              className="rounded-xl border border-border bg-background/40 p-4 text-left transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#00D9FF]/10 text-[#00D9FF]">
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-white">{action.title}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {action.description}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-[#00D9FF]">
                Open <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
