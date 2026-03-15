import { useState, useEffect } from "react";
import {
  ShoppingCart, Mail, Bell, BarChart3, ArrowRight,
  CheckCircle, Workflow, Globe, CreditCard
} from "lucide-react";

interface FlowStep {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  delay: number;
}

const FLOW_STEPS: FlowStep[] = [
  { id: "order", icon: ShoppingCart, label: "Order Created", sublabel: "Shopify / UnifyOne", color: "#96BF48", delay: 0 },
  { id: "n8n", icon: Workflow, label: "n8n Triggered", sublabel: "Automation fires", color: "#EA4B71", delay: 800 },
  { id: "stripe", icon: CreditCard, label: "Stripe Charged", sublabel: "Payment captured", color: "#635BFF", delay: 1600 },
  { id: "email", icon: Mail, label: "Email Sent", sublabel: "Mailchimp receipt", color: "#FFD700", delay: 2400 },
  { id: "notify", icon: Bell, label: "Owner Notified", sublabel: "Instant alert", color: "#00D9FF", delay: 3200 },
  { id: "analytics", icon: BarChart3, label: "Analytics Updated", sublabel: "Real-time metrics", color: "#10B981", delay: 4000 },
];

const EVENTS = [
  { label: "New order: Apparel Bundle", time: "just now", color: "#96BF48" },
  { label: "Stripe: $79.00 captured", time: "2s ago", color: "#635BFF" },
  { label: "n8n: fulfillment workflow fired", time: "3s ago", color: "#EA4B71" },
  { label: "Email receipt sent to customer", time: "4s ago", color: "#FFD700" },
  { label: "Analytics: revenue +$79", time: "5s ago", color: "#10B981" },
];

export default function AutomationFlowAnimation() {
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [eventLog, setEventLog] = useState<typeof EVENTS>([]);
  const [running, setRunning] = useState(false);

  const runAnimation = () => {
    if (running) return;
    setRunning(true);
    setActiveStep(-1);
    setCompletedSteps(new Set());
    setEventLog([]);

    FLOW_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setActiveStep(i);
        if (i < EVENTS.length) {
          setEventLog(prev => [EVENTS[i], ...prev].slice(0, 5));
        }
        setTimeout(() => {
          setCompletedSteps(prev => { const s = new Set(Array.from(prev)); s.add(i); return s; });
          if (i === FLOW_STEPS.length - 1) {
            setActiveStep(-1);
            setRunning(false);
          }
        }, 600);
      }, step.delay);
    });
  };

  // Auto-run on mount and loop
  useEffect(() => {
    const start = setTimeout(runAnimation, 1000);
    const interval = setInterval(runAnimation, 7000);
    return () => { clearTimeout(start); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#EA4B71]/30 bg-[#EA4B71]/5 text-[#EA4B71] text-sm font-medium mb-4">
          <span className={`w-2 h-2 rounded-full bg-[#EA4B71] ${running ? "animate-pulse" : ""}`} />
          Live Automation Demo
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Watch Your Commerce Run Itself
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          One order triggers a fully automated pipeline — payments, fulfillment, notifications, and analytics — without a single manual step.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Flow diagram */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-white font-semibold text-sm">Automation Pipeline</span>
              <button
                onClick={runAnimation}
                disabled={running}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running ? "Running..." : "▶ Replay"}
              </button>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-3 gap-3">
              {FLOW_STEPS.map((step, i) => {
                const isActive = activeStep === i;
                const isDone = completedSteps.has(i);
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`relative rounded-xl p-4 border transition-all duration-500 ${
                      isActive
                        ? "border-current scale-105 shadow-lg"
                        : isDone
                        ? "border-white/10 opacity-80"
                        : "border-white/5 opacity-40"
                    }`}
                    style={{
                      backgroundColor: isActive ? step.color + "15" : isDone ? step.color + "08" : "transparent",
                      borderColor: isActive ? step.color : isDone ? step.color + "40" : undefined,
                      boxShadow: isActive ? `0 0 20px ${step.color}30` : undefined,
                    }}
                  >
                    {/* Connector arrow between steps */}
                    {i % 3 !== 2 && (
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                        <ArrowRight
                          className="w-3 h-3 transition-colors duration-300"
                          style={{ color: isDone ? step.color : "#ffffff20" }}
                        />
                      </div>
                    )}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-all duration-300"
                      style={{ backgroundColor: step.color + "20", border: `1px solid ${step.color}40` }}
                    >
                      {isDone && !isActive ? (
                        <CheckCircle className="w-4 h-4" style={{ color: step.color }} />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`}
                          style={{ color: step.color }}
                        />
                      )}
                    </div>
                    <div className="text-white text-xs font-semibold leading-tight">{step.label}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5">{step.sublabel}</div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Pipeline Progress</span>
                <span className="text-xs text-[#00D9FF]">
                  {completedSteps.size}/{FLOW_STEPS.length} steps
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(completedSteps.size / FLOW_STEPS.length) * 100}%`,
                    background: "linear-gradient(90deg, #00D9FF, #635BFF, #10B981)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live event log */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6 border border-white/10 h-full">
            <div className="flex items-center gap-2 mb-5">
              <span className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
              <span className="text-white font-semibold text-sm">Event Stream</span>
            </div>

            <div className="space-y-3">
              {eventLog.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Waiting for events...</p>
                </div>
              ) : (
                eventLog.map((ev, i) => (
                  <div
                    key={`${ev.label}-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: ev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ev.label}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{ev.time}</p>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
                        new
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Integration badges */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-3">Connected Integrations</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "n8n", color: "#EA4B71" },
                  { name: "Stripe", color: "#635BFF" },
                  { name: "Mailchimp", color: "#FFD700" },
                  { name: "Shopify", color: "#96BF48" },
                  { name: "Zapier", color: "#FF4A00" },
                  { name: "Supabase", color: "#3ECF8E" },
                ].map(int => (
                  <span
                    key={int.name}
                    className="text-[10px] px-2 py-1 rounded-md font-medium"
                    style={{ backgroundColor: int.color + "15", color: int.color, border: `1px solid ${int.color}30` }}
                  >
                    {int.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
