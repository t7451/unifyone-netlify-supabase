from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from .adapter import IClipperEngine
from .config import ClipperEngineConfig, DEFAULT_ENGINE_CONFIG


class StubClipperEngine(IClipperEngine):
    """Fast fake adapter for end-to-end orchestration tests."""

    def __init__(self, config: ClipperEngineConfig | None = None) -> None:
        self.config = config or DEFAULT_ENGINE_CONFIG

    def process_video(
        self,
        video_path: Path,
        num_clips: int = 12,
        target_duration: int = 45,
        style: str = "default",
    ) -> List[Dict[str, Any]]:
        """Return realistic fake clip metadata and placeholder outputs."""

        source = video_path.expanduser().resolve()
        clip_count = max(1, num_clips)
        duration = max(15, target_duration)
        run_dir = self.config.output_root / "stub" / source.stem
        run_dir.mkdir(parents=True, exist_ok=True)

        clips: List[Dict[str, Any]] = []
        for index in range(clip_count):
            start = round(index * max(duration - 5, 10), 2)
            end = round(start + duration, 2)
            title = f"{source.stem.replace('_', ' ').title()} Clip {index + 1}"
            caption = (
                f"Stub-generated highlight {index + 1} from {source.name} "
                f"optimized for the {style} preset."
            )
            output_path = run_dir / f"clip_{index + 1:02d}.mp4"
            self._create_placeholder_clip(output_path, duration)

            metadata = {
                "start": start,
                "end": end,
                "score": round(0.93 - (index * 0.03), 3),
                "title_suggestion": title,
                "caption": caption,
                "output_path": str(output_path),
            }
            (run_dir / f"clip_{index + 1:02d}.json").write_text(
                json.dumps(metadata, indent=2),
                encoding="utf-8",
            )
            clips.append(metadata)

        return clips

    def _create_placeholder_clip(self, output_path: Path, duration: int) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            command = [
                ffmpeg_path,
                "-y",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=720x1280:r=30",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=44100:cl=stereo",
                "-shortest",
                "-t",
                str(min(duration, 3)),
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                str(output_path),
            ]
            try:
                subprocess.run(
                    command,
                    check=True,
                    capture_output=True,
                    text=True,
                )
                return
            except subprocess.CalledProcessError:
                pass

        output_path.write_bytes(b"")
