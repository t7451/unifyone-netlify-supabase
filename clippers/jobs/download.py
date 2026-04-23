"""Video source acquisition for clipping jobs.

Two input modes are supported:

* ``input_file_path`` — already-uploaded local file (pass-through)
* ``input_url`` — download to a temp workspace.  ``yt-dlp`` is used when
  available (handles YouTube and most streaming sites); otherwise the URL
  is fetched with ``urllib`` as a direct media URL.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

from .models import JobValidationError

logger = logging.getLogger(__name__)

# Default network retry behaviour for transient download failures.
DOWNLOAD_RETRIES = 3
DOWNLOAD_RETRY_BACKOFF_SECONDS = 2.0


def resolve_source(
    *,
    input_url: Optional[str],
    input_file_path: Optional[str],
    workspace: Optional[Path] = None,
) -> tuple[Path, bool]:
    """Return ``(local_video_path, is_temporary)``.

    When ``is_temporary`` is True the caller is responsible for deleting the
    parent directory after processing — see :func:`cleanup_temp_source`.
    """
    if input_file_path:
        return Path(input_file_path).expanduser().resolve(), False

    if not input_url:
        raise JobValidationError(
            "Missing video source: provide either 'input_url' or 'input_file_path'."
        )

    workspace = workspace or Path(tempfile.mkdtemp(prefix="unifyone-clippers-dl-"))
    workspace.mkdir(parents=True, exist_ok=True)
    local_path = _download(input_url, workspace)
    return local_path, True


def cleanup_temp_source(path: Path) -> None:
    """Remove a temporary download workspace (ignores missing paths)."""
    try:
        if path.is_file():
            # Clean the parent workspace we created.
            shutil.rmtree(path.parent, ignore_errors=True)
        elif path.exists():
            shutil.rmtree(path, ignore_errors=True)
    except OSError as exc:
        logger.warning("Failed to cleanup temporary source %s: %s", path, exc)


def _download(url: str, workspace: Path) -> Path:
    """Download ``url`` into ``workspace`` with retry logic."""
    last_error: Optional[Exception] = None
    for attempt in range(1, DOWNLOAD_RETRIES + 1):
        try:
            downloader = _ytdlp_download if _ytdlp_available() else _urllib_download
            return downloader(url, workspace)
        except (urllib.error.URLError, OSError, RuntimeError) as exc:
            last_error = exc
            logger.warning(
                "Download attempt %d/%d for %s failed: %s",
                attempt,
                DOWNLOAD_RETRIES,
                url,
                exc,
            )
            if attempt < DOWNLOAD_RETRIES:
                time.sleep(DOWNLOAD_RETRY_BACKOFF_SECONDS * attempt)
    raise JobValidationError(
        f"Failed to download video after {DOWNLOAD_RETRIES} attempts: {last_error}"
    )


def _ytdlp_available() -> bool:
    try:
        import yt_dlp  # noqa: F401

        return True
    except ImportError:
        return False


def _ytdlp_download(url: str, workspace: Path) -> Path:
    """Download via yt-dlp (handles YouTube + most streaming sites)."""
    import yt_dlp  # type: ignore

    out_template = str(workspace / "source.%(ext)s")
    options = {
        "outtmpl": out_template,
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 2,
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        # ``prepare_filename`` returns the post-download path for the entry.
        filename = Path(ydl.prepare_filename(info))
    # yt-dlp may rewrite the extension during merge; pick whatever landed.
    if not filename.exists():
        candidates = sorted(workspace.glob("source.*"))
        if not candidates:
            raise RuntimeError("yt-dlp reported success but produced no file.")
        filename = candidates[0]
    return filename.resolve()


def _urllib_download(url: str, workspace: Path) -> Path:
    """Fetch a direct media URL with ``urllib`` (no JS / site-specific logic)."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise JobValidationError("Only http:// and https:// URLs are supported.")
    # Preserve extension when present so downstream validation recognises it.
    suffix = Path(parsed.path).suffix or ".mp4"
    output_path = workspace / f"source{suffix}"
    logger.info("Downloading %s -> %s (urllib fallback)", url, output_path)
    # urlretrieve is fine for a local orchestration tool; caller has
    # already validated the scheme as http(s).
    urllib.request.urlretrieve(url, output_path)  # noqa: S310
    if output_path.stat().st_size == 0:
        raise RuntimeError(f"Downloaded file is empty: {output_path}")
    return output_path.resolve()
