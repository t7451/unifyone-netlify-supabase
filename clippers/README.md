# UnifyOne Clippers

The UnifyOne Clippers subsystem turns long-form videos into short, ranked,
captioned highlight clips.  The code is split into two layers so the AI
pipeline can evolve independently of the orchestration shell that drives it.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 1 — Orchestration (clippers.jobs + optional TS tRPC)               │
│ • Input validation, quotas, tenant scoping                               │
│ • Source acquisition (URL download / local passthrough)                  │
│ • Storage proxy & signed download URLs                                   │
│ • Job lifecycle (pending → processing → completed / failed)              │
│ • Structured logging, per-stage timing, retry logic                      │
└──────────────────────────────────────────────────────────────────────────┘
                              │  IClipperEngine
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 2 — Engine (clippers.engine)                                       │
│ • StubClipperEngine   — fast fake clips for tests                        │
│ • BasicClipperEngine  — real pipeline: transcribe → score → extract      │
└──────────────────────────────────────────────────────────────────────────┘
```

## TypeScript + Python Integration

The TypeScript tRPC layer acts as the **API, auth, and billing surface** while
the Python layer acts as the **execution backend**.  Communication flows like
this:

```
Browser / Mobile
      │  tRPC (type-safe)
      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ TypeScript — Layer 0 (server/routers/clippers.ts)                        │
│ • Auth + tenant scoping (JWT, Drizzle)                                   │
│ • Job record created in PostgreSQL (clipping_jobs table)                 │
│ • Calls clipperWorker.ts to drive the Python layer                       │
│ • Returns job status / signed clip URLs to the client                    │
└──────────────────────────────────────────────────────────────────────────┘
      │  subprocess (python3 clippers/run_job.py) → JSON stdout
      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Python — Layer 1 (clippers.jobs) + Layer 2 (clippers.engine)             │
│ • Downloads source, validates, calls engine, uploads to storage          │
│ • Returns structured JSON: { clips: [...], status, metrics }             │
└──────────────────────────────────────────────────────────────────────────┘
      │  storage keys + signed URLs
      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Storage (S3 / Supabase Storage)                                           │
│ Clips are stored under clips/{tenantId}/{jobId}/clip_NN.mp4              │
└──────────────────────────────────────────────────────────────────────────┘
```

### How TypeScript and Python layers communicate

| Concern | Owner |
|---|---|
| Auth, billing, multi-tenancy | TypeScript (JWT + Drizzle) |
| Job record persistence | TypeScript (`clipping_jobs` Drizzle table) |
| Engine execution | Python (`clippers.jobs.processor.process_job`) |
| Storage upload | Both layers can upload; TS uploads from engine output paths via `storagePut()` |
| Signed download URLs | TS generates them via the storage helper; Python provides local signed URLs for standalone use |
| Error surfacing | Python exits non-zero; TS catches stderr and writes `errorMessage` to DB |

**Key files:**

| File | Purpose |
|---|---|
| `server/routers/clippers.ts` | tRPC router: createJob, getJob, listJobs, listClips, testJob |
| `server/lib/clipperWorker.ts` | Spawns `python3 clippers/run_job.py`, parses JSON, uploads clips, updates DB |
| `clippers/run_job.py` | CLI entry-point that wraps `process_job` and prints JSON to stdout |
| `clippers/jobs/processor.py` | Core end-to-end orchestrator |
| `clippers/jobs/models.py` | `ClippingJob` + `ClipResult` dataclasses — mirror of the Drizzle schema |

### Contract: Python stdout JSON shape

`clippers/run_job.py` writes a single JSON object to stdout on exit:

```jsonc
{
  "status": "completed",          // "completed" | "failed"
  "clips": [
    {
      "index": 1,
      "start": 10.5,              // seconds
      "end": 55.0,
      "score": 0.87,
      "title_suggestion": "...",
      "caption": "...",
      "output_path": "/tmp/...",  // local path consumed by TS uploader
      "storage_key": null,        // set when Python uploads directly
      "download_url": null        // set when Python uploads directly
    }
  ],
  "error_message": null,          // user-safe string on failure
  "metrics": { ... }
}
```

The TypeScript worker reads `clips[].output_path`, uploads each file via
`storagePut()`, and then writes the final clip records to the DB.

### Admin Dashboard

A local FastAPI dashboard for inspecting and triggering test jobs is available
at `clippers/admin/dashboard.py`.  It uses the in-memory job registry and is
**not** a production deployment target.

```bash
python -m clippers.admin.dashboard          # http://localhost:8001
python -m clippers.admin.dashboard --port 9000 --reload
```

## Quick start

### Run a job from the CLI

```bash
# Local video file
python -m clippers.engine.run_job \
    --video /path/to/video.mp4 \
    --num-clips 8 \
    --target-duration 45

# YouTube / direct URL (requires yt-dlp for sites like YouTube;
# falls back to urllib for direct .mp4 URLs)
python -m clippers.engine.run_job \
    --url https://example.com/video.mp4 \
    --engine stub \
    --num-clips 3
```

The command prints the full job record as JSON (including signed download
URLs) and exits with status `0` on completion, `1` on failure.

### Run the minimal HTTP test endpoint

For debugging and for callers (e.g. the TypeScript tRPC layer) that want to
drive the pipeline over HTTP:

```bash
CLIPPERS_STORAGE_BASE_URL="http://127.0.0.1:8787" \
    python -m clippers.jobs.server --port 8787
