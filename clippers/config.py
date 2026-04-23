"""Centralized settings for the Clippers subsystem.

Uses ``pydantic-settings`` to load configuration from environment variables
prefixed with ``CLIPPERS_``, with sensible defaults for local development.

Usage::

    from clippers.config import settings

    print(settings.engine)           # "basic"
    print(settings.temp_dir)         # Path("/tmp/unifyone-clippers")
    print(settings.max_file_size_bytes)
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from pydantic_settings import BaseSettings


def _default_temp_dir() -> str:
    return str(Path(tempfile.gettempdir()) / "unifyone-clippers")


def _default_storage_root() -> str:
    return str(Path.home() / ".unifyone" / "clippers" / "storage")


class Settings(BaseSettings):
    """Clippers configuration loaded from ``CLIPPERS_*`` env vars."""

    # ── Engine ─────────────────────────────────────────────────────────
    engine: str = "basic"

    # ── Storage ────────────────────────────────────────────────────────
    storage_backend: str = "local"
    storage_root: str = _default_storage_root()
    storage_base_url: str = "http://localhost:8787"
    storage_signing_secret: str = ""
    signed_url_ttl_seconds: int = 3600

    # ── Limits ─────────────────────────────────────────────────────────
    max_duration_seconds: int = 10800  # 3 hours
    min_duration_seconds: int = 30
    max_file_size_bytes: int = 5 * 1024 * 1024 * 1024  # 5 GiB

    # ── Paths ──────────────────────────────────────────────────────────
    temp_dir: str = _default_temp_dir()

    # ── Logging ────────────────────────────────────────────────────────
    log_level: str = "INFO"

    # ── Version ────────────────────────────────────────────────────────
    version: str = "1.0.0"

    model_config = {
        "env_prefix": "CLIPPERS_",
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

# Ensure key directories exist on import so downstream code can rely on them.
Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
Path(settings.storage_root).mkdir(parents=True, exist_ok=True)
