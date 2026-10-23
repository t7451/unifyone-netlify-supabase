# Test suite repair — October 23, 2026

Continues draft PR #458 after the RoutePulse repair. The 11 failures previously
recorded in four test files came from incomplete mocks, outdated assumptions,
and Windows path conversion. Application behavior did not need changing.

## Repairs

- **Kai agent:** preserve real model constants while mocking LLM invocation.
  Reset invocation and MCP call mocks between tests so queued responses from
  a failed test cannot contaminate another test. Keep selected-model metering,
  iteration limits, tenant injection, and concurrent tenant-isolation checks.
- **Kai model catalog:** accept the existing explicitly approved direct Groq
  and Gemini fallbacks alongside OpenRouter `:free` models. Free entries still
  must have zero minimum credits and zero credit multiplier; arbitrary premium
  fallbacks remain rejected.
- **Public crawl:** use `fileURLToPath` instead of a URL pathname for filesystem
  access. Normalize relative paths for UI exclusions and diagnostics. Both the
  static-link and sitemap checks now work with Windows drive letters and spaces.
- **Resources:** validate that every guide destination resolves to an actual
  registered app route, replacing the obsolete assumption that the page must
  advertise generated downloads. Existing backend attachment, unknown-resource,
  and unrelated-route tests remain intact.

The first full rerun also exposed two intermittent cold-start timeouts. Stripe
module initialization now happens once in a setup hook, after test credentials
are set, so handler tests measure handler work rather than cold imports. The
Kai credit/refusal tests mock the unrelated shift-data router instead of loading
its implementation. Signature verification and credit-enforcement assertions
are unchanged.

## Validation

- All 39 checks in the six affected test files pass.
- Changed-file ESLint passes with no errors or warnings.
- Repository-wide TypeScript check passes with zero errors.
- Full suite (`pnpm test --maxWorkers=2`): **911 passed, 7 existing skips,
  zero failures**, across 103 passing and 2 skipped test files (105 total).

No tests were skipped or removed to resolve the failures. No application runtime
code, billing policy, authentication, tenant boundaries, or production deployment
was changed in this pass.
