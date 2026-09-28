"""Printful client for product reviews and isolated mockup generation."""
import os
from datetime import datetime, timezone

import httpx

from operator_api import OperatorError


PRINTFUL_BASE_URL = "https://api.printful.com"
AW26_TEMPLATE_IDS = frozenset({
    79403270,
    100892117,
    105623495,
    105624073,
    106094567,
    106357278,
    106357334,
    106766446,
    106767107,
    107221423,
    107530836,
    107563422,
    107563824,
    107564276,
    107658409,
    107660830,
    107660910,
})

AW26_EDITORIAL_RECOMMENDATIONS = {
    105623495: {
        "primaryStyleId": 27318,
        "galleryStyleIds": [27316, 26784, 27317, 26780],
        "optionalExtraStyleIds": [26783],
    },
}


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


def _safe_validation_text(value):
    if not isinstance(value, str):
        return None
    text = value[:300]
    secrets = [os.getenv(name, "") for name in (
        "PRINTFUL_API_TOKEN", "OPERATOR_API_TOKEN", "DATABASE_URL")]
    if any(secret and secret in text for secret in secrets):
        return "[REDACTED]"
    if "authorization" in text.casefold() or "bearer" in text.casefold():
        return "[REDACTED]"
    return text


def sanitize_printful_validation(response):
    """Return a small allowlisted view of Printful validation errors."""
    try:
        payload = response.json()
    except ValueError:
        return None
    root = payload.get("error", payload) if isinstance(payload, dict) else None
    if not isinstance(root, dict):
        return None
    raw_issues = root.get("errors")
    issues = raw_issues if isinstance(raw_issues, list) else [root]
    sanitized = []
    for issue in issues[:10]:
        if not isinstance(issue, dict):
            continue
        item = {}
        for key in ("type", "title", "detail"):
            value = _safe_validation_text(issue.get(key))
            if value:
                item[key] = value
        source = issue.get("source")
        if isinstance(source, dict):
            clean_source = {}
            for key in ("pointer", "parameter", "header"):
                value = _safe_validation_text(source.get(key))
                if value:
                    clean_source[key] = value
            if clean_source:
                item["source"] = clean_source
        valid_values = issue.get("valid_values")
        if isinstance(valid_values, list):
            item["valid_values"] = [value for value in valid_values[:20]
                                    if isinstance(value, (str, int, float, bool))]
        if item:
            sanitized.append(item)
    return sanitized or None


def _variant_ids(raw):
    for key in ("variant_ids", "catalog_variant_ids", "restricted_to_variants"):
        value = raw.get(key)
        if isinstance(value, list):
            return [item for item in value
                    if isinstance(item, int) and not isinstance(item, bool)]
    return []


def template_placement_ids(raw_placements):
    """Return the template placement identifiers in source order."""
    result = []
    for item in _list(raw_placements):
        value = item if isinstance(item, str) else item.get("placement") if isinstance(item, dict) else None
        if isinstance(value, str) and value and value not in result:
            result.append(value)
    return result


def _public_style(style):
    return {
        "id": style["id"],
        "category": style.get("category"),
        "view": style.get("view"),
        "restrictedVariantIds": list(style.get("variantIds") or []),
    }


def group_styles_by_placement(styles, placements):
    """Group only real template placements without manufacturing missing styles."""
    grouped = {placement: [] for placement in placements}
    for style in styles:
        placement = style.get("placement") if isinstance(style, dict) else None
        if placement in grouped:
            grouped[placement].append(_public_style(style))
    return grouped


def _style_priority(placement, style):
    text = " ".join(str(style.get(key) or "").casefold()
                    for key in ("category", "view"))
    if placement == "front":
        priorities = ("model", "3d", "ghost", "front")
    elif placement == "back":
        priorities = ("model", "ghost", "back")
    elif "sleeve" in placement:
        priorities = ("model", "ghost", "sleeve", "detail")
    else:
        priorities = ("model", "3d", "ghost", placement, "detail")
    first_match = next((index for index, keyword in enumerate(priorities)
                        if keyword in text), len(priorities))
    return (1 if "flat" in text else 0, first_match, style["id"])


