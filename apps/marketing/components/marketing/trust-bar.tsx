const LOGOS = [
  "DoorDash",
  "Uber Eats",
  "Instacart",
  "Amazon Flex",
  "Shopify",
  "Stripe",
  "PayPal",
  "Square",
];

/**
 * Visually-restrained logo trust bar.
 * TODO: Replace text marks with real SVG logos once brand permissions are confirmed.
 */
export function TrustBar() {
  return (
    <section className="border-y border-ink-900/5 bg-white py-10">
      <div className="container">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-500">
          Used by gig operators, sellers, and agencies across the US
        </p>
        <ul className="mt-6 grid grid-cols-2 items-center gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-8">
          {LOGOS.map(name => (
            <li
              key={name}
              className="flex items-center justify-center text-center text-sm font-semibold text-ink-500/70 transition hover:text-ink-900"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
