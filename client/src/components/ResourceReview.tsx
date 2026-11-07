import {
  RESOURCE_REVIEW_DATE,
  RESOURCE_REVIEW_LABEL,
  REVIEWED_RESOURCE_SLUGS,
  TAX_REVIEW,
  TAX_REVIEW_SOURCES,
} from "@/content/resourceReview";

export default function ResourceReview({
  slug,
  tax = false,
}: {
  slug: string;
  tax?: boolean;
}) {
  if (!REVIEWED_RESOURCE_SLUGS.includes(slug)) return null;
  return (
    <aside
      className="rounded-xl border bg-muted/30 p-5 my-6 text-sm leading-relaxed"
      aria-label="Guide review and sources"
    >
      <p>
        Reviewed{" "}
        <time dateTime={RESOURCE_REVIEW_DATE}>{RESOURCE_REVIEW_LABEL}</time>.{" "}
        {tax
          ? "U.S. federal guidance; state and local rules may differ."
          : "Sources and scope are listed in this guide."}
      </p>
      {slug === "gig-worker-emergency-fund" && (
        <p className="mt-2">
          This review covers the editorial guidance. The sponsored mention is
          retained as supplied and keeps its original source date; its product
          terms are not reverified by this review.
        </p>
      )}
      {tax && (
        <>
          <h2 className="font-semibold mt-4">2026 tax-year notes</h2>
          <ul className="list-disc pl-5 space-y-3 mt-3">
            {[
              TAX_REVIEW.nec,
              TAX_REVIEW.k,
              TAX_REVIEW.mileage,
              TAX_REVIEW.dates,
              TAX_REVIEW.tips,
            ].map(note => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <h3 className="font-semibold mt-4">Check the official guidance</h3>
          <ul className="space-y-2 mt-2">
            {TAX_REVIEW_SOURCES.map(source => (
              <li key={source.href}>
                <a className="text-primary underline" href={source.href}>
                  {source.label}
                </a>
              </li>
            ))}
            {slug === "doordash-taxes" && (
              <li>
                <a
                  className="text-primary underline"
                  href="https://help.doordash.com/en-us/dashers/article/common-dasher-tax-questions"
                >
                  DoorDash: Dasher tax documents (delivery instructions; page
                  still describes 2025 thresholds)
                </a>
              </li>
            )}
            {slug === "uber-driver-taxes" && (
              <li>
                <a
                  className="text-primary underline"
                  href="https://help.uber.com/driving-and-delivering/article/access-1099-tax-form?nodeId=711e7793-2c57-4e48-94d5-537f2637dd2a"
                >
                  Uber: Tax Summary and 1099 access (2025 document cycle)
                </a>
              </li>
            )}
          </ul>
        </>
      )}
    </aside>
  );
}
