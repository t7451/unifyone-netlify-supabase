"""Minimal HTTP test endpoint for the clippers orchestration layer.

Exposes two routes using only the Python stdlib so no new dependencies are
required:

* ``POST /api/clippers/test-job`` — create + run a job synchronously.
  Body: ``{"input_url"|"input_file_path", "num_clips", "target_duration",
  "style", "engine"}``.
  Returns the fully-processed job record (including download URLs).

* ``GET /storage/{key}?expires=...&sig=...`` — serve a file from the
  :class:`StorageProxy` if the signature is valid.

This server is intentionally scoped to debugging / Phase 3 validation and
is **not** a production deployment target.  Production traffic belongs on
the TypeScript Layer 1 (tRPC).
"""

from __future__ import annotations

import argparse
import json
import logging
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from .models import ClippingJob, JobStatus
from .processor import process_job
from .registry import get_default_registry
from .storage import get_default_storage

logger = logging.getLogger(__name__)


class TestJobHandler(BaseHTTPRequestHandler):
    """Stdlib HTTP handler for the Phase 3 test endpoint."""

    server_version = "UnifyOneClippersTest/1.0"

    # ---- Request routing --------------------------------------------
    def do_POST(self) -> None:  # noqa: N802 (stdlib naming)
        if self.path.rstrip("/") == "/api/clippers/test-job":
            self._handle_test_job()
        else:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_GET(self) -> None:  # noqa: N802 (stdlib naming)
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/storage/"):
            self._serve_storage(parsed)
        elif parsed.path.rstrip("/") == "/api/clippers/health":
            self._send_json(HTTPStatus.OK, {"status": "ok"})
        else:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    # ---- Handlers ---------------------------------------------------
    def _handle_test_job(self) -> None:
        try:
            payload = self._read_json()
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        try:
            job = ClippingJob(
                tenant_id=payload.get("tenant_id"),
                user_id=payload.get("user_id"),
                input_url=payload.get("input_url"),
                input_file_path=payload.get("input_file_path"),
                num_clips=int(payload.get("num_clips", 3)),
                target_duration=int(payload.get("target_duration", 30)),
                style=str(payload.get("style", "default")),
                engine=payload.get("engine"),
            )
        except (TypeError, ValueError) as exc:
            self._send_json(
                HTTPStatus.BAD_REQUEST, {"error": f"Invalid job payload: {exc}"}
            )
            return

        registry = get_default_registry()
        registry.register(job)
        process_job(job)

        status = (
            HTTPStatus.OK
            if job.status == JobStatus.COMPLETED
            else HTTPStatus.UNPROCESSABLE_ENTITY
        )
        self._send_json(status, job.to_dict())

    def _serve_storage(self, parsed: urllib.parse.ParseResult) -> None:
        storage = get_default_storage()
        storage_key = urllib.parse.unquote(parsed.path[len("/storage/") :])
        query = urllib.parse.parse_qs(parsed.query)
        expires_values = query.get("expires")
        signature_values = query.get("sig")
        if not expires_values or not signature_values:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "Missing 'expires' or 'sig' query parameters."},
            )
            return
        try:
            expires = int(expires_values[0])
        except ValueError:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid 'expires'."})
            return
        if not storage.verify_signed_url(
            storage_key, expires=expires, signature=signature_values[0]
        ):
            self._send_json(
                HTTPStatus.FORBIDDEN, {"error": "Invalid or expired signature."}
            )
            return
        file_path = storage.resolve_path(storage_key)
        if not file_path.exists() or not file_path.is_file():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "File not found."})
            return

        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---- I/O helpers ------------------------------------------------
    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            raise ValueError("Missing request body.")
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON body: {exc}") from exc
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        return payload

    def _send_json(self, status: HTTPStatus, body: Dict[str, Any]) -> None:
        data = json.dumps(body, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        logger.info("http %s - %s", self.address_string(), format % args)


def run(host: str = "127.0.0.1", port: int = 8787) -> None:
    """Run the test HTTP server until interrupted."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    server = ThreadingHTTPServer((host, port), TestJobHandler)
    logger.info("Clippers test endpoint listening on http://%s:%d", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down test endpoint.")
    finally:
        server.server_close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the clippers test HTTP endpoint."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    run(host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
