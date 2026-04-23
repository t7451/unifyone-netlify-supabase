"""CLI to manually trigger a clipping job end-to-end.

Example usage::

    python -m clippers.engine.run_job --video /path/to/video.mp4 --num-clips 8
    python -m clippers.engine.run_job --url https://example.com/video.mp4 \
        --engine stub --num-clips 3

The command prints the resulting job record (including signed download
URLs) as JSON so it can be piped into ``jq`` or other tooling.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Optional, Sequence

from clippers.jobs import ClippingJob, JobStatus, process_job
from clippers.jobs.registry import get_default_registry


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    job = ClippingJob(
        tenant_id=args.tenant_id,
        user_id=args.user_id,
        input_url=args.url,
        input_file_path=str(args.video.expanduser().resolve()) if args.video else None,
        num_clips=args.num_clips,
        target_duration=args.target_duration,
        style=args.style,
        engine=args.engine,
    )
    get_default_registry().register(job)

    process_job(job, engine_override=args.engine_override)

    output = json.dumps(job.to_dict(), indent=2, default=str)
    if args.output:
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output)

    return 0 if job.status == JobStatus.COMPLETED else 1


def _parse_args(argv: Optional[Sequence[str]]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Manually trigger a clipping job end-to-end.",
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--video",
        type=Path,
        help="Path to a local source video file (mp4, mov, mkv, webm).",
    )
    source.add_argument(
        "--url",
        type=str,
        help="URL of a source video (YouTube or direct media URL).",
    )
    parser.add_argument("--num-clips", type=int, default=8)
    parser.add_argument("--target-duration", type=int, default=45)
    parser.add_argument("--style", type=str, default="default")
    parser.add_argument(
        "--engine",
        choices=["stub", "basic"],
        default=None,
        help="Engine to request for this job (honours CLIPPERS_ENGINE if unset).",
    )
    parser.add_argument(
        "--engine-override",
        choices=["stub", "basic"],
        default=None,
        help="Admin-style override that wins over --engine and env.",
    )
    parser.add_argument(
        "--tenant-id",
        type=int,
        default=None,
        help="Optional tenant id to embed in storage keys.",
    )
    parser.add_argument(
        "--user-id",
        type=int,
        default=None,
        help="Optional user id to associate with the job record.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Write the JSON job result to this file instead of stdout.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
