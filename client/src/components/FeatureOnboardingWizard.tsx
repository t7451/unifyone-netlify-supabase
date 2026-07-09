import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Map,
  Rocket,
} from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FEATURE_COUNT,
  onboardingGoalsForProduct,
  orderedCategoriesForProduct,
  resolveFeaturePath,
  type FeatureCategory,
} from "@/lib/featureCatalog";
import { cn } from "@/lib/utils";

type FeatureOnboardingWizardProps = {
  open: boolean;
  initialCategoryId?: string;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onNavigate: (path: string) => void;
};

const toneClasses: Record<FeatureCategory["tone"], string> = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  slate: "border-slate-400/25 bg-slate-400/10 text-slate-200",
};

const gigLaunchSequence = [
  {
    title: "Foundation",
    description: "Confirm Settings, Team, Notifications, and Integrations.",
  },
  {
    title: "Earning Visibility",
    description:
      "Open Gig Command, start a tracked shift, and review Money Manager.",
  },
  {
    title: "Tax Readiness",
    description:
      "Log mileage, review deductions, and prepare quarterly-tax estimates.",
  },
  {
    title: "Multi-App Income",
    description:
      "Consolidate earnings across every gig app and compare Gig Worker Plans.",
  },
  {
    title: "Automation Layer",
    description:
      "Turn on Automations, Kai, mobile workflows, and builder workspaces.",
  },
  {
    title: "Optional Commerce",
    description:
      "Add Products, test Checkout, and connect payment rails if you also sell.",
  },
];

const commerceLaunchSequence = [
  {
    title: "Foundation",
    description: "Confirm Settings, Team, Authorization Hub, and Integrations.",
  },
  {
    title: "Sellable Store",
    description:
      "Add Products, test Checkout, and prepare Orders and Customers.",
  },
  {
    title: "Channel Readiness",
    description:
      "Connect Shopify, review Sync Monitor, and choose storefront themes.",
  },
  {
    title: "Growth Motion",
    description:
      "Use Analytics, Leads, Social, Referrals, Affiliates, and Ad Copy Hub.",
  },
  {
    title: "Automation Layer",
    description:
      "Turn on Automations, Kai, mobile workflows, and builder workspaces.",
  },
  {
    title: "Control Loop",
    description:
      "Watch Money Manager, Governance, Developer Hub, Terminal, and Documents.",
  },
];

