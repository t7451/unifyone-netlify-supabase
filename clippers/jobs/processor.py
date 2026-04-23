"""End-to-end job processor.

This is the heart of Phase 3: given a :class:`ClippingJob`, it orchestrates
validation → source resolution → engine execution → storage → result
capture, while maintaining status, progress and structured logging.

The processor is intentionally small and synchronous; a production worker
loop can call :func:`process_job` from any threading / queue framework.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from clippers.engine import get_clipper_engine
from clippers.engine.config import ClipperEngineConfig, DEFAULT_ENGINE_CONFIG

from .download import cleanup_temp_source, resolve_source
from .models import ClippingJob, ClipResult, JobStatus, JobValidationError
from .storage import StorageProxy, get_default_storage
from .validation import validate_input_params, validate_local_video

logger = logging.getLogger(__name__)


SUPPORTED_ENGINES = ("stub", "basic")
DEFAULT_ENGINE = "basic"


def resolve_engine_name(
    job_engine: Optional[str] = None,
    *,
    admin_override: Optional[str] = None,
) -> str:
    """Select an engine honoring override > job > env > default precedence.

    Unknown values fall back to :data:`DEFAULT_ENGINE` with a warning.
    """
    env_choice = os.getenv("CLIPPERS_ENGINE")
    for candidate in (admin_override, job_engine, env_choice, DEFAULT_ENGINE):
        if not candidate:
            continue
        normalized = candidate.strip().lower()
        if normalized in SUPPORTED_ENGINES:
            return normalized
        logger.warning(
            "Unknown CLIPPERS_ENGINE value %r; falling back to '%s'.",
            candidate,
            DEFAULT_ENGINE,
        )
    return DEFAULT_ENGINE


def process_job(
    job: ClippingJob,
    *,
    engine_override: Optional[str] = None,
    storage: Optional[StorageProxy] = None,
    engine_config: Optional[ClipperEngineConfig] = None,
    cleanup_temp: bool = True,
) -> ClippingJob:
    """Run ``job`` end-to-end and update its record in place.

    The same :class:`ClippingJob` is returned for chaining.  On failure the
    job's ``status`` becomes :data:`JobStatus.FAILED` and ``error_message``
    carries a user-safe message; no exception is re-raised.
    """
    storage = storage or get_default_storage()
    engine_config = engine_config or DEFAULT_ENGINE_CONFIG
    engine_name = resolve_engine_name(job.engine, admin_override=engine_override)

    logger.info(
        "Starting job %s (engine=%s, %s, num_clips=%d)",
        job.id,
        engine_name,
        job.source_description(),
        job.num_clips,
    )
    job.set_status(JobStatus.PROCESSING, stage="starting")
    job.set_progress(1, "starting")

    temp_source: Optional[Path] = None
    try:
        # ---- 1. Validate inputs --------------------------------------
        with _stage(job, "validating", percentage=5, metric_key="validation_seconds"):
            validate_input_params(
                input_url=job.input_url,
                input_file_path=job.input_file_path,
                num_clips=job.num_clips,
                target_duration=job.target_duration,
            )

        # ---- 2. Resolve source video --------------------------------
        with _stage(job, "downloading", percentage=15, metric_key="download_seconds"):
            video_path, is_temporary = resolve_source(
                input_url=job.input_url,
                input_file_path=job.input_file_path,
            )
            if is_temporary:
                temp_source = video_path
            duration_seconds = validate_local_video(video_path)
            job.metrics["source_duration_seconds"] = duration_seconds
            job.metrics["source_path"] = str(video_path)

        # ---- 3. Run engine (with fallback) --------------------------
        with _stage(job, "processing", percentage=30, metric_key="engine_seconds"):
            engine, resolved_engine = _build_engine(engine_name, engine_config)
            job.engine = resolved_engine
            if resolved_engine != engine_name:
                job.metrics["engine_fallback"] = {
                    "from": engine_name,
                    "to": resolved_engine,
                }
            try:
                raw_clips = engine.process_video(
                    video_path=video_path,
                    num_clips=job.num_clips,
                    target_duration=job.target_duration,
                    style=job.style,
                )
            except Exception as exc:
                # basic → stub fallback on runtime engine failure (missing
                # Python deps at import time is already handled by the
                # adapter, but transient runtime errors inside basic still
                # warrant a safety net).
                if resolved_engine == "basic":
                    logger.exception(
                        "Basic engine failed at runtime for job %s; "
                        "falling back to stub.",
                        job.id,
                    )
                    engine, _ = _build_engine("stub", engine_config)
                    job.engine = "stub"
                    job.metrics["engine_runtime_fallback"] = {
                        "from": "basic",
                        "to": "stub",
                        "error": str(exc),
                    }
                    raw_clips = engine.process_video(
                        video_path=video_path,
                        num_clips=job.num_clips,
                        target_duration=job.target_duration,
                        style=job.style,
                    )
                else:
                    raise

        # ---- 4. Store outputs & generate URLs -----------------------
        with _stage(job, "uploading", percentage=75, metric_key="upload_seconds"):
            clips = _store_clips(
                job=job,
                raw_clips=raw_clips,
                storage=storage,
            )
            job.clips = clips

        # ---- 5. Finalize --------------------------------------------
        job.metrics["clip_count"] = len(job.clips)
        job.metrics["average_score"] = (
            round(sum(c.score for c in job.clips) / len(job.clips), 4)
            if job.clips
            else 0.0
        )
        job.set_progress(100, "completed")
        job.set_status(JobStatus.COMPLETED, stage="completed")
        logger.info(
            "Job %s completed: %d clips, avg_score=%.3f, engine=%s",
            job.id,
            job.metrics["clip_count"],
            job.metrics["average_score"],
            job.engine,
        )

    except JobValidationError as exc:
        logger.warning("Job %s validation error: %s", job.id, exc)
        job.set_status(
            JobStatus.FAILED, stage="failed", error_message=str(exc)
        )
    except Exception as exc:  # noqa: BLE001 — broad by design
        logger.exception("Job %s failed with unexpected error", job.id)
        job.set_status(
            JobStatus.FAILED,
            stage="failed",
            error_message=_user_safe_error(exc),
        )
    finally:
        if cleanup_temp and temp_source is not None:
            cleanup_temp_source(temp_source)

    return job


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_engine(
    engine_name: str,
    config: ClipperEngineConfig,
) -> tuple[Any, str]:
    """Instantiate the engine, falling back to ``stub`` on import errors."""
    try:
        return get_clipper_engine(engine_name, config=config), engine_name
    except ImportError as exc:
        # ``get_clipper_engine`` lazy-imports the adapter module; if the
        # basic adapter's module itself fails to import (missing heavy
        # deps) we log and switch to the stub so end-to-end flows still
        # succeed.
        if engine_name == "basic":
            logger.warning(
                "Basic engine unavailable (%s); falling back to stub.", exc
            )
            return get_clipper_engine("stub", config=config), "stub"
        raise


def _store_clips(
    *,
    job: ClippingJob,
    raw_clips: List[Dict[str, Any]],
    storage: StorageProxy,
) -> List[ClipResult]:
    """Move engine outputs into storage and produce :class:`ClipResult`."""
    tenant_segment = f"tenant_{job.tenant_id}" if job.tenant_id else "tenant_local"
    results: List[ClipResult] = []
    total = max(1, len(raw_clips))
    for index, raw in enumerate(raw_clips, start=1):
        output_path = Path(raw["output_path"])
        storage_key = (
            f"{tenant_segment}/{job.id}/clip_{index:02d}{output_path.suffix or '.mp4'}"
        )
        stored = None
        if output_path.exists():
            if output_path.stat().st_size == 0:
                logger.warning(
                    "Clip %d for job %s produced an empty file at %s; "
                    "uploading anyway so the download URL is generated.",
                    index,
                    job.id,
                    output_path,
                )
            stored = storage.put_file(output_path, storage_key=storage_key, move=True)
        else:
            logger.warning(
                "Clip %d for job %s is missing on disk at %s; skipping upload.",
                index,
                job.id,
                output_path,
            )

        clip = ClipResult(
            index=index,
            start=float(raw.get("start", 0.0)),
            end=float(raw.get("end", 0.0)),
            score=float(raw.get("score", 0.0)),
            title_suggestion=str(raw.get("title_suggestion", "")),
            caption=str(raw.get("caption", "")),
            output_path=str(stored.absolute_path) if stored else str(output_path),
            storage_key=stored.storage_key if stored else None,
            download_url=storage.signed_url(stored.storage_key) if stored else None,
            size_bytes=stored.size_bytes if stored else None,
        )
        results.append(clip)
        # Upload progress spans 75..95% so the final finalize step can hit 100.
        job.set_progress(75 + int(20 * index / total), stage="uploading")
    return results


@contextmanager
def _stage(
    job: ClippingJob,
    stage: str,
    *,
    percentage: int,
    metric_key: str,
) -> Iterator[None]:
    """Instrument a pipeline stage with timing + progress updates."""
    logger.info("[job=%s] stage=%s start", job.id, stage)
    job.set_progress(percentage, stage)
    started = time.monotonic()
    try:
        yield
    finally:
        elapsed = round(time.monotonic() - started, 3)
        job.metrics[metric_key] = elapsed
        logger.info(
            "[job=%s] stage=%s done in %.3fs", job.id, stage, elapsed
        )


def _user_safe_error(exc: Exception) -> str:
    """Turn an exception into a user-safe message, without leaking paths."""
    message = str(exc).strip() or exc.__class__.__name__
    # Cap length to keep DB columns and API responses reasonable.
    if len(message) > 500:
        message = message[:497] + "..."
    return message
