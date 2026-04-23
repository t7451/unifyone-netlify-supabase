"""Input validation helpers for clipping jobs."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import urllib.parse
from pathlib import Path
from typing import Optional

from .models import JobValidationError, supported_extension

logger = logging.getLogger(__name__)


# Defaults (overridable via environment variables so ops can tune without
# deploying code changes).
MAX_DURATION_SECONDS = int(os.getenv("CLIPPERS_MAX_DURATION_SECONDS", str(3 * 60 * 60)))
MIN_DURATION_SECONDS = int(os.getenv("CLIPPERS_MIN_DURATION_SECONDS", "30"))
MAX_FILE_SIZE_BYTES = int(
    os.getenv("CLIPPERS_MAX_FILE_SIZE_BYTES", str(5 * 1024 * 1024 * 1024))  # 5 GiB
)


def validate_input_params(
    *,
    input_url: Optional[str],
    input_file_path: Optional[str],
    num_clips: int,
    target_duration: int,
) -> None:
    """Validate pre-download job parameters.

    Raises :class:`JobValidationError` with a user-safe message when a
    constraint fails.  Disk-level checks (duration, size) are handled by
    :func:`validate_local_video` after the source is resolved.
    """
    if not input_url and not input_file_path:
        raise JobValidationError(
            "Missing video source: provide either 'input_url' or 'input_file_path'."
        )
    if input_url and input_file_path:
        raise JobValidationError(
            "Ambiguous video source: specify only one of 'input_url' or "
            "'input_file_path'."
        )
    if input_url and not _is_safe_http_url(input_url):
        raise JobValidationError(
            "Only http:// and https:// URLs are supported for 'input_url'."
        )
    if not (1 <= int(num_clips) <= 50):
        raise JobValidationError(
            f"num_clips must be between 1 and 50 (got {num_clips})."
        )
    if not (5 <= int(target_duration) <= 300):
        raise JobValidationError(
            "target_duration must be between 5 and 300 seconds "
            f"(got {target_duration})."
        )


def validate_local_video(
    video_path: Path,
    *,
    max_duration_seconds: int = MAX_DURATION_SECONDS,
    min_duration_seconds: int = MIN_DURATION_SECONDS,
    max_file_size_bytes: int = MAX_FILE_SIZE_BYTES,
) -> float:
    """Validate a resolved on-disk video and return its duration in seconds.

    When ``ffprobe`` is unavailable the duration check is skipped (we still
    enforce file existence / extension / size so basic_adapter's own fallback
    can take over gracefully).
    """
    resolved = video_path.expanduser().resolve()
    if not resolved.exists() or not resolved.is_file():
        raise JobValidationError(f"Video file not found: {resolved}")
    if not supported_extension(resolved):
        raise JobValidationError(
            "Unsupported video format. Expected one of: mp4, mov, mkv, webm "
            f"(got {resolved.suffix or '<none>'})."
        )

    size_bytes = resolved.stat().st_size
    if size_bytes <= 0:
        raise JobValidationError(f"Video file is empty: {resolved}")
    if size_bytes > max_file_size_bytes:
        raise JobValidationError(
            f"Video file exceeds max allowed size of "
            f"{max_file_size_bytes / (1024 * 1024):.0f} MiB."
        )

    duration = _probe_duration(resolved)
    if duration is None:
        logger.warning(
            "ffprobe unavailable; skipping duration validation for %s", resolved
        )
        return 0.0

    if duration < min_duration_seconds:
        raise JobValidationError(
            f"Video is too short ({duration:.0f}s). Minimum is "
            f"{min_duration_seconds}s."
        )
    if duration > max_duration_seconds:
        raise JobValidationError(
            f"Video is too long ({duration / 60:.1f} min). Maximum is "
            f"{max_duration_seconds / 60:.0f} min."
        )
    return float(duration)


def _probe_duration(video_path: Path) -> Optional[float]:
    """Read video duration via ffprobe; return None if unavailable."""
    ffprobe_path = shutil.which("ffprobe")
    if not ffprobe_path:
        return None
    command = [
        ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    try:
        result = subprocess.run(
            command, check=True, capture_output=True, text=True
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return None


def _is_safe_http_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
