# Marketing refinement — October 23, 2026

## Scope

Refine the main public journey for UnifyOne's gig and independent-worker audience:
Home, Pricing, About, Contact, Tools, Resources, Blog, and How It Works. Keep the
authenticated product, billing catalog, calculator math, and legacy download API
contracts outside this change. The pending Chime placement remains on its own
branch and is not included here.

## Audit findings and resulting changes

| Finding                                                                                                        | Change                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dense desktop navigation and tiny, low-contrast labels                                                         | Readable header, explicit Sign in and Start free actions, earlier mobile breakpoint                                                                |
| Mobile menu had no accessible name or expanded state                                                           | Named toggle with controls/expanded attributes, Escape dismissal and focus return, route and outside-click dismissal                               |
| Homepage mixed gig work with an unrelated store-building animation                                             | One focused journey: record work, understand take-home, plan ahead                                                                                 |
| Hard-coded worker counts, savings averages, uptime, and testimonials had no supporting evidence in the content | Removed these blocks from the rendered homepage; replaced them with clearly labeled illustrative data                                              |
| Hero implied direct account integrations and guaranteed tax outcomes                                           | Copy describes logging records and using estimates, with platform/AI boundaries explained in FAQ                                                   |
| Annual pricing presented a monthly equivalent by default                                                       | Monthly default; annual selection shows the full $49 charge and matching yearly checkout link                                                      |
| Homepage and Pricing used different pricing implementations                                                    | Both now render the same component from the existing gig plan catalog; savings percentage derives from prices                                      |
| “Most Chosen” and refund claims were presented without validation in this audit                                | Omitted from the new marketing cards; link to subscription terms for review                                                                        |
| Resource labels did not match download contents                                                                | New searchable library links directly to existing on-site guides, rather than disguising legacy commerce downloads as tax resources                |
| Example: “Mileage & Expense Log” linked to a content calendar CSV                                              | Removed the misleading library entry; the existing download API is retained for backward compatibility                                             |
| Example: “Quarterly Estimated Taxes 101” linked to an enterprise-AI worksheet                                  | Replaced with actual tax-guide entry points                                                                                                        |
| Tools and Resources lacked the shared public navigation/footer                                                 | Added the public shell and consistent library layout                                                                                               |
| Resource discovery relied on browsing all cards                                                                | Search, category filtering for guides, live result counts, and clear empty-state recovery                                                          |
| Contact form styling was dated and feedback could hide useful errors                                           | New accessible labels and native constraints, busy/success/error feedback, preserved messages on failure, server error feedback, retained honeypot |
| Cookie copy still described shopping                                                                           | Product-appropriate analytics explanation; existing consent behavior retained                                                                      |
| Route-loading copy exposed implementation jargon                                                               | Short page-loading message without claims about session verification or visual “polishing”                                                         |
| Static homepage and JSON-LD contained stale integration claims and duplicate page-specific schema              | Updated fallback copy and core metadata; removed inherited homepage FAQ/how-to claims; runtime FAQ schema derives from the displayed FAQ data      |

## Validation

- Production frontend and server bundle build completed.
- Changed TypeScript/TSX files pass ESLint.
- SEO gates pass: robots/sitemap rules match, required tool schema checks pass,
  and all 220 public sitemap routes have their expected generated files.
- Browser layout checks: 8 pages at 320, 768, 1024, and 1440 pixels (32 cases).
  Every case has one main landmark, one h1, and no horizontal overflow.
- Additional phone checks at 390 pixels: menu opens and Escape closes it;
  menu-to-Pricing navigation works; monthly and annual prices and encoded
  post-signup checkout links match the selected period.
- Guide search finds the budgeting guide, missing searches show an empty state,
  Clear filters restores the library, and Money returns four guides.
- Tool search finds mileage, missing searches recover with Clear search, and
  all nine existing tools remain listed.
- Resource-request contact URL pre-fills the message. Email type, message
  minimum length, and honeypot tab exclusion were inspected in the browser.
  No live contact submission or paid checkout was performed.
- Repository-wide TypeScript check reports 20 errors confined to RoutePulse.
  An in-memory compile against the unchanged HEAD versions of edited files
  reproduces those same 20 baseline errors. No marketing-file error was found.
- Screenshots and layout-check data are saved locally under
  `.agent-output/marketing-review/` (ignored by Git).

## Follow-up work

1. Review and modernize individual article and calculator page templates;
   this change updates their discovery paths, not every article's layout.
2. Reconcile older commerce-focused SEO pages and downloads with the current
   audience before changing routes or removing indexed material.
3. Verify actual plan entitlements, AI availability, billing cancellation/refund
   terms, tracking accuracy, and support response expectations in a signed-in
   environment before making stronger marketing claims.
4. Repair the existing RoutePulse TypeScript errors in a separate product change.
5. After release approval, validate hosted assets, redirects, contact delivery,
   consent behavior, and the signup journey on production and a physical phone.

The source/build checks above do not confirm deployment or live contact delivery.
