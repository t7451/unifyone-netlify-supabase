from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


def _default_temp_root() -> Path:
    return Path(
        os.getenv("CLIPPERS_TEMP_DIR", Path(tempfile.gettempdir()) / "unifyone-clippers")
    )


@dataclass(frozen=True)
class HighlightScoringWeights:
    """Weights used by the basic highlight ranker."""

    transcript: float = 0.55
    energy: float = 0.25
    scene: float = 0.15
    llm: float = 0.05


@dataclass(frozen=True)
class ClipperEngineConfig:
    """Runtime configuration for clipper engines."""

    whisper_model_size: str = os.getenv("CLIPPERS_WHISPER_MODEL", "medium")
    fallback_whisper_model_size: str = os.getenv(
        "CLIPPERS_WHISPER_FALLBACK_MODEL", "large-v3"
    )
    default_num_clips: int = int(os.getenv("CLIPPERS_DEFAULT_NUM_CLIPS", "12"))
    default_clip_length: int = int(os.getenv("CLIPPERS_DEFAULT_CLIP_LENGTH", "45"))
    min_clip_length: int = int(os.getenv("CLIPPERS_MIN_CLIP_LENGTH", "20"))
    max_clip_length: int = int(os.getenv("CLIPPERS_MAX_CLIP_LENGTH", "60"))
    target_width: int = int(os.getenv("CLIPPERS_TARGET_WIDTH", "720"))
    target_height: int = int(os.getenv("CLIPPERS_TARGET_HEIGHT", "1280"))
    temp_root: Path = field(default_factory=_default_temp_root)
    output_root: Path = field(
        default_factory=lambda: _default_temp_root() / "outputs"
    )
    highlight_scoring_weights: HighlightScoringWeights = field(
        default_factory=HighlightScoringWeights
    )


DEFAULT_ENGINE_CONFIG = ClipperEngineConfig()
