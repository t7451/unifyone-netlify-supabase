"""Clippers Phase 3 orchestration layer.

Wires the Layer 2 clipper engines (see :mod:`clippers.engine`) into an
end-to-end job lifecycle: input validation, source acquisition, engine
execution, storage upload, and signed download URL generation.

The orchestration layer is intentionally framework-agnostic — it has no
dependency on Express/tRPC and can be driven from:

* The CLI (``python -m clippers.engine.run_job``)
* The enhanced test harness (``python -m clippers.engine.test_engine``)
* The minimal HTTP test endpoint (``python -m clippers.jobs.server``)
* A TypeScript Layer 1 that spawns this package as a subprocess
"""

from .models import (
    ClipResult,
    ClippingJob,
    JobStatus,
    JobValidationError,
)
from .processor import process_job, resolve_engine_name
from .registry import JobRegistry, get_default_registry
from .storage import StorageProxy, get_default_storage

__all__ = [
    "ClipResult",
    "ClippingJob",
    "JobRegistry",
    "JobStatus",
    "JobValidationError",
    "StorageProxy",
    "get_default_registry",
    "get_default_storage",
    "process_job",
    "resolve_engine_name",
]
