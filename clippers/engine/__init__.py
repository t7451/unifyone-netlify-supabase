"""Clipper engine exports for orchestration consumers."""

from .adapter import IClipperEngine, get_clipper_engine
from .config import ClipperEngineConfig, HighlightScoringWeights

__all__ = [
    "ClipperEngineConfig",
    "HighlightScoringWeights",
    "IClipperEngine",
    "get_clipper_engine",
]
