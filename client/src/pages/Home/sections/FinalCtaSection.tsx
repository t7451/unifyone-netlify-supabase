import { getSignupUrl } from "@/const";

export function FinalCtaSection({
  ctaRef,
  scrollToSection,
}: {
  ctaRef: React.RefObject<HTMLElement | null>;
  scrollToSection: (
    sectionId: string
  ) => (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <section
      ref={ctaRef}
      className="apex-light-soft"
      style={{
        padding: "7rem 0",
      }}
    >
      <div
        data-reveal
        data-reveal-delay="0"
        className="max-w-3xl mx-auto px-6 sm:px-8 text-center"
      >
        <span className="inscription-ink">Get started</span>
        <h2
          className="font-cinzel text-3xl sm:text-4xl font-black mt-6 mb-6"
          style={{ color: "var(--ink)" }}
        >
          Know what every shift
          <br />
          actually earns you.
        </h2>
        <p
          className="font-crimson text-lg mb-10 mobile-visibility-copy"
          style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
        >
          Start free — no credit card. The Free plan includes the shift tracker,
          mileage log, tax calculators, and 25 AI requests a month. Upgrade to
          Pro for $4.99/mo whenever you&rsquo;re ready.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={getSignupUrl()} className="btn-solid-gold">
            Start Free — No Card
          </a>
          <a
            href="#blueprint"
            onClick={scrollToSection("blueprint")}
            className="btn-line-ink cursor-pointer"
          >
            Get the Free Tax Guide →
          </a>
        </div>
      </div>
    </section>
  );
}