def recommend_styles_by_placement(grouped, representative_variants):
    """Keep every compatible candidate, ordered for editorial review."""
    selected_ids = {variant["id"] for variant in representative_variants}
    result = {}
    for placement, styles in grouped.items():
        compatible = []
        for style in styles:
            restrictions = set(style.get("restrictedVariantIds") or [])
            if not restrictions or selected_ids.intersection(restrictions):
                compatible.append(style)
        result[placement] = sorted(compatible, key=lambda style: _style_priority(placement, style))
    return result


def plan_mockup_batches(representative_variants, styles):
    """Group styles that can share one Printful task by compatible variant set."""
    variant_ids = [variant["id"] for variant in representative_variants]
    batches = {}
    for style in styles:
        restrictions = set(style.get("restrictedVariantIds") or style.get("variantIds") or [])
        compatible = tuple(variant_id for variant_id in variant_ids
                           if not restrictions or variant_id in restrictions)
        if not compatible:
            continue
        style_ids = batches.setdefault(compatible, [])
        if style["id"] not in style_ids:
            style_ids.append(style["id"])
    return [{"variantIds": list(variants), "styleIds": style_ids}
            for variants, style_ids in batches.items()]


def normalize_mockup_task_result(raw, task_id, context, supported_styles):
    """Validate completed upstream output against its stored, authorized plan."""
    requested_ids = {style["id"] for style in _list(context.get("styles"))
                     if isinstance(style, dict) and isinstance(style.get("id"), int)}
    authorized_variants = {variant["id"] for variant in _list(context.get("variants"))
                           if isinstance(variant, dict)
                           and isinstance(variant.get("id"), int)}
    metadata = {}
    for style in _list(supported_styles):
        if isinstance(style, dict) and isinstance(style.get("id"), int):
            metadata.setdefault(style["id"], style)

    errors = []
    if raw.get("id") != task_id:
        errors.append("WRONG_TASK")
    upstream_template = raw.get("templateId")
    if (upstream_template is not None
            and upstream_template != context.get("template_id")):
        errors.append("WRONG_TEMPLATE")

    normalized = []
    returned_ids = set()
    for item in _list(raw.get("mockups")):
        if not isinstance(item, dict):
            errors.append("INVALID_OUTPUT")
            continue
        style_id = item.get("styleId")
        variant_id = item.get("variantId")
        returned_ids.add(style_id)
        style = metadata.get(style_id)
        if style is None:
            errors.append("UNSUPPORTED_EXTRA_STYLE" if style_id not in requested_ids
                          else "UNSUPPORTED_REQUESTED_STYLE")
        if variant_id not in authorized_variants:
            errors.append("WRONG_VARIANT")
        normalized.append({
            "url": item.get("url"),
            "variantId": variant_id,
            "designPlacement": item.get("placement"),
            "mockupStyleId": style_id,
            "mockupStyleName": style.get("category") if style else None,
            "mockupViewName": style.get("view") if style else None,
            "technique": item.get("technique"),
            "dimensions": item.get("dimensions"),
            "extraUpstreamOutput": style_id not in requested_ids,
        })

    missing = sorted(requested_ids - returned_ids)
    extras = sorted(style_id for style_id in returned_ids - requested_ids
                    if isinstance(style_id, int))
    if missing:
        errors.append("MISSING_REQUESTED_STYLE")
    if raw.get("failed"):
        errors.append("UPSTREAM_TASK_FAILED")

    completed = raw.get("status") == "completed"
    result_status = None
    if completed:
        if errors:
            result_status = "FAIL"
        elif extras:
            result_status = "PASS_WITH_EXTRA_OUTPUT"
        else:
            result_status = "PASS"

    return {
        **raw,
        "mockups": normalized,
        "resultStatus": result_status,
        "requestedStylesPresent": not missing,
        "missingStyleIds": missing,
        "extraStyleIds": extras,
        "validationErrors": list(dict.fromkeys(errors)),
    }


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