export function FeatureOnboardingWizard({
  open,
  initialCategoryId,
  onOpenChange,
  onComplete,
  onNavigate,
}: FeatureOnboardingWizardProps) {
  const { user } = useAuth();
  const primaryProduct = user?.primaryProduct;
  // Product-aware ordering: gig operators (the default) walk Gig Operations
  // first with commerce demoted; commerce tenants keep the commerce-led walk.
  const categories = useMemo(
    () => orderedCategoriesForProduct(primaryProduct),
    [primaryProduct]
  );
  const goals = useMemo(
    () => onboardingGoalsForProduct(primaryProduct),
    [primaryProduct]
  );
  const launchSequence =
    primaryProduct === "commerce" ? commerceLaunchSequence : gigLaunchSequence;

  const [activeStep, setActiveStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() =>
    goals.slice(0, 3)
  );

  const steps = useMemo(
    () => [
      "Operating path",
      ...categories.map(item => item.title),
      "Launch plan",
    ],
    [categories]
  );
  const finalStep = steps.length - 1;
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);
  const activeCategory =
    activeStep > 0 && activeStep < finalStep
      ? categories[activeStep - 1]
      : null;

  useEffect(() => {
    if (open) {
      const categoryIndex = initialCategoryId
        ? categories.findIndex(item => item.id === initialCategoryId)
        : -1;
      setActiveStep(categoryIndex >= 0 ? categoryIndex + 1 : 0);
    }
  }, [categories, initialCategoryId, open]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(current =>
      current.includes(goal)
        ? current.filter(item => item !== goal)
        : [...current, goal]
    );
  };

  const goToFeature = (path: string) => {
    // The home tile stores a sentinel path; resolve the real landing for this
    // tenant's primary product before navigating.
    onNavigate(resolveFeaturePath(path, primaryProduct));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden border-white/10 bg-[#07111f] p-0 text-white sm:max-w-5xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 text-left sm:px-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="text-2xl font-semibold text-white">
                Platform onboarding
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-slate-300">
                A guided map through all {FEATURE_COUNT} UnifyOne modules, what
                each one does, and the first useful action to take.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            >
              {activeStep + 1} of {steps.length}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
              <span>{steps[activeStep]}</span>
              <span>{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="bg-white/10 [&>div]:bg-cyan-300"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh]">
          <div className="px-5 py-5 sm:px-6">
            {activeStep === 0 ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                      <Map className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Choose the operating outcomes that matter first
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        The wizard still covers every module, but your selected
                        goals make the launch plan easier to interpret.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {goals.map(goal => {
                      const selected = selectedGoals.includes(goal);

                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                            selected
                              ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                          )}
                        >
                          <span>{goal}</span>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        What this walkthrough covers
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {categories.length} operating areas across gig work,
                        commerce, growth, AI, finance, governance, and developer
                        tooling.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {categories.map((category, index) => {
                      const Icon = category.icon;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setActiveStep(index + 1)}
                          className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/10 p-3 text-left transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/5"
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                              toneClasses[category.tone]
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {category.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {category.features.length} modules
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-500" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : activeCategory ? (
              <section>
                <div className="mb-5 flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
                        toneClasses[activeCategory.tone]
                      )}
                    >
                      <activeCategory.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {activeCategory.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                        {activeCategory.summary}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-white/10 bg-white/5 text-slate-200"
                  >
                    {activeCategory.features.length} modules
                  </Badge>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {activeCategory.features.map(feature => {
                    const Icon = feature.icon;

                    return (
                      <article
                        key={feature.path}
                        className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                              toneClasses[activeCategory.tone]
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h4 className="font-semibold text-white">
                                  {feature.label}
                                </h4>
                                <p className="mt-1 text-sm leading-6 text-slate-300">
                                  {feature.description}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 shrink-0 justify-start px-0 text-cyan-200 hover:bg-transparent hover:text-cyan-100 sm:px-2"
                                onClick={() => goToFeature(feature.path)}
                              >
                                Open{" "}
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-400 sm:grid-cols-2">
                              <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                                <span className="block font-medium uppercase tracking-[0.16em] text-slate-500">
                                  Outcome
                                </span>
                                <span className="mt-1 block text-slate-300">
                                  {feature.outcome}
                                </span>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                                <span className="block font-medium uppercase tracking-[0.16em] text-slate-500">
                                  First action
                                </span>
                                <span className="mt-1 block text-slate-300">
                                  {feature.firstAction}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Your launch path
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Start with the modules that prove the workspace can
                        earn, then layer growth, automation, finance, and
                        governance.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedGoals.length > 0 ? (
                      selectedGoals.map(goal => (
                        <Badge
                          key={goal}
                          variant="outline"
                          className="mr-2 border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                        >
                          {goal}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        No goals selected. The default launch path still covers
                        every feature area.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-semibold text-white">
                    Recommended order of operations
                  </h3>
                  <div className="mt-4 space-y-3">
                    {launchSequence.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-black/10 p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-semibold text-cyan-200">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-white/10 px-5 py-4 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-300 hover:bg-white/5 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              Close for now
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                disabled={activeStep === 0}
                onClick={() => setActiveStep(step => Math.max(0, step - 1))}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              {activeStep === finalStep ? (
                <Button
                  type="button"
                  className="bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"
                  onClick={onComplete}
                >
                  Mark onboarding complete
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"
                  onClick={() =>
                    setActiveStep(step => Math.min(finalStep, step + 1))
                  }
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
