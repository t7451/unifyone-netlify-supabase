# Read-only gig and banking aggregation

The authenticated `/connected-money` screen links banks with Plaid Link and
income accounts with Argyle Link. It imports available data into one activity
feed, with separate bank cash-flow, gig earnings, and payroll-payment totals.
No transfers, payment initiation, direct-deposit switching, or account-number
retrieval endpoints are implemented. Users enter provider login credentials in
the provider-owned Link experience, not in UnifyOne.

## Configure and enable

1. Use a **development database** and apply `drizzle/0058_financial_connections.sql`
   through your normal migration process. The script is repeatable and creates
   two tables and their indexes. The configured release database was migrated
   on October 23, 2026; separate development databases still need setup. Test
   against a clean database first: `IF NOT EXISTS` does not repair a conflicting
   existing table. No schema push or seed is needed.
2. Set these variables securely in environment settings:
   - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`.
   - `ARGYLE_API_KEY`, `ARGYLE_API_SECRET`, `ARGYLE_ENV=sandbox`.
   - `ARGYLE_READ_ONLY_FLOW_ID`: create a flow in Argyle Console with
     **direct-deposit switching disabled** and only the required data sets
     enabled. These API credentials must be approved for ongoing consumer
     gig/income aggregation. A verification-only contract or unsupported
     platform is not sufficient. Confirm coverage for your target platforms.
   - `FINANCIAL_TOKEN_ENC_KEY`: generate a dedicated 32-byte key, encoded as
     64 hex characters (`openssl rand -hex 32`). Store it securely and keep it
     stable. There is no fallback to JWT or social-account keys. Replacing it
     without re-encryption makes existing bank tokens unreadable.
3. Keep these as actual secure server environment values. Do not put them in
   `VITE_*`, client bundles, source files, URLs, or browser storage. Argyle Basic
   authentication encodes its API key/secret; placeholder-only proxy secrets
   are not a substitute for the direct secret bindings this adapter needs.
4. Allow HTTPS to `sandbox.plaid.com` and `api-sandbox.argyle.com`. Production
   uses `production.plaid.com` and `api.argyle.com`. Browser Link assets use
   `cdn.plaid.com`, `plugin.argyle.com`, and the providers' hosted frame/API
   domains. The Express and Netlify CSPs include the Link SDK and frame hosts.
5. Start the development server using the saved environment instructions. In
   the managed Node.js 24 cloud environment, export `NODE_USE_ENV_PROXY=1`
   before starting Node so native fetch uses the inherited HTTPS proxy and CA.
   Credential-free HTTPS checks reached both provider sandbox hosts; Argyle
   returned the expected unauthenticated HTTP 401.
   Linking stays disabled when provider credentials, the dedicated encryption
   key, or the connection tables are unavailable.
6. For OAuth bank connections, set `PLAID_REDIRECT_URI` to the exact registered
   `/connected-money` URL. Plaid must allow that URI and your production domain.
   The callback resumes Link with the same short-lived token in sessionStorage;
   it is deleted after completion/cancellation. Normal non-OAuth linking does
   not require a redirect URI. Keep session cookies functional on that origin.
7. Accept the read-only consent checkbox, complete a provider sandbox flow,
   then refresh. Exercise duplicate refresh, pending/posting changes,
   reconnect, and revocation before enabling production credentials. Argyle
   can take time to supply history after an account connects.

Changing provider environments does not migrate connections. Sandbox and
production totals are separate. Existing connections require credentials for
the environment in which they were created. Disconnect test connections before
switching to production; do not mix sandbox credentials with production hosts.

## What is imported

- **Plaid**: authorized accounts' names, masks, available current balances,
  currencies, and transaction changes through `/transactions/sync`. Positive
  normalized amounts mean money in; negative amounts mean money out.
- **Argyle**: connected account names/status, completed gigs' `income.total`
  and active task duration, and completed paystubs' `net_pay`. Detailed tax,
  identity, SSN, addresses, routing/account numbers, locations, and raw
  provider payloads are not retained. Availability varies by provider and
  platform. Freelance clients cannot be linked unless supported by a provider;
  this does not create a universal freelance invoice integration.
- The feed supports 30/90-day views with 50 records per page. Provider import
  pagination runs independently and fetches all currently available history
  within its safety/time limits; an incomplete/failed import is not committed.
- Bank, gig, and payroll numbers are separate measures. They must **not** be
  summed into a single earnings figure. This first version does not match a
  bank deposit to its platform payout or merge provider imports into existing
  manual shifts/CSV totals. That prevents automatic double counting.
- There is no currency conversion. Totals are grouped by currency, record kind
  and provider environment; pending bank transactions are excluded. Bank
  outflows are not automatically classified as business expenses. Active gig
  time does not establish total working time and is not shown as true hourly pay.
- History refresh is **on demand** after linking and through Refresh. This
  version does not claim automatic background refresh, signed webhook
  ingestion, payout reconciliation, or complete coverage of all gig platforms.

## Ownership, storage and failure behavior

All endpoints require a signed-in user. Personal ownership comes from the
session, never a client-supplied user/tenant ID. SQL reads, updates, deletion,
and sync leases include the owner. Provider pagination cannot change hosts,
resource paths or the mapped Argyle user. Provider credentials and raw provider
errors are not exposed by the API. Link/user tokens are deliberately short-lived
browser tokens; Plaid access tokens are encrypted at rest with AES-256-GCM and
owner/provider/environment/item authenticated data.

A five-minute database lease serializes sync and revocation. Provider fetches
have a total three-minute deadline and per-request timeouts. Neon HTTP batch
transactions commit activity changes and their cursor atomically. Stable
provider IDs make retries idempotent; Plaid modified/removed records are applied.
A pagination-mutation error restarts from the last committed cursor. Argyle
imports replace the completed snapshot only after every endpoint/page succeeds.
Malformed/missing monetary values or currencies fail the import rather than
silently estimating them. Previous records remain available after refresh fails,
with the connection marked in error and its last successful import time visible.

Disconnect revokes the Plaid Item or deletes the mapped Argyle user (which
revokes all gig accounts under that connection), then deletes the local
connection and its activity via foreign-key cascade. Revocation failure retains
an actionable connection for retry; it does not report success or keep syncing.
If a process is interrupted, wait for the lease to expire before retrying.
The feature's own disconnect path handles provider revocation. Deleting a local
user row directly cascades local data only; account-deletion workflows must
invoke provider revocation before deleting the user. No new account-deletion
workflow is introduced here.

Before broad production rollout, add durable scheduled jobs and verified
provider webhooks, plus deletion-policy integration, provider-contract and
coverage verification. For serverless deployments with request limits shorter
than a full import, move sync to a durable worker; do not increase the lease and
assume an HTTP request will survive. Configure the repository's shared Upstash
rate limiter for multi-instance enforcement. Do not enable real account links
until that runtime's full import and disconnect have been verified.

## Verification

`COREPACK_HOME=/workspace/.cache/corepack corepack pnpm exec vitest run server/routers/financialConnections`

Tests cover read-only Link products, explicit consent, session ownership, token
redaction and encryption, record normalization, pagination restarts, provider
pagination isolation, failed imports, and revocation-before-deletion. The SQL
migration and actual repository queries were also exercised against an isolated
local PostgreSQL-compatible PGlite engine using a Neon transport adapter: repeat
migration, owner isolation, lease contention, idempotency, transactional rollback,
cursor atomicity, pending exclusion, removals and cascading deletion passed.
No live Plaid/Argyle connection has been performed. Migration 0058 was applied
with worker-money migrations 0059–0061 to the configured application database on
October 23, 2026, in one verified transaction before the main-branch release.

## Provider references

Implementation was checked against the providers' official references:

- [Plaid Link tokens](https://plaid.com/docs/api/link/)
- [Plaid Transactions sync and pagination](https://plaid.com/docs/api/products/transactions/)
- [Argyle Web SDK](https://docs.argyle.com/link/initialization/web)
- [Argyle API and resource definitions](https://docs.argyle.com/api-reference/llms.txt)
- [Argyle API OpenAPI specification](https://docs.argyle.com/openAPI/argyle-all.yaml)