def normalize_catalog_variant(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
    return {
        "id": raw["id"],
        "color": _text(raw.get("color")),
        "size": _text(raw.get("size")),
    }


def select_representative_variants(available_variant_ids, catalog_variants):
    """Choose M, then S, then the first available size for each color."""
    allowed = set(available_variant_ids)
    groups = {}
    for index, raw in enumerate(catalog_variants):
        variant = normalize_catalog_variant(raw)
        if variant["id"] not in allowed:
            continue
        key = variant["color"].strip().casefold() if variant["color"] else "__unspecified__"
        groups.setdefault(key, []).append((index, variant))
    if not groups:
        raise OperatorError(422, "TEMPLATE_HAS_NO_SELECTABLE_VARIANTS")

    def rank(item):
        index, variant = item
        size = variant["size"].strip().upper() if variant["size"] else ""
        return ({"M": 0, "S": 1}.get(size, 2), index)

    return [min(variants, key=rank)[1] for variants in groups.values()]


def select_review_styles(styles, representative_variant_ids, limit=10):
    """Cover supported placements and useful editorial views without inventing styles."""
    variants = set(representative_variant_ids)
    unique = {}
    for style in styles:
        if not isinstance(style, dict) or not isinstance(style.get("id"), int):
            continue
        restrictions = set(style.get("variantIds") or [])
        if restrictions and not variants.issubset(restrictions):
            continue
        unique.setdefault(style["id"], style)
    eligible = list(unique.values())
    if not eligible:
        raise OperatorError(422, "NO_COMPATIBLE_MOCKUP_STYLES")

    keywords = ("lifestyle", "model", "3/4", "three-quarter", "side",
                "left", "right", "sleeve", "embroidery")

    def editorial_score(style):
        text = " ".join(str(style.get(key) or "").casefold()
                        for key in ("category", "view", "placement"))
        return sum(1 for keyword in keywords if keyword in text)

    selected = []
    placements = []
    for style in eligible:
        placement = style.get("placement") or "unspecified"
        if placement not in placements:
            placements.append(placement)
    for placement in placements:
        candidates = [style for style in eligible
                      if (style.get("placement") or "unspecified") == placement]
        selected.append(max(candidates, key=editorial_score))
    for style in sorted(eligible, key=editorial_score, reverse=True):
        if editorial_score(style) and style not in selected:
            selected.append(style)
    return selected[:limit]


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
            details = sanitize_printful_validation(response) if response.status_code == 400 else None
            raise OperatorError(status, code, details)
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

    async def mockup_styles(self, template_id, template=None):
        template = template or await self.template(template_id)
        product_id = template["catalogProductId"]
        if not product_id:
            raise OperatorError(422, "TEMPLATE_HAS_NO_CATALOG_PRODUCT")
        placements = template_placement_ids(template["placements"])
        styles = []
        # Query placements independently. Printful may return identical style IDs for
        # several placements; the request filter is therefore the reliable source of
        # provenance and must not be collapsed into one mixed response.
        for requested_placement in placements:
            offset = 0
            while True:
                payload = await self.get(f"/v2/catalog-products/{product_id}/mockup-styles",
                                         {"placements": requested_placement,
                                          "limit": 100, "offset": offset})
                page = payload.get("data")
                if not isinstance(page, list):
                    raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
                for placement_group in page:
                    if not isinstance(placement_group, dict):
                        continue
                    for style in _list(placement_group.get("mockup_styles")):
                        if not isinstance(style, dict) or not isinstance(style.get("id"), int):
                            continue
                        styles.append({"id": style["id"], "placement": requested_placement,
                                       "displayName": placement_group.get("display_name"),
                                       "category": style.get("category_name"),
                                       "view": style.get("view_name"),
                                       "variantIds": _variant_ids(style)})
                paging = payload.get("paging")
                total = paging.get("total") if isinstance(paging, dict) else None
                offset += len(page)
                if not page or not isinstance(total, int) or offset >= total:
                    break
                if offset >= 1000:
                    raise OperatorError(502, "PRINTFUL_TOO_MANY_STYLES")
        grouped = group_styles_by_placement(styles, placements)
        return {"templateId": template_id, "availableVariantIds": template["availableVariantIds"],
                "colors": template["colors"], "placements": template["placements"],
                "templatePlacements": placements, "stylesByPlacement": grouped, "styles": styles}

    async def catalog_variants(self, catalog_product_id):
        variants = []
        offset = 0
        while True:
            payload = await self.get(
                f"/v2/catalog-products/{catalog_product_id}/catalog-variants",
                {"limit": 100, "offset": offset},
            )
            page = payload.get("data")
            if not isinstance(page, list):
                raise OperatorError(502, "INVALID_PRINTFUL_RESPONSE")
            variants.extend(page)
            paging = payload.get("paging")
            total = paging.get("total") if isinstance(paging, dict) else None
            offset += len(page)
            if not page or not isinstance(total, int) or offset >= total:
                break
            if offset >= 1000:
                raise OperatorError(502, "PRINTFUL_TOO_MANY_VARIANTS")
        return variants

    async def mockup_plan(self, template_id, requested_variant_ids=None, requested_style_ids=None):
        template = await self.template(template_id)
        product_id = template["catalogProductId"]
        if not product_id:
            raise OperatorError(422, "TEMPLATE_HAS_NO_CATALOG_PRODUCT")
        catalog_variants = await self.catalog_variants(product_id)
        if requested_variant_ids is None:
            variants = select_representative_variants(
                template["availableVariantIds"], catalog_variants)
        else:
            available = set(template["availableVariantIds"])
            normalized = {item["id"]: normalize_catalog_variant(item)
                          for item in catalog_variants if isinstance(item, dict)
                          and isinstance(item.get("id"), int)}
            if (not requested_variant_ids or not set(requested_variant_ids).issubset(available)
                    or any(variant_id not in normalized for variant_id in requested_variant_ids)):
                raise OperatorError(400, "INVALID_TEMPLATE_VARIANTS")
            variants = [normalized[variant_id] for variant_id in requested_variant_ids]
        capabilities = await self.mockup_styles(template_id, template)
        grouped = capabilities["stylesByPlacement"]
        recommended = recommend_styles_by_placement(grouped, variants)
        planned_styles = [style for placement in capabilities["templatePlacements"]
                          for style in recommended[placement]]
        if requested_style_ids is not None:
            available_style_ids = {style["id"] for style in planned_styles}
            if (not requested_style_ids
                    or not set(requested_style_ids).issubset(available_style_ids)):
                raise OperatorError(400, "INVALID_MOCKUP_STYLES")
            requested_order = {style_id: index for index, style_id in enumerate(requested_style_ids)}
            planned_styles = [style for style in planned_styles
                              if style["id"] in requested_order]
            planned_styles.sort(key=lambda style: requested_order[style["id"]])
        if not planned_styles:
            raise OperatorError(422, "NO_COMPATIBLE_MOCKUP_STYLES")
        batches = plan_mockup_batches(variants, planned_styles)
        representative_ids = [variant["id"] for variant in variants]
        estimated_files = sum(
            sum(1 for variant_id in representative_ids
                if not style.get("restrictedVariantIds")
                or variant_id in style["restrictedVariantIds"])
            for style in planned_styles
        )
        planned_style_ids = (list(requested_style_ids) if requested_style_ids is not None
                             else list(dict.fromkeys(style["id"] for style in planned_styles)))
        requested_styles = []
        for style_id in planned_style_ids:
            matches = [(placement, style) for placement, candidates in recommended.items()
                       for style in candidates if style["id"] == style_id]
            sample = matches[0][1]
            requested_styles.append({
                "id": style_id,
                "placement": matches[0][0],
                "placements": [placement for placement, _ in matches],
                "view": sample.get("view"),
                "category": sample.get("category"),
                "restrictedVariantIds": sample.get("restrictedVariantIds") or [],
            })
        return {
            "templateId": template_id,
            "product": {"id": product_id, "name": template["title"]},
            "selectedRepresentativeVariants": variants,
            "colors": [variant["color"] for variant in variants],
            "templatePlacements": capabilities["templatePlacements"],
            "supportedStylesByPlacement": grouped,
            "recommendedCandidateStylesByPlacement": recommended,
            "plannedMockupStyleIds": planned_style_ids,
            "estimatedGeneratedFiles": estimated_files,
            "plannedTaskCount": len(batches),
            # Compatibility fields retained for stored plans and existing clients.
            "placements": capabilities["templatePlacements"],
            "requestedStyles": requested_styles,
            "estimatedTaskCount": len(batches),
        }

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
        payload = await self.get("/v2/mockup-tasks", {"id": task_id},
                                 await self.store_headers())
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
                    dimensions = {key: item[key] for key in (
                        "width", "height", "width_px", "height_px")
                        if isinstance(item.get(key), (int, float))}
                    mockups.append({"url": item["mockup_url"], "variantId": variant.get("catalog_variant_id"),
                                    "placement": item.get("placement"), "view": item.get("display_name"),
                                    "technique": item.get("technique"), "styleId": item.get("style_id"),
                                    "dimensions": dimensions or None})
        return {"id": task.get("id"), "status": task.get("status"), "mockups": mockups,
                "failed": bool(_list(task.get("failure_reasons")))}
