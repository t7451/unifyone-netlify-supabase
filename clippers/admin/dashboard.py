#!/usr/bin/env python3
"""
Simple Admin Dashboard for Clippers Python Orchestration Layer.

Run with:
    python -m clippers.admin.dashboard

Then open http://localhost:8001 in your browser.
"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

import uvicorn

from clippers.engine.adapter import get_clipper_engine
from clippers.jobs.models import ClippingJob, JobStatus
from clippers.jobs.processor import process_job
from clippers.jobs.registry import get_default_registry

logger = logging.getLogger(__name__)

app = FastAPI(title="Clippers Admin Dashboard")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def _timestamp_fmt(ts: float | int | None) -> str:
    """Format a Unix timestamp to a short human-readable string."""
    if ts is None:
        return "—"
    try:
        return datetime.utcfromtimestamp(float(ts)).strftime("%Y-%m-%d %H:%M")
    except (ValueError, OSError, OverflowError):
        return "—"


templates.env.filters["timestamp_fmt"] = _timestamp_fmt


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    """Render the main dashboard page."""
    registry = get_default_registry()
    all_jobs = registry.list()
    recent_jobs = [j.to_dict() for j in all_jobs[-20:]]  # last 20

    stats = {
        "total": len(all_jobs),
        "completed": sum(1 for j in all_jobs if j.status == JobStatus.COMPLETED),
        "processing": sum(1 for j in all_jobs if j.status == JobStatus.PROCESSING),
        "failed": sum(1 for j in all_jobs if j.status == JobStatus.FAILED),
        "pending": sum(1 for j in all_jobs if j.status == JobStatus.PENDING),
    }

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "jobs": recent_jobs,
            "stats": stats,
        },
    )


@app.post("/jobs/create")
async def create_test_job(
    video_url: str | None = None,
    num_clips: int = 3,
    target_duration: int = 45,
    style: str = "default",
    engine: str = "stub",
) -> Dict[str, Any]:
    """Create and immediately process a test job (synchronous, for smoke testing)."""
    registry = get_default_registry()

    job = ClippingJob(
        input_url=video_url,
        num_clips=num_clips,
        target_duration=target_duration,
        style=style,
        engine=engine,
    )
    registry.register(job)

    try:
        process_job(job, engine_override=engine if engine else None)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Test job %s raised unexpectedly: %s", job.id, exc)

    return {"job_id": job.id, "status": job.status.value}


@app.get("/jobs")
async def list_jobs() -> Dict[str, Any]:
    """Return all jobs in the in-memory registry as JSON."""
    registry = get_default_registry()
    return {"jobs": [j.to_dict() for j in registry.list()]}


@app.get("/jobs/{job_id}")
async def get_job_detail(job_id: str) -> Dict[str, Any]:
    """Return a single job's detail by ID."""
    registry = get_default_registry()
    job = registry.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


@app.get("/health")
async def health() -> Dict[str, str]:
    """Simple liveness check."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    parser = argparse.ArgumentParser(
        description="Run the Clippers admin dashboard."
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--reload", action="store_true", help="Enable hot reload")
    args = parser.parse_args()

    uvicorn.run(
        "clippers.admin.dashboard:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
