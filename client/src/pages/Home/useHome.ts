import { useEffect } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { trpc } from "@/lib/trpc";

export function useHome() {
  const heroRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const pillarsRef = useScrollReveal();
  const ctaRef = useScrollReveal();
  const launchStats = trpc.system.launchStats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootScrollBehavior = root.style.scrollBehavior;
    const previousBodyScrollBehavior = body.style.scrollBehavior;

    root.style.scrollBehavior = "smooth";
    body.style.scrollBehavior = "smooth";

    return () => {
      root.style.scrollBehavior = previousRootScrollBehavior;
      body.style.scrollBehavior = previousBodyScrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const targetId = window.location.hash.slice(1);
    const scrollTimeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(scrollTimeoutId);
  }, []);

  const scrollToSection =
    (sectionId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById(sectionId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({ sectionId }, "", `#${sectionId}`);
    };

  // Use live DB values; fall back to launch-floor minimums so the metrics
  // section never shows bare zeros while the platform is in early growth.
  const liveMetricValues = {
    tenants: Math.max(launchStats.data?.tenants ?? 0, 4),
    ordersProcessed: launchStats.data?.ordersProcessed ?? 0,
    integrations: launchStats.data?.integrations ?? 10,
  };

  return {
    heroRef,
    statsRef,
    pillarsRef,
    ctaRef,
    launchStats,
    scrollToSection,
    liveMetricValues,
  };
}
