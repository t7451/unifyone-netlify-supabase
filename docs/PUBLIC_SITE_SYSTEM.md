# Public site and brand system

## Identity

UnifyOne's mark keeps the framed geometry and central stroke of the original
1Commerce-family emblem. Its open U, central one and orange accent distinguish
the product. Use `BrandMark` and `BrandLockup` from `components/Brand.tsx` in the
public shell, sign-in flows and workspace navigation. Do not recreate the logo
with typed initials, a generic icon or a separate font treatment.

The standalone vector is `client/public/brand/unifyone-mark.svg`. The favicon,
install icons and current press SVG/PNG use this geometry. The original gold
lockup is preserved as `client/public/brand/legacy-unifyone-logo.svg` and `.png`.
The parent identity is not redefined by this product refresh.

## Page families

- Marketing, catalogue, SEO index and ordinary public product pages: PublicLayout.
- Articles, guides, references and policies: ReadingLayout, which uses PublicLayout.
- Calculators: ToolLayout, or PublicLayout for the two independently implemented
  profit/mileage calculators. Preserve their existing calculations and data rules.
- Map-first RoutePulse: retain its immersive mobile layout.
- Authentication, install callbacks and checkout confirmation: retain standalone
  flow structure, with the shared brand where a product identity is shown.
  Sign-in, registration, reset, verification and callback presentation use the
  same ink/orange palette and Inter without changing authentication behavior.

The source audit identified 194 public route patterns across 68 component
families. All 61 ordinary public families use a shared shell; seven special
families cover nine auth/install/checkout patterns. These are source coverage
counts, not a claim that every dynamic URL was browser tested.

## Shared styling and interaction

Public colors and semantic form tokens live in marketing.css; reading.css handles
article/calculator structure. Use the ink/orange palette, Inter headings, semantic
error/success colors and visible focus indicators. PublicLayout temporarily
applies the same semantic tokens to portaled controls, then restores the app theme
when leaving the public surface.

The mobile navigation supports initial link focus, Escape, outside dismissal,
route-change dismissal and desktop-resize dismissal. Its signup action stays
available on small screens. Reduced-motion preferences are respected.

Searchable catalogues share full-text search, counts, clear/reset controls and
focus recovery. Reading outlines use unique IDs and focus their targets beneath
the sticky header. Contact fields disable during submission and retain text on
failure. Do not replace these interactions with cosmetic hover effects.

## Verification

Run the public consistency, catalogue, reading, calculator and workspace navigation
browser specs against a fixed production preview. The route matrix samples four
viewport sizes and additional legacy public surfaces; it checks one main/heading,
shared navigation/footer/mark, loaded images, overflow and console/asset errors.
Keep numerical calculator tests, public crawl tests, TypeScript, lint, SEO gates
and production builds passing. Never use production personal data in screenshots
or submit real contact requests while testing.
