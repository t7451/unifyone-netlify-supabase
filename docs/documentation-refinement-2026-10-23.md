# Documentation and support-path refinement — October 23, 2026

Continues draft PR #458 after the article/calculator pass.

## Changes

- Rebuilt `/documents` as a useful directory of public tools, guides, workflow
  examples, technical references, and project history. Removed nested anchors,
  misleading tax-guide labels on commerce integrations, and the unrelated
  video/ad-copy shortcuts. Existing documentation aliases still resolve.
- Replaced unsubstantiated customer success metrics with four explicitly
  illustrative workflows. No customer outcome is implied.
- Rewrote the architecture overview around the actual React/Express/tRPC stack
  and separate Neon/Supabase responsibilities described in the repository.
  Removed unsupported security guarantees and feature-availability claims.
- Preserved the recorded phase list on the project-history page, while removing
  stale test/error counts, unsupported achievement statistics, and completion
  checkmarks. Links now use the current `t7451` repository owner.
- Refined the technical reference layout, section selection, code blocks, and
  checklist. Removed provider cards whose buttons led to generic sections.
  Code copy awaits clipboard success and reports failure. Code blocks accept
  keyboard focus and horizontal scrolling; checklist progress uses a labeled
  native progress element.
- Privacy and terms share the public navigation, readable article layout,
  and section outline. Their policy body text, dates, and contact details are
  unchanged, verified by comparing parsed JSX text against the prior commit.
- Rebuilt the 404 page with clear links home, to tools, guides, and support.
  It retains its `noindex, follow` directive.
- Updated static route metadata to match the revised documentation pages.

## Validation

- 39 responsive browser cases pass: 11 documentation/policy/alias/404 paths,
  plus an existing article and calculator, at 320, 768, and 1440 pixels.
  Each has one H1, one main, no horizontal overflow, and no nested anchors.
- All seven technical-reference sections work at phone width, with one pressed
  section button at a time and no document overflow. Checking an item advances
  progress from 0 to 1; the code-copy button reports success after copying.
- Production frontend/server build, changed-file ESLint, and SEO gates pass
  (220/220 public sitemap routes).
- Full TypeScript check still has 20 errors, all in the previously identified
  RoutePulse files. No new documentation/layout errors were reported.
- Local screenshots and case data: `.agent-output/reference-review/`.

The previous PR commit's Netlify preview deployed successfully before this
round. GitHub Actions remain separately blocked by account billing. No production
merge, integration activation, email transmission, or change to legal policy
terms was performed. Technical examples were reviewed as documentation; external
services and their live availability were not exercised. Local standalone Vite
does not serve backend APIs, so transient local auth/API toasts are not evidence
of production behavior.

## RoutePulse follow-up

The 20 TypeScript errors recorded above were resolved in the next pass. The
full typecheck now passes. See [the RoutePulse repair report](routepulse-repair-2026-10-23.md)
for validation, basemap recovery, and the separate full-suite test failures.
