#!/usr/bin/env python3
"""Small hardened static server for Kaswise PWA behind Nginx Proxy Manager."""

from __future__ import annotations

import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(os.environ.get("KASWISE_PWA_ROOT", Path(__file__).resolve().parent)).resolve()
HOST = os.environ.get("KASWISE_PWA_HOST", "0.0.0.0")
PORT = int(os.environ.get("KASWISE_PWA_PORT", os.environ.get("PORT", "8000")))

SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' blob: data: https://api.kaswise.com https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob:;",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=()",
}


def resolve_request_path(raw_path: str) -> Path | None:
    path = unquote(urlsplit(raw_path).path)
    if path.startswith("/"):
        path = path[1:]
    candidate = (ROOT / path).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        return None
    if candidate.is_dir():
        candidate = candidate / "index.html"
    if candidate.is_file():
        return candidate
    return ROOT / "index.html"


class Handler(BaseHTTPRequestHandler):
    server_version = "KaswisePWA/1.0"

    def _send_file(self, include_body: bool) -> None:
        file_path = resolve_request_path(self.path)
        if file_path is None or not file_path.exists():
            self.send_error(404)
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        data = file_path.read_bytes() if include_body else b""
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(file_path.stat().st_size))
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        if file_path.name.startswith("entry-") or "/_expo/" in file_path.as_posix():
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if include_body:
            self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        self._send_file(include_body=True)

    def do_HEAD(self) -> None:  # noqa: N802
        self._send_file(include_body=False)


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
