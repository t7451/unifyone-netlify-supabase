import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_URLS } from "@/lib/utils";

export function CtaBand({
  title = "Start free. See your real numbers in 5 minutes.",
  subtitle = "1 tenant free forever. No credit card. Upgrade only when you outgrow it.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 py-16 text-white sm:py-20">
      <div className="container flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-100">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="xl" variant="accent">
            <a href={APP_URLS.signup} data-analytics-cta="cta-band-primary">
              Start Free <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button
            asChild
            size="xl"
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20 border-white/20"
          >
            <a href="/contact" data-analytics-cta="cta-band-secondary">
              Talk to sales
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
