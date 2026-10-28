# Internal function repair batch

This batch repairs concrete failures found in the signed-in workspace. It preserves the shared ink/orange design. It does not certify every integration as production-ready: bank and gig linking still depend on approved provider accounts and configured credentials.

## Repairs

- Sessions and workspace routing: sign-out calls the endpoint that clears both authentication cookies in Netlify and Express. Failed sign-out remains recoverable. Session/workspace lookup errors offer retry instead of treating an unavailable account as logged out or an unavailable workspace as missing.
- Kai: selecting a context keeps that context, late history responses cannot replace a newer selection, and failed conversation deletion preserves the open chat. Pending replies prevent conflicting conversation changes. Browser storage failures do not break model selection.
- Work sessions: concurrent starts resume the authoritative active session. Completion and its mileage record commit atomically; matching completion retries return the recorded result, while changed payloads conflict. Optional rewards and live-update failures do not turn a completed save into an error.
- Money entry: numeric precision and database limits are checked before submission; mileage and session changes refresh related work and export views. Uncertain session completion preserves the exact submitted draft for retry.
- Financial connections: OAuth recovery validates account binding and age, disconnect retries handle already-removed Plaid items, empty Argyle placeholders can be removed without an upstream connection, and impossible provider dates are rejected.
- Records and reporting: expense pagination recovers after cross-tab deletions, local expense dates roll forward in an open insights tab, and exports preserve unknown durations/mileage instead of converting them to zero. Hourly rates use the full recorded duration before rounding. Invalid stored financial values fail visibly.
- Settings and billing: failed reads are distinct from empty/default values. Unverified defaults cannot overwrite saved settings. Failed invoice retrieval is an error, not an empty invoice history. Onboarding’s import choice opens the import view.
- Commerce and teams: product inventory edits and optional-field clearing persist; customer edits preserve unexposed address fields; integration URL drafts can be cleared. Product, order, and customer pagination waits for the requested page before correcting out-of-range pages. Invitation acceptance has a real page and requires an explicit action, the invited verified email, and atomic token consumption. Administrative invite actions are restricted to administrators.

## Verification boundaries

Browser regressions use synthetic accounts and mocked API/provider responses. Timer SQL verification uses an isolated local PostgreSQL-compatible database through the actual Neon HTTP driver with its fetch transport replaced; it never uses the configured production database. No production data migrations are part of this batch.

Standalone mileage logs do not yet have a persisted client retry key. Optional post-save failures no longer fail the save, and an uncertain response requires checking saved mileage before resubmitting. Full automatic deduplication after response loss needs a future schema/API change; matching amounts and dates alone are not a safe duplicate test.

The unit and browser suites exercise retries, failed writes, stale responses, ownership, validation, and existing work/import/export workflows. Live Plaid/Argyle linking and real billing charges require separate provider-backed validation once those accounts are ready.
