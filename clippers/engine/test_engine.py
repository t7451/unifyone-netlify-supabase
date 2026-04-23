from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Sequence

from clippers.engine.adapter import get_clipper_engine

SYNTHETIC_VIDEO_DURATION_SECONDS = 18


def main() -> int:
    args = parse_args()
    video_path = resolve_video_input(args.video, args.url)

    for engine_name in args.engines:
        engine = get_clipper_engine(engine_name)
        clips = engine.process_video(
            video_path=video_path,
            num_clips=args.num_clips,
            target_duration=args.target_duration,
            style=args.style,
        )
        print(json.dumps({"engine": engine_name, "clips": clips}, indent=2))

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run UnifyOne clipper adapters.")
    parser.add_argument("--video", type=Path, help="Path to a local source video.")
    parser.add_argument("--url", type=str, help="Optional direct video URL to download.")
    parser.add_argument(
        "--engines",
        nargs="+",
        default=["stub", "basic"],
        choices=["stub", "basic"],
        help="Adapters to execute.",
    )
    parser.add_argument("--num-clips", type=int, default=3)
    parser.add_argument("--target-duration", type=int, default=20)
    parser.add_argument("--style", type=str, default="default")
    return parser.parse_args()


def resolve_video_input(local_video: Path | None, remote_url: str | None) -> Path:
    if local_video:
        return local_video.expanduser().resolve()

    workspace = Path(tempfile.gettempdir()) / "unifyone-clippers-test"
    workspace.mkdir(parents=True, exist_ok=True)

    if remote_url:
        if not is_safe_http_url(remote_url):
            raise ValueError("Only http:// and https:// URLs are supported for downloads.")
        output_path = workspace / "downloaded-sample.mp4"
        urllib.request.urlretrieve(remote_url, output_path)
        return output_path

    synthetic_path = workspace / "synthetic-sample.mp4"
    build_synthetic_sample(synthetic_path)
    return synthetic_path


def build_synthetic_sample(output_path: Path) -> None:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        output_path.write_bytes(b"")
        return

    command: Sequence[str] = (
        ffmpeg_path,
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=1280x720:rate=30",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=44100",
        "-t",
        str(SYNTHETIC_VIDEO_DURATION_SECONDS),
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        str(output_path),
    )
    subprocess.run(command, check=True, capture_output=True, text=True)


def is_safe_http_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


if __name__ == "__main__":
    raise SystemExit(main())
