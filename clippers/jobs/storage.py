"""Minimal storage proxy for clipper outputs.

This module is a standalone Python stand-in for a cloud-backed object
storage service (S3 / Supabase Storage).  It:

* moves engine-produced clip files into a stable output directory keyed by
  ``{tenant}/{job_id}/{clip_index}``
* generates time-limited HMAC-signed URLs for downloading those files

For real deployments a production S3 backend should implement the same
:class:`StorageProxy` surface and be installed via a DI entry-point; the
orchestration code only depends on the interface.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import quote

logger = logging.getLogger(__name__)


DEFAULT_SIGNED_URL_TTL_SECONDS = int(
    os.getenv("CLIPPERS_SIGNED_URL_TTL_SECONDS", str(60 * 60))  # 1 hour
)


def _default_signing_secret() -> str:
    # Fall back to a per-process ephemeral secret so unit tests and CLI
    # runs still produce valid signatures without requiring env config.
    secret = os.getenv("CLIPPERS_STORAGE_SIGNING_SECRET")
    if secret:
        return secret
    return hashlib.sha256(f"unifyone-clippers-{os.getpid()}".encode()).hexdigest()


@dataclass
class StoredObject:
    """Metadata for an object moved into the storage proxy."""

    storage_key: str
    absolute_path: Path
    size_bytes: int


class StorageProxy:
    """Local filesystem storage proxy with signed URL support.

    Files placed under :attr:`root` are addressable by ``storage_key``.
    Signed URLs are of the form ``{base_url}/storage/{key}?expires=...&sig=...``
    and can be verified by :meth:`verify_signed_url`.
    """

    def __init__(
        self,
        root: Path,
        *,
        base_url: str = "http://localhost:8787",
        signing_secret: Optional[str] = None,
    ) -> None:
        self.root = root.expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.base_url = base_url.rstrip("/")
        self._signing_secret = signing_secret or _default_signing_secret()

    # ------------------------------------------------------------------
    # Write path
    # ------------------------------------------------------------------
    def put_file(
        self,
        local_path: Path,
        *,
        storage_key: str,
        move: bool = True,
    ) -> StoredObject:
        """Place ``local_path`` into storage under ``storage_key``.

        When ``move`` is True the source file is removed after copying (use
        this for temp files); when False the source file is preserved.
        """
        source = local_path.expanduser().resolve()
        if not source.exists():
            raise FileNotFoundError(f"Cannot store missing file: {source}")

        destination = self._resolve_key_path(storage_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Protect against accidentally overwriting a file produced by a
        # concurrent job by using the ``.tmp`` swap-and-rename pattern.
        tmp_destination = destination.with_suffix(destination.suffix + ".tmp")
        if move:
            shutil.move(source, tmp_destination)
        else:
            shutil.copy2(source, tmp_destination)
        tmp_destination.replace(destination)
        size_bytes = destination.stat().st_size
        logger.debug(
            "Stored %s (%d bytes) at key=%s", source.name, size_bytes, storage_key
        )
        return StoredObject(
            storage_key=storage_key,
            absolute_path=destination,
            size_bytes=size_bytes,
        )

    # ------------------------------------------------------------------
    # Read / URL generation
    # ------------------------------------------------------------------
    def signed_url(
        self,
        storage_key: str,
        *,
        expires_in_seconds: int = DEFAULT_SIGNED_URL_TTL_SECONDS,
    ) -> str:
        """Return a time-limited signed download URL for ``storage_key``."""
        expires_at = int(time.time()) + max(1, expires_in_seconds)
        signature = self._sign(storage_key, expires_at)
        return (
            f"{self.base_url}/storage/{quote(storage_key, safe='/')}"
            f"?expires={expires_at}&sig={signature}"
        )

    def verify_signed_url(
        self,
        storage_key: str,
        *,
        expires: int,
        signature: str,
    ) -> bool:
        """Constant-time verification of a signed URL tuple."""
        if expires < int(time.time()):
            return False
        expected = self._sign(storage_key, expires)
        return hmac.compare_digest(expected, signature)

    def resolve_path(self, storage_key: str) -> Path:
        """Return the absolute path on disk for ``storage_key`` (may not exist)."""
        return self._resolve_key_path(storage_key)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _sign(self, storage_key: str, expires_at: int) -> str:
        payload = f"{storage_key}:{expires_at}".encode()
        return hmac.new(
            self._signing_secret.encode(), payload, hashlib.sha256
        ).hexdigest()

    def _resolve_key_path(self, storage_key: str) -> Path:
        # Reject path-traversal / absolute keys to stay inside ``root``.
        if storage_key.startswith("/") or ".." in Path(storage_key).parts:
            raise ValueError(f"Invalid storage key: {storage_key!r}")
        return (self.root / storage_key).resolve()


_DEFAULT_STORAGE: Optional[StorageProxy] = None


def get_default_storage() -> StorageProxy:
    """Return a process-wide default :class:`StorageProxy`.

    Location is overridable via the ``CLIPPERS_STORAGE_ROOT`` env var so the
    same artefacts can be served by the minimal HTTP test endpoint.
    """
    global _DEFAULT_STORAGE
    if _DEFAULT_STORAGE is None:
        root = Path(
            os.getenv(
                "CLIPPERS_STORAGE_ROOT",
                str(Path.home() / ".unifyone" / "clippers" / "storage"),
            )
        )
        base_url = os.getenv("CLIPPERS_STORAGE_BASE_URL", "http://localhost:8787")
        _DEFAULT_STORAGE = StorageProxy(root, base_url=base_url)
    return _DEFAULT_STORAGE
