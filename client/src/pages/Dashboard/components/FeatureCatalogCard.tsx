import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FEATURE_COUNT,
  orderedCategoriesForProduct,
} from "@/lib/featureCatalog";
import { cn } from "@/lib/utils";

import { categoryToneClasses } from "../Dashboard.constants";
import type { OnboardingStatus } from "../Dashboard.types";

type FeatureCatalogCardProps = {
  onboardingStatus: OnboardingStatus;
  openOnboarding: (categoryId?: string) => void;
};

export function FeatureCatalogCard({
  onboardingStatus,
  openOnboarding,
}: FeatureCatalogCardProps) {
  const { user } = useAuth();
  const primaryProduct = user?.primaryProduct;
  // Gig operators see Gig Operations first with commerce demoted; commerce
  // tenants keep the commerce-led order.
  const categories = useMemo(
    () => orderedCategoriesForProduct(primaryProduct),
    [primaryProduct]
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-white">
            What you can run in UnifyOne
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            The platform is organized into {categories.length} operating areas
            and {FEATURE_COUNT} guided modules. Use this map to pick a lane,
            then open the wizard for module-by-module next actions.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Badge
            variant="outline"
            className={cn(
              "w-fit border-white/10 bg-white/5",
              onboardingStatus === "completed"
                ? "text-emerald-300"
                : "text-cyan-200"
            )}
          >
            {onboardingStatus === "completed"
              ? "Onboarding complete"
              : `${FEATURE_COUNT} modules mapped`}
          </Badge>
          <Button
            type="button"
            size="sm"
            className="bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
            onClick={() => openOnboarding()}
          >
            Start full walkthrough <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map(category => {
            const Icon = category.icon;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => openOnboarding(category.id)}
                className="rounded-xl border border-border/70 bg-background/35 p-4 text-left transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                      categoryToneClasses[category.tone]
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-white">
                        {category.title}
                      </h3>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                        {category.features.length}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {category.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {category.features.slice(0, 4).map(feature => (
                    <span
                      key={feature.path}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300"
                    >
                      {feature.label}
                    </span>
                  ))}
                  {category.features.length > 4 ? (
                    <span className="rounded-full border border-[#00D9FF]/20 bg-[#00D9FF]/10 px-2.5 py-1 text-xs text-[#00D9FF]">
                      +{category.features.length - 4} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
