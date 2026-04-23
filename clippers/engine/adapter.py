from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List

from .config import ClipperEngineConfig, DEFAULT_ENGINE_CONFIG


class IClipperEngine(ABC):
    @abstractmethod
    def process_video(
        self,
        video_path: Path,
        num_clips: int = 12,
        target_duration: int = 45,
        style: str = "default",
    ) -> List[Dict[str, Any]]:
        """Process a long video and return clip metadata.

        Args:
            video_path: Source video to clip.
            num_clips: Maximum number of clips to return.
            target_duration: Preferred clip length in seconds.
            style: Output style preset for downstream adapters.

        Returns:
            A list of clip dictionaries with start, end, score,
            title_suggestion, caption, and output_path values.
        """


def get_clipper_engine(
    engine_name: str = "basic",
    config: ClipperEngineConfig | None = None,
) -> IClipperEngine:
    """Create a clipper engine instance by adapter name."""

    resolved_config = config or DEFAULT_ENGINE_CONFIG
    normalized = engine_name.strip().lower()

    if normalized == "stub":
        from .stub_adapter import StubClipperEngine

        return StubClipperEngine(config=resolved_config)

    if normalized == "basic":
        from .basic_adapter import BasicClipperEngine

        return BasicClipperEngine(config=resolved_config)

    raise ValueError(f"Unsupported clipper engine '{engine_name}'.")