```

Then:

```bash
curl -X POST http://127.0.0.1:8787/api/clippers/test-job \
    -H 'Content-Type: application/json' \
    -d '{
          "input_file_path": "/path/to/video.mp4",
          "num_clips": 3,
          "target_duration": 30,
          "engine": "stub",
          "tenant_id": 42
        }'
```

`GET /api/clippers/health` returns `{"status":"ok"}`.
`GET /storage/{key}?expires=…&sig=…` serves stored clips when the signature
is valid and not expired.

## Creating a job programmatically

```python
from clippers.jobs import ClippingJob, process_job

job = ClippingJob(
    tenant_id=42,
    input_url="https://example.com/video.mp4",
    num_clips=5,
    target_duration=30,
    engine="basic",  # or "stub"
)
process_job(job)

assert job.status.value == "completed"
for clip in job.clips:
    print(clip.download_url, clip.score)
```

## Engine selection

Precedence when choosing an engine:

1. `engine_override` argument to `process_job` (admin / debug)
2. `ClippingJob.engine` (per-job override)
3. `CLIPPERS_ENGINE` environment variable
4. Default: `basic`

Available engines:

| Name     | Description                                                     |
| -------- | --------------------------------------------------------------- |
| `stub`   | Fast fake clips, no ML deps required — best for CI and smoke.   |
| `basic`  | Real pipeline: faster-whisper + librosa + scenedetect + ffmpeg. |

### Graceful fallback

If `basic` fails to import its optional dependencies (e.g. `faster_whisper`
is not installed) the processor logs a warning and automatically falls back
to `stub`.  The same fallback kicks in if `basic` raises at runtime.  The
resulting job reports the fallback under `metrics.engine_fallback` /
`metrics.engine_runtime_fallback`.

## Configuration reference

| Env var                            | Default                          | Purpose                                      |
| ---------------------------------- | -------------------------------- | -------------------------------------------- |
| `CLIPPERS_ENGINE`                  | `basic`                          | Default engine name                          |
| `CLIPPERS_MAX_DURATION_SECONDS`    | `10800` (3 h)                    | Reject sources longer than this              |
| `CLIPPERS_MIN_DURATION_SECONDS`    | `30`                             | Reject sources shorter than this             |
| `CLIPPERS_MAX_FILE_SIZE_BYTES`     | `5368709120` (5 GiB)             | Reject sources larger than this              |
| `CLIPPERS_STORAGE_ROOT`            | `~/.unifyone/clippers/storage`   | Where clips land on disk                     |
| `CLIPPERS_STORAGE_BASE_URL`        | `http://localhost:8787`          | Public base URL for signed download links    |
| `CLIPPERS_STORAGE_SIGNING_SECRET`  | ephemeral per-process secret     | HMAC secret for signed URLs                  |
| `CLIPPERS_SIGNED_URL_TTL_SECONDS`  | `3600`                           | Signed URL lifetime                          |
| `CLIPPERS_TEMP_DIR`                | `$TMPDIR/unifyone-clippers`      | Temp workspace for engine outputs            |
| Engine-specific (see `config.py`)  | —                                | Whisper model, clip lengths, etc.            |

## Testing

```bash
# Compile-only sanity check
python -m compileall clippers

# Run engines directly
python -m clippers.engine.test_engine --engines stub --num-clips 3

# Run engines AND the full Phase 3 job flow
python -m clippers.engine.test_engine --engines stub --job-flow --num-clips 3

# Use a real test video
python -m clippers.engine.test_engine --video /path/to/video.mp4 \
    --engines stub basic --job-flow
```

## Troubleshooting

| Symptom                                                       | Fix                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Unsupported video format`                                    | Re-encode to mp4/mov/mkv/webm.                                                                       |
| Duration validation skipped (warning logged)                  | Install `ffmpeg` (provides `ffprobe`).                                                               |
| `Basic engine unavailable; falling back to stub`              | `pip install -r requirements.txt` to install `faster-whisper`, `librosa`, `scenedetect`.             |
| Downloads fail for YouTube / streaming sites                  | `pip install yt-dlp` (orchestrator auto-detects it and uses it when available).                      |
| Signed URL returns `403`                                      | URL expired (`expires=` is in the past) or `CLIPPERS_STORAGE_SIGNING_SECRET` changed between runs.   |
| Signed URL returns `404`                                      | File missing from `CLIPPERS_STORAGE_ROOT` — check that the job actually completed and wrote clips.   |
| Clips report `size_bytes: 0`                                  | `ffmpeg` missing — the engine wrote placeholder files. Install ffmpeg for real output.               |
| Concurrent jobs overwrite each other                          | They won't: storage keys embed `{tenant_id}/{job_id}` so keys are unique per job.                    |

## Safety & limits

* **Video length** — >3 h sources are rejected with a user-safe error before
  any engine work happens (tunable via `CLIPPERS_MAX_DURATION_SECONDS`).
* **Transient network failures** — URL downloads retry up to 3× with
  exponential backoff.
* **Disk cleanup** — temporary download workspaces are removed after every
  job in `process_job`'s `finally` block (success or failure).
* **Thread-safety** — `ClippingJob.set_status` / `set_progress` hold an
  internal lock so a worker and an HTTP reader can share the same record.

## Layer boundary

Orchestration code (`clippers.jobs`) must not import engine internals
(`clippers.engine.basic_adapter.TranscriptionService`, etc.).  It uses only
the `IClipperEngine` protocol + `get_clipper_engine` factory.  This keeps
the engine swappable and the orchestration easy to unit-test.
