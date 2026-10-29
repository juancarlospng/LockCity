"""Temporary read-only Railway-to-Woo connectivity probe.

The public surface exposes only a minimal health check. Network diagnostics are
emitted to private service logs and contain no credentials or response bodies.
"""

from __future__ import annotations

import json
import os
import socket
import ssl
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = "commerce.lockcityclothes.com"
PORT = 443
TCP_TIMEOUT = 5.0
HTTP_TIMEOUT = 20.0
PATHS = ("/", "/wp-json/", "/wp-json/wc/store/v1/products")
PREFIX = "railway_connectivity_probe"


def emit(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    print(f"{PREFIX} {json.dumps(payload, sort_keys=True, separators=(',', ':'))}", flush=True)


def resolved_addresses() -> list[tuple[int, str]]:
    records = socket.getaddrinfo(HOST, PORT, socket.AF_UNSPEC, socket.SOCK_STREAM)
    seen: set[tuple[int, str]] = set()
    addresses: list[tuple[int, str]] = []
    for family, _socktype, _proto, _canonname, sockaddr in records:
        if family not in (socket.AF_INET, socket.AF_INET6):
            continue
        item = (family, sockaddr[0])
        if item not in seen:
            seen.add(item)
            addresses.append(item)
    emit(
        "dns",
        addresses=[
            {"family": "IPv4" if family == socket.AF_INET else "IPv6", "ip": ip}
            for family, ip in addresses
        ],
    )
    return addresses


def tcp_once(family: int, ip: str) -> bool:
    started = time.monotonic()
    connection = socket.socket(family, socket.SOCK_STREAM)
    connection.settimeout(TCP_TIMEOUT)
    result = "FAIL"
    error_class: str | None = None
    try:
        connection.connect((ip, PORT))
        result = "PASS"
    except socket.timeout as error:
        result = "TIMEOUT"
        error_class = error.__class__.__name__
    except ConnectionRefusedError as error:
        result = "REFUSED"
        error_class = error.__class__.__name__
    except OSError as error:
        error_class = error.__class__.__name__
    finally:
        connection.close()
    fields: dict[str, object] = {
        "family": "IPv4" if family == socket.AF_INET else "IPv6",
        "ip": ip,
        "result": result,
        "elapsedMs": round((time.monotonic() - started) * 1000),
    }
    if error_class:
        fields["errorClass"] = error_class
    emit("tcp", **fields)
    return result == "PASS"


def open_tls(family: int, ip: str, timeout: float) -> ssl.SSLSocket:
    raw = socket.socket(family, socket.SOCK_STREAM)
    raw.settimeout(timeout)
    try:
        raw.connect((ip, PORT))
        context = ssl.create_default_context()
        return context.wrap_socket(raw, server_hostname=HOST)
    except Exception:
        raw.close()
        raise


def tls_once(family: int, ip: str) -> bool:
    started = time.monotonic()
    connection: ssl.SSLSocket | None = None
    try:
        connection = open_tls(family, ip, HTTP_TIMEOUT)
        emit(
            "tls",
            family="IPv4" if family == socket.AF_INET else "IPv6",
            ip=ip,
            result="PASS",
            version=connection.version(),
            elapsedMs=round((time.monotonic() - started) * 1000),
        )
        return True
    except Exception as error:
        emit(
            "tls",
            family="IPv4" if family == socket.AF_INET else "IPv6",
            ip=ip,
            result="FAIL",
            errorClass=error.__class__.__name__,
            elapsedMs=round((time.monotonic() - started) * 1000),
        )
        return False
    finally:
        if connection is not None:
            connection.close()


def http_get(family: int, ip: str, path: str) -> None:
    started = time.monotonic()
    connection: ssl.SSLSocket | None = None
    try:
        connection = open_tls(family, ip, HTTP_TIMEOUT)
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {HOST}\r\n"
            "User-Agent: lock-city-railway-connectivity-probe/1.0\r\n"
            "Accept: application/json\r\n"
            "Connection: close\r\n\r\n"
        )
        connection.sendall(request.encode("ascii"))
        first_line = b""
        while b"\r\n" not in first_line and len(first_line) < 4096:
            chunk = connection.recv(512)
            if not chunk:
                break
            first_line += chunk
        status_line = first_line.split(b"\r\n", 1)[0].decode("ascii", errors="replace")
        parts = status_line.split(" ", 2)
        status = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        emit(
            "http",
            path=path,
            status=status,
            result="PASS" if status is not None else "FAIL",
            elapsedMs=round((time.monotonic() - started) * 1000),
        )
    except Exception as error:
        emit(
            "http",
            path=path,
            result="FAIL",
            errorClass=error.__class__.__name__,
            elapsedMs=round((time.monotonic() - started) * 1000),
        )
    finally:
        if connection is not None:
            connection.close()


def run_probe() -> None:
    emit("start", environment=os.getenv("RAILWAY_ENVIRONMENT_NAME", "not_exposed"))
    try:
        addresses = resolved_addresses()
    except Exception as error:
        emit("dns", result="FAIL", errorClass=error.__class__.__name__)
        emit("complete")
        return
    connected: list[tuple[int, str]] = []
    for family, ip in addresses:
        if tcp_once(family, ip):
            connected.append((family, ip))
    if connected:
        family, ip = connected[0]
        if tls_once(family, ip):
            for path in PATHS:
                http_get(family, ip, path)
    emit("complete")


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        if self.path not in ("/health", "/api/health"):
            self.send_response(404)
            self.end_headers()
            return
        body = b'{"status":"ok"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


if __name__ == "__main__":
    threading.Thread(target=run_probe, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PORT", "8080"))), HealthHandler)
    server.serve_forever()
