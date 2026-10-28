# Signed-in workspace design

The workspace shares UnifyOne’s public identity: dark ink surfaces, warm orange actions, Inter typography, and the shared framed U/1 brand mark. Financial status colors, provider identities, and chart series retain their meaning.

## Shared components

- `DashboardLayout` owns navigation and the only workspace layout wrapper. Route pages must not render another `DashboardLayout`. `SidebarInset` is a container; the layout supplies the single `main` landmark.
- `workspace.css` defines semantic surface, text, border, action, focus, sidebar, and chart tokens. Prefer these tokens over fixed gold, navy, or white utility colors. Legacy gold and stone variables resolve to the workspace palette.
- The layout sets `data-workspace-brand="unifyone"` on the document while the authenticated workspace is mounted, restoring its previous value on cleanup. This also themes dialogs, menus, and selects rendered through portals.
- `DashboardPageShell` supplies compact headings, wrapping action rows, and responsive summary cards. Controls need visible keyboard focus and comfortable touch targets.
- Loading and error experiences use the shared brand. Loading copy describes actual pending work; default loading states do not invent progress stages.

The styling pass covers core work and money screens, account and billing screens, and secondary commerce, integration, community, developer, and settings pages. The route inventory contains 56 protected patterns across 53 page families. This inventory is broader than the automated visual matrix; it does not imply every route has a screenshot test.

## Verification

`e2e/workspace-consistency.spec.ts` checks 34 route/viewport combinations and five interactions, including mobile navigation, expense dialogs, account controls, and provider readiness. It uses mocked accounts and APIs. Related work, money, CSV, export, and navigation specs check the existing workflows.

`e2e/gigiq-records.spec.ts` verifies that recorded deduction totals remain intact, unavailable data is not presented as zero, unsupported mileage benchmarks are absent, and the period controls fit a 320px viewport.

Marketing product screenshots use synthetic work records captured from the actual workspace. Refresh them when major workspace presentation changes so the public preview stays representative.
