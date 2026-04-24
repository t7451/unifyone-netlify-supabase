# @1commerce/spire-worker

Docker-Compose service that runs on **Contabo** (same box as n8n). Two
containers:

| Container      | Image base                                   | Role                                                                                                                                                                                   |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spire-worker` | `mcr.microsoft.com/playwright:v1.47.0-jammy` | Drains `spire_submissions`. One submission per tick via `FOR UPDATE SKIP LOCKED`. Handles form (Playwright), API (direct HTTP), email (Resend), and manual (generates drafts) methods. |
| `spire-rank`   | `node:22-alpine`                             | Weekly DataForSEO rank check. Sleeps until Monday 06:00 UTC by default; `docker exec spire-rank node dist/rank.js --now` forces an immediate run.                                      |

Both containers read and write the same Neon database used by `apps/unifyone` and `apps/spire-admin`. They never touch Netlify.

---

## First-time deploy on Contabo

```bash
ssh keith@contabo
sudo mkdir -p /opt && cd /opt
# Clone once; future deploys use `git pull`. If the repo is private,
# configure a deploy key or use a fine-grained PAT with read-only access
# scoped to this repo.
git clone https://github.com/ksksrbiz-arch/unifyone-netlify-supabase.git ksksrbiz-arch
cd ksksrbiz-arch/services/spire-worker

cp .env.example .env
# Fill in:
#   NEON_DATABASE_URL
#   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
#   RESEND_API_KEY, RESEND_FROM (submissions@reach.unifyone.com)
#   STORAGE_STATE_ENCRYPTION_KEY (`openssl rand -hex 32` on your workstation;
#     keep a copy in 1Password — losing this means re-capturing every auth state)
#   HASHNODE_TOKEN, HASHNODE_PUBLICATION_ID, DEVTO_API_KEY (optional)
#   Optional: RANK_CRON (default "0 6 * * 1"), WORKER_SLEEP_SECONDS (default 60)

docker compose build
docker compose up -d
docker compose logs -f spire-worker
```

Expect:

- First build: 2-3 min (Playwright image + `pnpm install`)
- First worker tick: prints "Spire worker started" then polls every 60s
- First rank-cron tick: prints "Rank cron started; waiting for next slot" and idles until the configured cron fires

---

## Verify health

```bash
docker compose ps
# STATUS column should be "Up (healthy)" or "Up" for both.

# Worker is draining?
docker compose logs --tail=50 spire-worker | grep -E "Processing submission|Spire worker"

# Rank cron is waiting?
docker compose logs --tail=10 spire-rank | grep -E "Sleeping until next|Rank cron started"
```

Confirm DB-side:

```sql
-- Submissions moving through the states
select status, count(*) from spire_submissions group by status;

-- Recent rank checks
select count(*), max(checked_at) from spire_rank_checks;

-- Worker activity (advisory-lock heartbeats from the CLI tick also land here)
select trigger, count(*) from spire_runs group by trigger;
```

---

## Common operations

### Capture directory auth (run once per auth-required directory)

Playwright auth capture runs **on the workstation**, not on Contabo — you need a display to log in. After capture, the encrypted storage state lands in `spire_directories.method_config.storage_state_encrypted` and the Contabo worker picks it up automatically.

```bash
# On your laptop:
pnpm --filter @1commerce/spire-admin exec spire auth product-hunt
# Browser opens. Log in normally. Close the tab. Encrypted state is saved.
```

Make sure `STORAGE_STATE_ENCRYPTION_KEY` on the laptop matches the one on Contabo — otherwise the worker can't decrypt.

### Force an immediate rank check

```bash
ssh keith@contabo
docker exec -it $(docker compose ps -q spire-rank) node dist/rank.js --now
```

This bypasses the cron, runs once against every active `spire_tracked_keywords` row, inserts rows into `spire_rank_checks`, and exits.

### Retry a failed submission

From your laptop:

```bash
pnpm --filter @1commerce/spire-admin exec spire submit retry <submission-id>
```

The worker picks it up on the next tick.

### Scale workers horizontally

`FOR UPDATE SKIP LOCKED` makes the worker safe to run N replicas. Each container picks different rows.

```bash
docker compose up -d --scale spire-worker=3
```

Don't scale `spire-rank` — it's a singleton that expects one instance to own the cron.

### Update after a code change

```bash
cd /opt/ksksrbiz-arch
git pull
cd services/spire-worker
docker compose build --pull    # rebuild with upstream base-image updates
docker compose up -d
docker compose logs -f spire-worker
```

Playwright base images roll forward ~monthly; `--pull` keeps Chromium current.

---

## Resource limits

Set in `docker-compose.yml`:

- `spire-worker`: 1.0 CPU, 1024MB RAM. Playwright + Chromium is memory-hungry; 1GB is the floor.
- `spire-rank`: 0.5 CPU, 256MB RAM. Pure HTTP.

On a Contabo VPS shared with n8n (typically 4 CPU / 8GB), this leaves ~2 CPU and 6GB for n8n + system + cache. Check with `docker stats` if you see thrashing.

---

## Rotating credentials

When rotating any secret — DataForSEO, Resend, the storage encryption key — update the `.env` on Contabo, then restart:

```bash
docker compose down
docker compose up -d
```

The worker doesn't hot-reload envs.

**⚠ Rotating `STORAGE_STATE_ENCRYPTION_KEY` invalidates every captured auth state.** After rotation, re-run `spire auth <slug>` for every directory with `requires_auth: true`. Plan the rotation around a maintenance window.

---

## Troubleshooting

| Symptom                                                             | First thing to check                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker exits on startup with `NEON_DATABASE_URL is required`        | `.env` not mounted; re-check `docker compose up -d` (needs to be run from `services/spire-worker/`)                                                                                                                                                                       |
| All form submissions fail with "requires auth but no storage state" | Storage state for that directory wasn't captured, or `STORAGE_STATE_ENCRYPTION_KEY` differs between laptop and Contabo                                                                                                                                                    |
| DataForSEO returns 401                                              | Check `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` — the password is the API password on the DataForSEO dashboard, not your login password                                                                                                                                  |
| Email submissions 403                                               | Resend domain unverified; check SPF/DKIM/DMARC on `reach.unifyone.com` in Cloudflare                                                                                                                                                                                      |
| Playwright times out on `wait_for_selector`                         | Directory changed their form markup; open in a real browser and update `method_config.steps` in Neon directly, or in `config/directories/seed.json` and re-run `spire directories seed`                                                                                   |
| Queue backs up                                                      | `docker compose logs spire-worker` — if the worker is idle (printing "Sleeping"), check `select count(*) from spire_submissions where status='queued'`. If > 0 and the worker isn't processing, the advisory lock may be held by a crashed tx — a clean restart clears it |
| Rank cron never fires                                               | Confirm `RANK_CRON` isn't something weird; the parser only supports `*`, literals, and ranges (not `*/N` or lists). Trigger manually with `--now` to test                                                                                                                 |

---

## What lives where

- DB schema: `infra/neon/0004_spire_distribution.sql`
- Directory seed list: `apps/spire-admin/config/directories/seed.json`
- Topic cluster seed: `apps/spire-admin/config/mesh/topic-clusters.json`
- Submitter logic: `services/spire-worker/src/submitters/{form,api,email}.ts`
- Rank cron: `services/spire-worker/src/rank.ts`
- DataForSEO client: `packages/spire/src/rank/dataforseo.ts`
- Mesh crosslink finder: `packages/spire/src/mesh/find-crosslinks.ts`
