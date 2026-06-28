import { MARKET_SIGNALS, LAUNCH_METRICS } from "../Home.constants";
import { CountUpMetric } from "./CountUpMetric";

export function StatsSection({
  statsRef,
  liveMetricValues,
  isLoading,
}: {
  statsRef: React.RefObject<HTMLDivElement | null>;
  liveMetricValues: {
    tenants: number;
    ordersProcessed: number;
    integrations: number;
  };
  isLoading: boolean;
}) {
  return (
    <section
      className="parchment-bg"
      style={{
        borderTop: "1px solid var(--parchment-line)",
        borderBottom: "1px solid var(--parchment-line)",
      }}
    >
      <div ref={statsRef} className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="text-center mb-10">
          <span className="inscription-ink">Live launch stats</span>
          <h2
            className="font-cinzel text-3xl sm:text-4xl font-black mt-4 mb-4"
            style={{ color: "var(--ink)" }}
          >
            Real traction, not vanity copy.
          </h2>
          <p
            className="font-crimson text-lg mobile-visibility-copy"
            style={{
              color: "var(--ink-soft)",
              fontStyle: "italic",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            These counters update from real platform activity so you can see
            what is already live before you sign up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {LAUNCH_METRICS.map((metric, index) => (
            <div
              key={metric.key}
              data-reveal
              data-reveal-delay={String(index * 100)}
            >
              <CountUpMetric
                value={liveMetricValues[metric.key]}
                label={metric.label}
                accent={metric.accent}
                loading={isLoading}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {MARKET_SIGNALS.map((stat, i) => (
            <div
              key={stat.value}
              data-reveal
              data-reveal-delay={String(i * 80)}
              className="text-center"
            >
              <div
                className="stat-value mb-2"
                style={{ color: "var(--gold-ink)" }}
              >
                {stat.value}
              </div>
              <p
                className="font-crimson text-sm mobile-visibility-subtle"
                style={{ color: "var(--ink-faint)", lineHeight: 1.5 }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
