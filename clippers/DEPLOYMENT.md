# Clippers — Deployment Guide

## Local Development

### Option 1: Run Everything Locally

```bash
# Terminal 1 — Python Admin Dashboard
cd clippers
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m clippers.admin.dashboard          # http://localhost:8001

# Terminal 2 — Python HTTP Test Endpoint
python -m clippers.jobs.server --port 8787  # http://localhost:8787

# Terminal 3 — TypeScript App
pnpm dev                                    # http://localhost:5000
```

### Option 2: Python Subprocess Mode (Default)

No separate Python server needed. The TypeScript app spawns
`python3 clippers/run_job.py` as a subprocess and reads JSON from stdout.
This is the default integration path used by `server/lib/clipperWorker.ts`.

```bash
# Just run the TypeScript app — Python is called on demand
pnpm dev
```

---

## Production Deployment

### Recommended Stack (April 2026)

| Component | Platform | Reason |
|---|---|---|
| TypeScript App | Vercel / Netlify | Excellent DX + edge functions |
| Python Orchestration | Railway or Render | Best Python support, affordable |
| Database | Supabase / Neon | Already used in UnifyOne |
| Storage | Supabase Storage / S3 | Simple, generous free tier |

### Option A: Separate Services (Recommended)

Deploy the Python orchestration layer as an independent service.
The TypeScript app calls it over HTTP.

**Python Service (Railway / Render / Fly.io):**

```
Build command:  pip install -r requirements.txt
Start command:  python -m clippers.admin.dashboard --host 0.0.0.0 --port 8000
Port:           8000
Health check:   GET /health
```

**TypeScript App (Vercel / Netlify):**

Deploy as usual. Configure `CLIPPERS_PYTHON_SERVICE_URL` to point at the
Python service so the TS layer can call it over HTTP instead of subprocess.

### Option B: Single Container (Future)

Use a multi-stage Docker setup where both runtimes run in the same container.
More complex, but eliminates network latency between TS and Python.

```dockerfile
# Example multi-stage approach
FROM node:22-alpine AS ts-build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=ts-build /app/dist ./dist
COPY clippers ./clippers
# Run both via supervisord or a simple shell script
```

Not necessary right now — Option A is simpler and scales fine.

---

## Production Environment Variables

### Python Orchestration

```env
# Engine
CLIPPERS_ENGINE=basic
CLIPPERS_LOG_LEVEL=INFO

# Storage
CLIPPERS_STORAGE_BACKEND=supabase          # or "s3"
CLIPPERS_STORAGE_ROOT=/data/clippers       # persistent volume
CLIPPERS_STORAGE_BASE_URL=https://your-python-service.railway.app
CLIPPERS_STORAGE_SIGNING_SECRET=<random-secret>

# Limits
CLIPPERS_MAX_DURATION_SECONDS=10800
CLIPPERS_MAX_FILE_SIZE_BYTES=5368709120
CLIPPERS_SIGNED_URL_TTL_SECONDS=3600

# Supabase (if using Supabase Storage)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### TypeScript App

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<secret>
CLIPPERS_PYTHON_SERVICE_URL=https://your-python-service.railway.app
```

---

## Health Checks

Both layers expose health endpoints for uptime monitoring:

| Layer | Endpoint | Response |
|---|---|---|
| Python (admin dashboard) | `GET /health` | `{"status": "healthy", "service": "clippers-python-orchestration", ...}` |
| Python (test server) | `GET /api/clippers/health` | `{"status": "ok"}` |
| TypeScript | `GET /api/health` | Via tRPC or Express middleware |

---

## Monitoring (Future)

- **Error tracking** — Add Sentry or Logtail for both TS and Python layers
- **Metrics** — Monitor job processing time and failure rate
- **Alerts** — Set up alerts when failed jobs exceed 5%
- **Logging** — Structured JSON logs from both layers for easy aggregation

---

## Scaling Notes

The current architecture handles moderate volume well (tens of jobs per day).
For high volume (> 500 jobs/day), consider:

1. **Job Queue** — Move to Celery + Redis (or BullMQ on the TS side)
2. **Multiple Workers** — Run multiple Python worker processes
3. **Message Queue** — Add RabbitMQ or SQS between TS and Python
4. **GPU Workers** — Separate GPU-enabled workers for the `basic` engine
5. **CDN** — Put clip storage behind CloudFront or Cloudflare R2

---

## Rollback Strategy

- Python service: Railway / Render support instant rollback to previous deploy
- TypeScript app: Vercel / Netlify support deploy previews and instant rollback
- Database: Drizzle migrations are versioned — roll back with `drizzle-kit drop`
