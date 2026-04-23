"""Data models shared across the clippers orchestration layer."""

from __future__ import annotations

import enum
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


class JobValidationError(ValueError):
    """Raised when job inputs fail validation.

    The message is considered user-safe and will be surfaced on the job
    record and in API responses.
    """


class JobStatus(str, enum.Enum):
    """Lifecycle states for a clipping job.

    Intentionally named to line up with the ``clipping_job_status`` enum
    defined in ``drizzle/0031_clippers_core.sql`` so orchestration records
    remain portable across the Python and TypeScript layers.
    """

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Terminal states after which no further transitions are permitted.
TERMINAL_STATUSES = frozenset(
    {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED}
)


@dataclass
class ClipResult:
    """Final clip metadata returned to callers.

    Combines the raw engine output with orchestration-provided fields
    (``storage_key``, ``download_url``) so a single object is sufficient
    for rendering in a UI or storing in the DB.
    """

    index: int
    start: float
    end: float
    score: float
    title_suggestion: str
    caption: str
    output_path: str
    storage_key: Optional[str] = None
    download_url: Optional[str] = None
    size_bytes: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ClippingJob:
    """In-memory representation of a clipping job.

    The shape mirrors ``clipping_jobs`` in the Drizzle schema so the Python
    orchestrator can be mapped to DB rows 1:1 by an outer adapter.  Values
    are intentionally loose (``Optional`` everywhere) so the model is usable
    both before and after processing.
    """

    id: str = field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    tenant_id: Optional[int] = None
    user_id: Optional[int] = None
    input_url: Optional[str] = None
    input_file_path: Optional[str] = None
    num_clips: int = 12
    target_duration: int = 45
    style: str = "default"
    engine: Optional[str] = None
    status: JobStatus = JobStatus.PENDING
    progress_percentage: int = 0
    current_stage: str = "queued"
    error_message: Optional[str] = None
    clips: List[ClipResult] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

    # Guard concurrent updates when a job is read/written from multiple
    # threads (e.g. the HTTP server and a worker pool).
    _lock: threading.Lock = field(
        default_factory=threading.Lock, repr=False, compare=False
    )

    def source_description(self) -> str:
        """Return a human-readable source descriptor for logging."""
        if self.input_url:
            return f"url={self.input_url}"
        if self.input_file_path:
            return f"file={self.input_file_path}"
        return "source=<unknown>"

    def set_status(
        self,
        status: JobStatus,
        *,
        stage: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Transition the job to ``status`` respecting terminal guards."""
        with self._lock:
            if self.status in TERMINAL_STATUSES and status != self.status:
                # Already terminal: ignore to avoid clobbering final state.
                return
            self.status = status
            if stage is not None:
                self.current_stage = stage
            if error_message is not None:
                self.error_message = error_message
            if status == JobStatus.PROCESSING and self.started_at is None:
                self.started_at = time.time()
            if status in TERMINAL_STATUSES and self.completed_at is None:
                self.completed_at = time.time()

    def set_progress(self, percentage: int, stage: Optional[str] = None) -> None:
        """Update ``progress_percentage`` (clamped to 0..100) and stage."""
        with self._lock:
            self.progress_percentage = max(0, min(100, int(percentage)))
            if stage is not None:
                self.current_stage = stage

    def to_dict(self) -> Dict[str, Any]:
        """JSON-serializable snapshot suitable for API responses."""
        with self._lock:
            return {
                "id": self.id,
                "tenant_id": self.tenant_id,
                "user_id": self.user_id,
                "input_url": self.input_url,
                "input_file_path": self.input_file_path,
                "num_clips": self.num_clips,
                "target_duration": self.target_duration,
                "style": self.style,
                "engine": self.engine,
                "status": self.status.value,
                "progress_percentage": self.progress_percentage,
                "current_stage": self.current_stage,
                "error_message": self.error_message,
                "clips": [clip.to_dict() for clip in self.clips],
                "metrics": dict(self.metrics),
                "created_at": self.created_at,
                "started_at": self.started_at,
                "completed_at": self.completed_at,
            }


# Source-of-truth for path validation so validator and download logic stay
# in agreement.
SUPPORTED_VIDEO_EXTENSIONS: frozenset[str] = frozenset(
    {".mp4", ".mov", ".mkv", ".webm"}
)


def supported_extension(path: Path) -> bool:
    """Return True if ``path`` carries a supported video file extension."""
    return path.suffix.lower() in SUPPORTED_VIDEO_EXTENSIONS
