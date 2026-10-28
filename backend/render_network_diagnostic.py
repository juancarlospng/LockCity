"""Temporary, sanitized Render-to-origin network diagnostics."""
import asyncio
import ipaddress
import json
import logging
import os
import socket
import ssl
import time

import httpx


LOGGER = logging.getLogger(__name__)
TARGET_HOST = "commerce.lockcityclothes.com"
TARGET_PORT = 443
CONNECT_TIMEOUT = 5.0
TLS_TIMEOUT = 8.0


def _log(event, **fields):
    LOGGER.warning(
        "render_net_diag %s",
        json.dumps({"event": event, **fields}, sort_keys=True, separators=(",", ":")))


def _error_class(error):
    if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        return "Timeout"
    if isinstance(error, ConnectionRefusedError):
        return "ConnectionRefused"
    return error.__class__.__name__


def _address_rows(records):
    rows = []
    seen = set()
    for family, _socktype, _proto, _canonname, sockaddr in records:
        if family not in {socket.AF_INET, socket.AF_INET6}:
            continue
        ip = sockaddr[0]
        key = (family, ip)
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "family": "IPv4" if family == socket.AF_INET else "IPv6",
            "familyValue": family,
            "ip": ip,
        })
    return rows


async def _resolve_system():
    started = time.monotonic()
    loop = asyncio.get_running_loop()
    records = await loop.getaddrinfo(
        TARGET_HOST, TARGET_PORT, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
    rows = _address_rows(records)
    _log(
        "system_dns", resolver="system_getaddrinfo",
        elapsedMs=round((time.monotonic() - started) * 1000),
        addresses=[{"family": row["family"], "ip": row["ip"]} for row in rows])
    return rows


async def _connect_ip(row):
    started = time.monotonic()
    writer = None
    result = "FAIL"
    error_class = None
    try:
        _reader, writer = await asyncio.wait_for(
            asyncio.open_connection(
                row["ip"], TARGET_PORT, family=row["familyValue"]),
            timeout=CONNECT_TIMEOUT)
        result = "PASS"
    except asyncio.TimeoutError as error:
        result, error_class = "TIMEOUT", _error_class(error)
    except ConnectionRefusedError as error:
        result, error_class = "REFUSED", _error_class(error)
    except Exception as error:  # sanitized below
        error_class = _error_class(error)
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
    output = {
        "family": row["family"], "ip": row["ip"], "result": result,
        "elapsedMs": round((time.monotonic() - started) * 1000),
    }
    if error_class is not None:
        output["errorClass"] = error_class
    _log("tcp_connect", **output)
    return result == "PASS"


def _certificate_names(certificate):
    names = []
    for kind, value in certificate.get("subjectAltName", ()):
        if kind == "DNS" and isinstance(value, str):
            names.append(value)
    if names:
        return sorted(set(names))
    for group in certificate.get("subject", ()):
        for key, value in group:
            if key == "commonName" and isinstance(value, str):
                names.append(value)
    return sorted(set(names))


async def _tls_and_http(row):
    started = time.monotonic()
    writer = None
    context = ssl.create_default_context()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(
                row["ip"], TARGET_PORT, family=row["familyValue"],
                ssl=context, server_hostname=TARGET_HOST),
            timeout=TLS_TIMEOUT)
        ssl_object = writer.get_extra_info("ssl_object")
        certificate = ssl_object.getpeercert() if ssl_object is not None else {}
        _log(
            "tls_handshake", family=row["family"], ip=row["ip"], result="PASS",
            elapsedMs=round((time.monotonic() - started) * 1000),
            sni=TARGET_HOST,
            tlsVersion=ssl_object.version() if ssl_object is not None else "unknown",
            certificateNames=_certificate_names(certificate))
        http_started = time.monotonic()
        writer.write((
            "GET /wp-json/ HTTP/1.1\r\n"
            f"Host: {TARGET_HOST}\r\n"
            "User-Agent: lock-city-network-diagnostic/1.0\r\n"
            "Accept: application/json\r\n"
            "Connection: close\r\n\r\n"
        ).encode("ascii"))
        await asyncio.wait_for(writer.drain(), timeout=TLS_TIMEOUT)
        status_line = await asyncio.wait_for(reader.readline(), timeout=TLS_TIMEOUT)
        parts = status_line.decode("ascii", errors="replace").strip().split(" ", 2)
        status = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        _log(
            "direct_http", family=row["family"], ip=row["ip"],
            result="PASS" if status is not None else "FAIL", status=status,
            elapsedMs=round((time.monotonic() - http_started) * 1000))
    except Exception as error:  # sanitized below
        _log(
            "tls_handshake", family=row["family"], ip=row["ip"], result="FAIL",
            elapsedMs=round((time.monotonic() - started) * 1000),
            sni=TARGET_HOST, errorClass=_error_class(error))
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


async def _external_tls(host):
    started = time.monotonic()
    writer = None
    try:
        _reader, writer = await asyncio.wait_for(
            asyncio.open_connection(
                host, 443, ssl=ssl.create_default_context(), server_hostname=host),
            timeout=TLS_TIMEOUT)
        _log(
            "external_tls", host=host, result="PASS",
            elapsedMs=round((time.monotonic() - started) * 1000))
    except Exception as error:  # sanitized below
        _log(
            "external_tls", host=host, result="FAIL",
            elapsedMs=round((time.monotonic() - started) * 1000),
            errorClass=_error_class(error))
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


async def _public_dns(resolver, base_url):
    output = {"A": [], "AAAA": []}
    timeout = httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
            for record_type in ("A", "AAAA"):
                response = await client.get(
                    base_url, params={"name": TARGET_HOST, "type": record_type},
                    headers={"Accept": "application/dns-json"})
                response.raise_for_status()
                body = response.json()
                for answer in body.get("Answer", []):
                    value = answer.get("data")
                    try:
                        address = ipaddress.ip_address(value)
                    except ValueError:
                        continue
                    if ((record_type == "A" and address.version == 4)
                            or (record_type == "AAAA" and address.version == 6)):
                        output[record_type].append(str(address))
        _log(
            "public_dns", resolver=resolver, result="PASS",
            A=sorted(set(output["A"])), AAAA=sorted(set(output["AAAA"])))
    except Exception as error:  # sanitized below
        _log("public_dns", resolver=resolver, result="FAIL", errorClass=_error_class(error))


async def _httpx_host_test():
    started = time.monotonic()
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            response = await client.get(f"https://{TARGET_HOST}/wp-json/")
        _log(
            "httpx", result="PASS", status=response.status_code,
            elapsedMs=round((time.monotonic() - started) * 1000))
    except Exception as error:  # sanitized below
        _log(
            "httpx", result="FAIL", errorClass=_error_class(error),
            elapsedMs=round((time.monotonic() - started) * 1000))


async def run_network_diagnostic():
    """Run once from Render and emit no secrets or customer data."""
    proxy_names = ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY")
    _log("start", proxyEnvironment={name: bool(os.getenv(name)) for name in proxy_names})
    try:
        rows = await _resolve_system()
    except Exception as error:  # sanitized below
        _log("system_dns", result="FAIL", errorClass=_error_class(error))
        rows = []
    for row in rows:
        connected = await _connect_ip(row)
        if connected:
            await _tls_and_http(row)
    for host in ("www.google.com", "api.github.com", "www.cloudflare.com"):
        await _external_tls(host)
    await _public_dns("cloudflare", "https://cloudflare-dns.com/dns-query")
    await _public_dns("google", "https://dns.google/resolve")
    await _httpx_host_test()
    _log("complete")
