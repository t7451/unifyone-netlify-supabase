#!/usr/bin/env python3
"""CLI wrapper: run a single clipper engine for a job and emit JSON to stdout.

Usage:
    python -m clippers.run_job --engine stub --num-clips 3 --url https://...
    python -m clippers.run_job --engine stub --num-clips 3 --video /path/to/video.mp4

Output (stdout):
    {"clips": [{"start": 0, "end": 45, "score": 0.93, ...}, ...]}

Exit codes:
    0  success
    1  error (message written to stderr)
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from clippers.engine.adapter import get_clipper_engine


def main() -> int:
    args = _parse_args()

    try:
        video_path = _resolve_video(args.video, args.url)
        engine = get_clipper_engine(args.engine)
        clips = engine.process_video(
            video_path=video_path,
            num_clips=args.num_clips,
            target_duration=args.target_duration,
            style=args.style,
        )
        json.dump({"clips": clips}, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a single UnifyOne clipper engine and emit JSON."
    )
    parser.add_argument(
        "--engine",
        default="stub",
        choices=["stub", "basic"],
        help="Clipper engine adapter to use (default: stub).",
    )
    parser.add_argument(
        "--video",
        type=Path,
        default=None,
        help="Path to a local source video file.",
    )
    parser.add_argument(
        "--url",
        type=str,
        default=None,
        help="HTTP/HTTPS URL of the source video to download.",
    )
    parser.add_argument(
        "--num-clips",
        type=int,
        default=3,
        dest="num_clips",
        help="Maximum number of clips to produce (default: 3).",
    )
    parser.add_argument(
        "--target-duration",
        type=int,
        default=45,
        dest="target_duration",
        help="Target clip length in seconds (default: 45).",
    )
    parser.add_argument(
        "--style",
        default="default",
        help="Output style preset (default: default).",
    )
    return parser.parse_args()


def _resolve_video(local: Path | None, url: str | None) -> Path:
    """Return a local Path to the source video, downloading if necessary."""
    if local is not None:
        return local.expanduser().resolve()

    workspace = Path(tempfile.gettempdir()) / "unifyone-clippers-jobs"
    workspace.mkdir(parents=True, exist_ok=True)

    if url is not None:
        _validate_url_no_ssrf(url)
        dest = workspace / "source.mp4"
        urllib.request.urlretrieve(url, dest)  # noqa: S310
        return dest

    # No video provided — create a minimal synthetic file for testing
    dest = workspace / "synthetic-source.mp4"
    _build_synthetic_video(dest)
    return dest


def _validate_url_no_ssrf(url: str) -> None:
    """Raise ValueError if the URL could reach internal/private network resources."""
    import ipaddress
    import socket

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(
            f"Unsupported URL scheme '{parsed.scheme}'. "
            "Only http:// and https:// are allowed."
        )

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL is missing a hostname.")

    try:
        resolved_ip = socket.gethostbyname(hostname)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve hostname '{hostname}': {exc}") from exc

    try:
        addr = ipaddress.ip_address(resolved_ip)
    except ValueError as exc:
        raise ValueError(f"Invalid resolved IP address '{resolved_ip}': {exc}") from exc

    if (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    ):
        raise ValueError(
            f"Requests to internal/private IP addresses are not permitted "
            f"(resolved '{hostname}' → {resolved_ip})."
        )


def _build_synthetic_video(output_path: Path) -> None:
    """Create a short test video with ffmpeg, or a zero-byte placeholder."""
    import shutil
    import subprocess

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        output_path.write_bytes(b"")
        return

    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-f", "lavfi",
            "-i", "color=c=black:s=720x1280:r=30",
            "-f", "lavfi",
            "-i", "anullsrc=r=44100:cl=stereo",
            "-shortest",
            "-t", "10",
            "-c:v", "libx264",
            "-c:a", "aac",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )


if __name__ == "__main__":
    raise SystemExit(main())
