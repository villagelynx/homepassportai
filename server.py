#!/usr/bin/env python3
"""Static files + POST /api/analyze (OpenAI Vision) for HomePassportAI."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
}

ANALYZE_PROMPT = """You analyze photos for a home appliance inventory app.

Image 1: the whole appliance.
Image 2: close-up of the manufacturer label / rating plate.

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Refrigerator, Range)
- brand: manufacturer brand or empty string
- model_number: model number from the label or empty string
- serial_number: serial number from the label or empty string
- confidence: "high", "medium", or "low" based on label readability
- nickname: short friendly label like "KitchenAid dishwasher" combining brand + type

Read the label image carefully for model and serial. If unreadable, use empty strings and low confidence."""


def load_dotenv() -> None:
    path = ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def resolve_port() -> int:
    for arg in sys.argv[1:]:
        if arg == "--no-open":
            continue
        try:
            return int(arg)
        except ValueError:
            continue
    port_env = os.environ.get("PORT")
    if port_env:
        return int(port_env)
    return 8080


def server_openai_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY", "").strip())


def resolve_api_key(handler: BaseHTTPRequestHandler) -> str:
    user_key = (handler.headers.get("X-OpenAI-Api-Key") or "").strip()
    if user_key:
        return user_key
    return os.environ.get("OPENAI_API_KEY", "").strip()


def analyze_with_openai(
    api_key: str, appliance_data_url: str, label_data_url: str
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError("No OpenAI API key provided.")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    model = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": ANALYZE_PROMPT},
                    {"type": "image_url", "image_url": {"url": appliance_data_url}},
                    {"type": "image_url", "image_url": {"url": label_data_url}},
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    return {
        "applianceType": str(data.get("appliance_type") or data.get("applianceType") or "").strip(),
        "brand": str(data.get("brand") or "").strip(),
        "modelNumber": str(data.get("model_number") or data.get("modelNumber") or "").strip(),
        "serialNumber": str(data.get("serial_number") or data.get("serialNumber") or "").strip(),
        "confidence": str(data.get("confidence") or "medium").strip().lower(),
        "nickname": str(data.get("nickname") or "").strip(),
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _safe_file(self, rel: str) -> Path | None:
        rel = rel.replace("\\", "/").lstrip("/")
        if not rel or ".." in rel.split("/"):
            return None
        target = (ROOT / rel).resolve()
        root = ROOT.resolve()
        if target != root and not str(target).startswith(f"{root}{os.sep}"):
            return None
        return target if target.is_file() else None

    def _send_file(self, rel: str) -> None:
        target = self._safe_file(rel)
        if not target:
            self.send_error(404)
            return
        ext = target.suffix.lower()
        ctype = MIME_TYPES.get(ext) or mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if ext in (".html", ".js", ".css", ".webmanifest"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-OpenAI-Api-Key")
        self.send_header("X-HomePassportAI", "1")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(
                200,
                {
                    "ok": True,
                    "openai": server_openai_configured(),
                    "userKeySupported": True,
                    "analyzePath": "/api/analyze",
                    "root": str(ROOT),
                    "port": resolve_port(),
                },
            )
            return
        if path in ("", "/"):
            self._send_file("index.html")
            return
        if path == "/index.html":
            self._send_file("index.html")
            return
        if path.startswith("/home-passport"):
            self.send_response(301)
            self.send_header("Location", "/")
            self.end_headers()
            return
        rel = path.lstrip("/")
        if self._safe_file(rel):
            self._send_file(rel)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/analyze":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 25_000_000:
            self._json(400, {"error": "Invalid request size"})
            return

        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Invalid JSON"})
            return

        appliance = body.get("appliancePhotoDataUrl") or body.get("appliance_photo")
        label = body.get("labelPhotoDataUrl") or body.get("label_photo")
        if not appliance or not label:
            self._json(400, {"error": "Both appliancePhotoDataUrl and labelPhotoDataUrl are required"})
            return

        api_key = resolve_api_key(self)
        if not api_key:
            self._json(
                200,
                {
                    "applianceType": "Appliance",
                    "brand": "",
                    "modelNumber": "",
                    "serialNumber": "",
                    "confidence": "low",
                    "nickname": "",
                    "demoMode": True,
                },
            )
            return

        try:
            result = analyze_with_openai(api_key, str(appliance), str(label))
            self._json(200, result)
        except Exception as exc:
            print(f"Analyze error: {exc}", file=sys.stderr)
            self._json(500, {"error": str(exc)})

    def _json(self, code: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def local_ip() -> str:
    import socket

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return str(s.getsockname()[0])
    except OSError:
        return "YOUR_MAC_IP"


def create_http_server(port: int) -> ThreadingHTTPServer:
    import socket

    class DualStackHTTPServer(ThreadingHTTPServer):
        address_family = socket.AF_INET6

        def server_bind(self) -> None:
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except OSError:
                pass
            super().server_bind()

    try:
        return DualStackHTTPServer(("::", port), Handler)
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", port), Handler)


def main() -> None:
    load_dotenv()
    port = resolve_port()

    if not (ROOT / "index.html").is_file():
        print(f"ERROR: index.html not found in {ROOT}", file=sys.stderr)
        sys.exit(1)

    try:
        server = create_http_server(port)
    except OSError as exc:
        print(f"Could not start on port {port}: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Serving from: {ROOT}")
    print(f"HomePassportAI → http://127.0.0.1:{port}  (or http://localhost:{port})")
    print(f"On your phone: http://{local_ip()}:{port}")
    if server_openai_configured():
        print("AI analysis: server key ready (OPENAI_API_KEY in .env)")
    else:
        print("AI analysis: add a key in app Settings (BYOK) or OPENAI_API_KEY in .env")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
