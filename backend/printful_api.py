"""Printful client for product reviews and isolated mockup generation."""
import os
from datetime import datetime, timezone

import httpx

from operator_api import OperatorError


PRINTFUL_BASE_URL = "https://api.printful.com"


def _list(value):
    return value if isinstance(value, list) else []


def _timestamp(value):
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            return datetime.fromtimestamp(value, timezone.utc).isoformat().replace("+00:00", "Z")
        except (OverflowError, OSError, ValueError):
            return None
    return None


def normalize_template(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
    return {
        "id": raw["id"],
        "title": raw.get("title") if isinstance(raw.get("title"), str) else "",
        "catalogProductId": raw.get("product_id") if isinstance(raw.get("product_id"), int) else None,
        "externalProductId": (raw.get("external_product_id")
                              if isinstance(raw.get("external_product_id"), str) else None),
        "availableVariantIds": [value for value in _list(raw.get("available_variant_ids"))
                                if isinstance(value, int) and not isinstance(value, bool)],
        "colors": _list(raw.get("colors")),
        "sizes": _list(raw.get("sizes")),
        "mockupUrl": raw.get("mockup_file_url") if isinstance(raw.get("mockup_file_url"), str) else None,
        "placements": _list(raw.get("placements")),
        "createdAt": _timestamp(raw.get("created_at")),
        "updatedAt": _timestamp(raw.get("updated_at")),
    }


def _text(value):
    return value if isinstance(value, str) and value else None


def _variant_ids(raw):
    for key in ("variant_ids", "catalog_variant_ids", "restricted_to_variants"):
        value = raw.get(key)
        if isinstance(value, list):
            return [item for item in value
                    if isinstance(item, int) and not isinstance(item, bool)]
    return []


def normalize_mockups(raw):
    """Normalize documented and optional template image fields without inventing metadata."""
    candidates = []
    for key in ("mockups", "mockup_files", "images"):
        value = raw.get(key)
        if isinstance(value, list):
            candidates.extend(value)
    primary = raw.get("mockup_file_url")
    if isinstance(primary, str) and primary:
        candidates.append({"url": primary})

    result = []
    seen = set()
    for item in candidates:
        if isinstance(item, str):
            item = {"url": item}
        if not isinstance(item, dict):
            continue
        url = next((_text(item.get(key)) for key in (
            "url", "mockup_url", "image_url", "file_url", "preview_url")
                    if _text(item.get(key))), None)
        if not url or url in seen:
            continue
        seen.add(url)
        result.append({
            "url": url,
            "placement": _text(item.get("placement")) or _text(item.get("placement_id")),
            "position": (_text(item.get("position")) or _text(item.get("view_name"))
                         or _text(item.get("position_name"))),
            "color": (_text(item.get("color")) or _text(item.get("color_name"))
                      or _text(item.get("background_color"))),
            "variantIds": _variant_ids(item),
            "type": (_text(item.get("type")) or _text(item.get("mockup_type"))
                     or _text(item.get("style"))),
        })
    return result


def normalize_template_detail(raw):
    template = normalize_template(raw)
    template["mockups"] = normalize_mockups(raw)
    return template


def normalize_sync_variant(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
    return {
        "syncVariantId": raw["id"],
        "externalId": raw.get("external_id") if isinstance(raw.get("external_id"), str) else None,
        "syncProductId": raw.get("sync_product_id") if isinstance(raw.get("sync_product_id"), int) else None,
        "name": raw.get("name") if isinstance(raw.get("name"), str) else "",
        "synced": raw.get("synced") if isinstance(raw.get("synced"), bool) else None,
        "catalogVariantId": raw.get("variant_id") if isinstance(raw.get("variant_id"), int) else None,
        "retailPrice": raw.get("retail_price") if isinstance(raw.get("retail_price"), str) else None,
        "currency": raw.get("currency") if isinstance(raw.get("currency"), str) else None,
        "files": _list(raw.get("files")),
        "options": _list(raw.get("options")),
        "product": raw.get("product") if isinstance(raw.get("product"), dict) else None,
    }


def normalize_sync_product(raw, variants=None):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
    normalized_variants = [] if variants is None else [normalize_sync_variant(item) for item in _list(variants)]
    return {
        "syncProductId": raw["id"],
        "externalId": raw.get("external_id") if isinstance(raw.get("external_id"), str) else None,
        "name": raw.get("name") if isinstance(raw.get("name"), str) else "",
        "variantCount": raw.get("variants") if isinstance(raw.get("variants"), int) else len(normalized_variants),
        "syncedCount": raw.get("synced") if isinstance(raw.get("synced"), int) else None,
        "thumbnailUrl": raw.get("thumbnail_url") if isinstance(raw.get("thumbnail_url"), str) else None,
        "ignored": raw.get("is_ignored") if isinstance(raw.get("is_ignored"), bool) else None,
        "variants": normalized_variants,
    }


class PrintfulClient:
    """Only mockup task creation may use POST; products and orders are read-only."""

    def __init__(self, transport=None):
        self.transport = transport

    async def get(self, path, params=None, extra_headers=None):
        token = os.getenv("PRINTFUL_API_TOKEN", "")
        if not token:
            raise OperatorError(503, "PRINTFUL_NOT_CONFIGURED")
        try:
            async with httpx.AsyncClient(
                    timeout=httpx.Timeout(15.0, connect=5.0),
                    follow_redirects=False,
                    transport=self.transport) as client:
                headers = {"Authorization": "Bearer " + token, "Accept": "application/json"}
                if extra_headers:
                    headers.update(extra_headers)
                response = await client.get(
                    PRINTFUL_BASE_URL + path,
                    params=params,
                    headers=headers,
                )
        except httpx.HTTPError:
            raise OperatorError(502, "PRINTFUL_UNAVAILABLE") from None

        errors = {
            400: (502, "PRINTFUL_BAD_REQUEST"),
            401: (502, "PRINTFUL_UNAUTHORIZED"),
            403: (502, "PRINTFUL_FORBIDDEN"),
            404: (404, "PRINTFUL_NOT_FOUND"),
            429: (503, "PRINTFUL_RATE_LIMITED"),
        }
        if response.status_code in errors:
            status, code = errors[response.status_code]
            raise OperatorError(status, code)
        if response.status_code >= 500:
            raise OperatorError(502, "PRINTFUL_UNAVAILABLE")
        if not 200 <= response.status_code < 300:
            raise OperatorError(502, "PRINTFUL_ERROR")
        try:
            payload = response.json()
        except ValueError:
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE") from None
        if not isinstance(payload, dict) or payload.get("code") not in (None, 200):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        return payload

    async def store_id(self):
        configured = os.getenv("PRINTFUL_STORE_ID", "").strip()
        if configured:
            if not configured.isascii() or not configured.isdecimal() or int(configured) < 1:
                raise OperatorError(503, "PRINTFUL_STORE_NOT_CONFIGURED")
            return int(configured)
        payload = await self.get("/stores", {"limit": 100, "offset": 0})
        stores = payload.get("result")
        if not isinstance(stores, list):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        valid = [store for store in stores
                 if isinstance(store, dict) and isinstance(store.get("id"), int)]
        woo = [store for store in valid
               if "woocommerce" in str(store.get("type", "")).lower()]
        candidates = woo if len(woo) == 1 else valid
        if len(candidates) != 1:
            raise OperatorError(503, "PRINTFUL_STORE_NOT_CONFIGURED")
        return candidates[0]["id"]

    async def store_headers(self):
        return {"X-PF-Store-Id": str(await self.store_id())}

    async def templates(self, limit, offset):
        payload = await self.get("/product-templates", {"limit": limit, "offset": offset})
        result = payload.get("result")
        items = result.get("items") if isinstance(result, dict) else None
        if not isinstance(items, list):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        paging = payload.get("paging") if isinstance(payload.get("paging"), dict) else {}
        return {
            "items": [normalize_template(item) for item in items],
            "limit": paging.get("limit", limit),
            "offset": paging.get("offset", offset),
            "total": paging.get("total") if isinstance(paging.get("total"), int) else None,
        }

    async def template(self, template_id):
        payload = await self.get(f"/product-templates/{template_id}")
        result = payload.get("result")
        if not isinstance(result, dict):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        return normalize_template_detail(result)

    async def sync_products(self, limit, offset):
        payload = await self.get("/sync/products", {"limit": limit, "offset": offset},
                                 await self.store_headers())
        result = payload.get("result")
        if not isinstance(result, list):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        paging = payload.get("paging") if isinstance(payload.get("paging"), dict) else {}
        return {
            "items": [normalize_sync_product(item) for item in result],
            "limit": paging.get("limit", limit),
            "offset": paging.get("offset", offset),
            "total": paging.get("total") if isinstance(paging.get("total"), int) else None,
        }

    async def sync_product(self, product_id):
        payload = await self.get(f"/sync/products/{product_id}", extra_headers=await self.store_headers())
        result = payload.get("result")
        if not isinstance(result, dict):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        return normalize_sync_product(result.get("sync_product"), result.get("sync_variants"))

    async def mockup_styles(self, template_id):
        template = await self.template(template_id)
        product_id = template["catalogProductId"]
        if not product_id:
            raise OperatorError(422, "TEMPLATE_HAS_NO_CATALOG_PRODUCT")
        styles = []
        offset = 0
        while True:
            payload = await self.get(f"/v2/catalog-products/{product_id}/mockup-styles",
                                     {"limit": 100, "offset": offset})
            page = payload.get("data")
            if not isinstance(page, list):
                raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
            for placement in page:
                if not isinstance(placement, dict):
                    continue
                for style in _list(placement.get("mockup_styles")):
                    if not isinstance(style, dict) or not isinstance(style.get("id"), int):
                        continue
                    styles.append({"id": style["id"], "placement": placement.get("placement"),
                                   "displayName": placement.get("display_name"),
                                   "category": style.get("category_name"), "view": style.get("view_name"),
                                   "variantIds": _variant_ids(style)})
            paging = payload.get("paging")
            total = paging.get("total") if isinstance(paging, dict) else None
            offset += len(page)
            if not page or not isinstance(total, int) or offset >= total:
                break
            if offset >= 1000:
                raise OperatorError(502, "PRINTFUL_TOO_MANY_STYLES")
        return {"templateId": template_id, "availableVariantIds": template["availableVariantIds"],
                "colors": template["colors"], "placements": template["placements"], "styles": styles}

    async def create_mockup_task(self, template_id, variant_ids, style_ids):
        template = await self.template(template_id)
        allowed = set(template["availableVariantIds"])
        if not allowed or not set(variant_ids).issubset(allowed):
            raise OperatorError(400, "INVALID_TEMPLATE_VARIANTS")
        # Validate styles against this catalog product before scheduling work.
        available = await self.mockup_styles(template_id)
        selected = [style for style in available["styles"] if style["id"] in style_ids]
        if set(style_ids) != {style["id"] for style in selected}:
            raise OperatorError(400, "INVALID_MOCKUP_STYLES")
        if any(style["variantIds"] and not set(variant_ids).issubset(style["variantIds"])
               for style in selected):
            raise OperatorError(400, "INCOMPATIBLE_MOCKUP_STYLES")
        token = os.getenv("PRINTFUL_API_TOKEN", "")
        if not token:
            raise OperatorError(503, "PRINTFUL_NOT_CONFIGURED")
        body = {"format": "jpg", "mockup_width_px": 1000, "products": [{
            "source": "product_template", "product_template_id": template_id,
            "catalog_variant_ids": variant_ids, "mockup_style_ids": style_ids}]}
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=5.0),
                                         follow_redirects=False, transport=self.transport) as client:
                response = await client.post(PRINTFUL_BASE_URL + "/v2/mockup-tasks", json=body,
                                             headers={"Authorization": "Bearer " + token,
                                                      "Accept": "application/json",
                                                      "X-PF-Store-Id": str(await self.store_id())})
        except httpx.HTTPError:
            raise OperatorError(502, "PRINTFUL_UNAVAILABLE") from None
        errors = {
            400: (502, "PRINTFUL_MOCKUP_REQUEST_REJECTED"),
            401: (502, "PRINTFUL_UNAUTHORIZED"),
            403: (502, "PRINTFUL_FORBIDDEN"),
            404: (404, "PRINTFUL_NOT_FOUND"),
            429: (503, "PRINTFUL_RATE_LIMITED"),
        }
        if response.status_code in errors:
            status, code = errors[response.status_code]
            raise OperatorError(status, code)
        if response.status_code >= 500:
            raise OperatorError(502, "PRINTFUL_UNAVAILABLE")
        if not 200 <= response.status_code < 300:
            raise OperatorError(502, "PRINTFUL_MOCKUP_GENERATION_FAILED")
        try:
            data = response.json().get("data")
        except (ValueError, AttributeError):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE") from None
        if (not isinstance(data, list) or not data or not isinstance(data[0], dict)
                or not isinstance(data[0].get("id"), int)):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        ids = [item["id"] for item in data if isinstance(item, dict)
               and isinstance(item.get("id"), int)]
        return {"templateId": template_id, "taskIds": ids}

    async def mockup_task(self, task_id):
        payload = await self.get("/v2/mockup-tasks", {"id": task_id})
        data = payload.get("data")
        if not isinstance(data, list) or not data or not isinstance(data[0], dict):
            raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
        task = data[0]
        mockups = []
        for variant in _list(task.get("catalog_variant_mockups")):
            if not isinstance(variant, dict):
                continue
            for item in _list(variant.get("mockups")):
                if isinstance(item, dict) and _text(item.get("mockup_url")):
                    mockups.append({"url": item["mockup_url"], "variantId": variant.get("catalog_variant_id"),
                                    "placement": item.get("placement"), "view": item.get("display_name"),
                                    "technique": item.get("technique"), "styleId": item.get("style_id")})
        return {"id": task.get("id"), "status": task.get("status"), "mockups": mockups,
                "failed": bool(_list(task.get("failure_reasons")))}
