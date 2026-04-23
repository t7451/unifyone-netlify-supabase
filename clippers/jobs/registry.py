"""Simple in-memory registry for clipping jobs.

Used by the CLI and the minimal HTTP test endpoint to track jobs that were
created in-process.  In production the TypeScript Layer 1 owns job state in
PostgreSQL; this registry exists only for standalone Python workflows.
"""

from __future__ import annotations

import threading
from typing import Dict, List, Optional

from .models import ClippingJob


class JobRegistry:
    """Thread-safe in-memory job registry."""

    def __init__(self) -> None:
        self._jobs: Dict[str, ClippingJob] = {}
        self._lock = threading.Lock()

    def register(self, job: ClippingJob) -> ClippingJob:
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[ClippingJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def list(self) -> List[ClippingJob]:
        with self._lock:
            return list(self._jobs.values())

    def delete(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)


_DEFAULT_REGISTRY: Optional[JobRegistry] = None


def get_default_registry() -> JobRegistry:
    """Return a process-wide default :class:`JobRegistry`."""
    global _DEFAULT_REGISTRY
    if _DEFAULT_REGISTRY is None:
        _DEFAULT_REGISTRY = JobRegistry()
    return _DEFAULT_REGISTRY
