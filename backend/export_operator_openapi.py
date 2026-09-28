"""Export the integration contract without loading deployment secrets or MongoDB."""
import json
from pathlib import Path
from typing import Any

from operator_api import Rename


def contract():
    error = {
        "type": "object", "required": ["error"],
        "properties": {"error": {"type": "string"},
                       "operation_id": {"type": "string", "format": "uuid"},
                       "verified": {"type": "boolean"}},
    }
    product = {
        "type": "object", "required": ["id", "name", "slug", "status", "type", "version"],
        "properties": {
            "id": {"type": "integer"}, "name": {"type": "string"},
            "slug": {"type": "string"}, "status": {"type": "string"},
            "type": {"type": "string"},
            "version": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
        },
    }
    ref = {"$ref": "#/components/schemas/Product"}
    patch_result = {
        "type": "object", "required": ["operation_id", "verified"],
        "properties": {"operation_id": {"type": "string", "format": "uuid"},
                       "verified": {"type": "boolean"}, "product": ref,
                       "error": {"type": "string"}},
    }
    audit_record = {
        "type": "object", "properties": {
            "operation_id": {"type": "string", "format": "uuid"},
            "product_id": {"type": "integer"}, "reason": {"type": "string"},
            "actor": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"},
            "state": {"type": "string"},
            "before": {"anyOf": [ref, {"type": "null"}]},
            "after": {"anyOf": [ref, {"type": "null"}]},
            "http_status": {"type": "integer"}, "result": patch_result,
        },
    }
    schemas = {
        "Product": product, "Error": error, "Rename": Rename.model_json_schema(),
        "Status": {"type": "object", "required": ["status", "audit", "woocommerce", "writes_enabled"],
                   "properties": {"status": {"type": "string"}, "audit": {"type": "string"},
                                  "woocommerce": {"type": "string"}, "writes_enabled": {"type": "boolean"}}},
        "Products": {"type": "object", "properties": {
            "products": {"type": "array", "items": ref}, "page": {"type": "integer"},
            "per_page": {"type": "integer"}, "total": {"type": "integer"},
            "total_pages": {"type": "integer"}, "next_page": {"type": ["integer", "null"]}}},
        "PatchResult": patch_result,
        "Audit": {"type": "object", "properties": {
            "operations": {"type": "array", "items": audit_record},
            "page": {"type": "integer"}, "per_page": {"type": "integer"}}},
        "PrintfulStatus": {"type": "object", "required": [
            "ok", "productTemplatesRead", "syncProductsRead"], "properties": {
                "ok": {"type": "boolean"}, "productTemplatesRead": {"type": "boolean"},
                "syncProductsRead": {"type": "boolean"},
                "errors": {"type": "object", "additionalProperties": {"type": "string"}}}},
        "PrintfulTemplate": {"type": "object", "required": [
            "id", "title", "catalogProductId", "externalProductId", "availableVariantIds",
            "colors", "sizes", "mockupUrl", "placements", "createdAt", "updatedAt"],
            "properties": {
                "id": {"type": "integer"}, "title": {"type": "string"},
                "catalogProductId": {"type": ["integer", "null"]},
                "externalProductId": {"type": ["string", "null"]},
                "availableVariantIds": {"type": "array", "items": {"type": "integer"}},
                "colors": {"type": "array", "items": {"type": "object"}},
                "sizes": {"type": "array", "items": {}},
                "mockupUrl": {"type": ["string", "null"]},
                "placements": {"type": "array", "items": {"type": "object"}},
                "createdAt": {"type": ["string", "null"]},
                "updatedAt": {"type": ["string", "null"]}}},
        "PrintfulTemplateList": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/PrintfulTemplate"}},
            "limit": {"type": "integer"}, "offset": {"type": "integer"},
            "total": {"type": ["integer", "null"]}}},
        "PrintfulMockup": {"type": "object", "required": [
            "url", "placement", "position", "color", "variantIds", "type"],
            "properties": {
                "url": {"type": "string"}, "placement": {"type": ["string", "null"]},
                "position": {"type": ["string", "null"]}, "color": {"type": ["string", "null"]},
                "variantIds": {"type": "array", "items": {"type": "integer"}},
                "type": {"type": ["string", "null"]}}},
        "PrintfulTemplateDetail": {"allOf": [
            {"$ref": "#/components/schemas/PrintfulTemplate"},
            {"type": "object", "required": ["mockups"], "properties": {
                "mockups": {"type": "array", "items": {
                    "$ref": "#/components/schemas/PrintfulMockup"}}}}]},
        "MockupStyleCandidate": {"type": "object", "required": [
            "id", "category", "view", "restrictedVariantIds"], "properties": {
                "id": {"type": "integer"}, "category": {"type": ["string", "null"]},
                "view": {"type": ["string", "null"]},
                "restrictedVariantIds": {"type": "array", "items": {"type": "integer"}}}},
        "MockupStyles": {"type": "object", "properties": {
            "templateId": {"type": "integer"}, "availableVariantIds": {"type": "array", "items": {"type": "integer"}},
            "colors": {"type": "array", "items": {"type": "object"}},
            "placements": {"type": "array", "items": {"type": "object"}},
            "templatePlacements": {"type": "array", "items": {"type": "string"}},
            "stylesByPlacement": {"type": "object", "additionalProperties": {
                "type": "array", "items": {"$ref": "#/components/schemas/MockupStyleCandidate"}}},
            "styles": {"type": "array", "items": {"type": "object"}}}},
        "MockupPlan": {"type": "object", "properties": {
            "planId": {"type": "string", "format": "uuid"},
            "templateId": {"type": "integer"}, "product": {"type": "object"},
            "selectedRepresentativeVariants": {"type": "array", "items": {"type": "object"}},
            "colors": {"type": "array", "items": {"type": ["string", "null"]}},
            "templatePlacements": {"type": "array", "items": {"type": "string"}},
            "supportedStylesByPlacement": {"type": "object", "additionalProperties": {
                "type": "array", "items": {"$ref": "#/components/schemas/MockupStyleCandidate"}}},
            "recommendedCandidateStylesByPlacement": {"type": "object", "additionalProperties": {
                "type": "array", "items": {"$ref": "#/components/schemas/MockupStyleCandidate"}}},
            "plannedMockupStyleIds": {"type": "array", "items": {"type": "integer"}},
            "estimatedGeneratedFiles": {"type": "integer"},
            "plannedTaskCount": {"type": "integer"},
            "placements": {"type": "array", "items": {"type": "string"}},
            "requestedStyles": {"type": "array", "items": {"type": "object"}},
            "estimatedTaskCount": {"type": "integer"}}},
        "MockupPlanSelection": {"type": "object", "required": ["variantIds", "styleIds"],
                                "additionalProperties": False, "properties": {
                                    "variantIds": {"type": "array", "minItems": 1,
                                                   "maxItems": 20, "uniqueItems": True,
                                                   "items": {"type": "integer", "minimum": 1}},
                                    "styleIds": {"type": "array", "minItems": 1,
                                                 "maxItems": 50, "uniqueItems": True,
                                                 "items": {"type": "integer", "minimum": 1}}}},
        "MockupRequest": {"type": "object", "required": ["planId"],
                          "additionalProperties": False, "properties": {
                              "planId": {"type": "string", "format": "uuid"}}},
        "MockupTaskCreated": {"type": "object", "properties": {
            "templateId": {"type": "integer"}, "planId": {"type": "string", "format": "uuid"},
            "taskKeys": {"type": "array", "items": {"type": "integer"}},
            "status": {"type": "string"},
            "requestedVariants": {"type": "array", "items": {"type": "object"}},
            "requestedStyles": {"type": "array", "items": {"type": "object"}}}},
        "MockupTaskOutput": {"type": "object", "properties": {
            "url": {"type": "string", "format": "uri"},
            "variantId": {"type": "integer"},
            "designPlacement": {"type": ["string", "null"]},
            "mockupStyleId": {"type": "integer"},
            "mockupStyleName": {"type": ["string", "null"]},
            "mockupViewName": {"type": ["string", "null"]},
            "technique": {"type": ["string", "null"]},
            "dimensions": {"type": ["object", "null"]},
            "extraUpstreamOutput": {"type": "boolean"}}},
        "MockupTask": {"type": "object", "properties": {
            "id": {"type": "integer"}, "status": {"type": "string"},
            "failed": {"type": "boolean"},
            "resultStatus": {"type": ["string", "null"], "enum": [
                "PASS", "PASS_WITH_EXTRA_OUTPUT", "FAIL", None]},
            "requestedStylesPresent": {"type": "boolean"},
            "missingStyleIds": {"type": "array", "items": {"type": "integer"}},
            "extraStyleIds": {"type": "array", "items": {"type": "integer"}},
            "validationErrors": {"type": "array", "items": {"type": "string"}},
            "mockups": {"type": "array", "items": {
                "$ref": "#/components/schemas/MockupTaskOutput"}},
            "editorialRecommendation": {"type": ["object", "null"]}}},
        "PrintfulSyncProduct": {"type": "object", "required": [
            "syncProductId", "externalId", "name", "variantCount", "syncedCount",
            "thumbnailUrl", "ignored", "variants"], "properties": {
                "syncProductId": {"type": "integer"}, "externalId": {"type": ["string", "null"]},
                "name": {"type": "string"}, "variantCount": {"type": "integer"},
                "syncedCount": {"type": ["integer", "null"]},
                "thumbnailUrl": {"type": ["string", "null"]},
                "ignored": {"type": ["boolean", "null"]},
                "variants": {"type": "array", "items": {"type": "object"}}}},
        "PrintfulSyncProductList": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/PrintfulSyncProduct"}},
            "limit": {"type": "integer"}, "offset": {"type": "integer"},
            "total": {"type": ["integer", "null"]}}},
    }
    pagination = [{"name": name, "in": "query", "schema": {
        "type": "integer", "minimum": 1, "maximum": maximum, "default": default}}
        for name, maximum, default in [("page", 100000, 1), ("per_page", 100, 20)]]
    identifier = [{"name": "id", "in": "path", "required": True,
                   "schema": {"type": "integer", "minimum": 1, "maximum": 2147483647}}]
    printful_pagination = [{"name": name, "in": "query", "schema": {
        "type": "integer", "minimum": minimum, "maximum": maximum, "default": default}}
        for name, minimum, maximum, default in [
            ("limit", 1, 100, 20), ("offset", 0, 1000000, 0)]]
    paths: dict[str, dict[str, dict[str, Any]]] = {}
    for suffix, method, operation_id, response, parameters in [
        ("/status", "get", "getStatus", "Status", []),
        ("/products", "get", "getProducts", "Products", pagination),
        ("/products/{id}", "get", "getProduct", "Product", identifier),
        ("/products/{id}", "patch", "updateProduct", "PatchResult", identifier),
        ("/audit", "get", "getAudit", "Audit", pagination),
        ("/printful/status", "get", "getPrintfulStatus", "PrintfulStatus", []),
        ("/printful/templates", "get", "getPrintfulTemplates", "PrintfulTemplateList", printful_pagination),
        ("/printful/templates/{id}", "get", "getPrintfulTemplate", "PrintfulTemplateDetail", identifier),
        ("/printful/templates/{id}/mockup-styles", "get", "getPrintfulMockupStyles", "MockupStyles", identifier),
        ("/printful/templates/{id}/mockup-tasks/dry-run", "post", "createPrintfulMockupPlan", "MockupPlan", identifier),
        ("/printful/templates/{id}/mockup-tasks", "post", "createPrintfulMockupTask", "MockupTaskCreated", identifier),
        ("/printful/mockup-tasks/{id}", "get", "getPrintfulMockupTask", "MockupTask", identifier),
        ("/printful/sync-products", "get", "getPrintfulSyncProducts",
         "PrintfulSyncProductList", printful_pagination),
        ("/printful/sync-products/{id}", "get", "getPrintfulSyncProduct",
         "PrintfulSyncProduct", identifier),
    ]:
        operation: dict[str, Any] = {
            "operationId": operation_id, "security": [{"OperatorBearer": []}],
            "parameters": parameters,
            "responses": {"200": {"description": "Success", "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/" + response}}}}},
        }
        for code, description in {
            "400": "Invalid input", "401": "Unauthorized", "403": "Writes disabled",
            "404": "Product not found", "409": "Version conflict, idempotency conflict or operation busy",
            "413": "Body too large", "502": "WooCommerce or verification error",
            "503": "Not configured, unavailable or uncertain outcome",
        }.items():
            operation["responses"][code] = {"description": description, "content": {
                "application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        if method == "patch":
            operation["description"] = (
                "Rename only. Production writes must remain disabled. Uses expected_version from GET, "
                "reason and idempotency_key. No other WooCommerce fields are accepted. "
                "An uncertain operation must not be retried with a different key. "
                "External WordPress edits are not protected by an atomic compare-and-swap.")
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/Rename"}}}}
        if operation_id == "createPrintfulMockupPlan":
            operation["description"] = ("Build and audit an AW26 representative-color mockup plan using only "
                                        "Printful GET requests. An optional exact variant/style selection is "
                                        "validated against the template. It never creates a Printful task.")
            operation["requestBody"] = {"required": False, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/MockupPlanSelection"}}}}
        if operation_id == "createPrintfulMockupTask":
            operation["description"] = ("Generate images for one existing Printful template. Requires the separate "
                                        "PRINTFUL_MOCKUP_GENERATION_ENABLED flag and a prior dry-run plan; "
                                        "does not publish products.")
            operation["requestBody"] = {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/MockupRequest"}}}}
        paths.setdefault("/api/operator/v1" + suffix, {})[method] = operation
    return {
        "openapi": "3.1.0", "info": {
            "title": "LOCK CITY Operator API", "version": "1.0.0",
            "description": "Digital Administrator contract. Supply Bearer credentials separately; never in this file."},
        "servers": [{"url": "https://lock-city-operator-api.onrender.com"}],
        "security": [{"OperatorBearer": []}], "paths": paths,
        "components": {"securitySchemes": {"OperatorBearer": {"type": "http", "scheme": "bearer"}},
                       "schemas": schemas},
    }


if __name__ == "__main__":
    Path(__file__).with_name("operator-openapi.json").write_text(
        json.dumps(contract(), indent=2) + "\n", encoding="utf-8")
