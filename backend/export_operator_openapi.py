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
    }
    pagination = [{"name": name, "in": "query", "schema": {
        "type": "integer", "minimum": 1, "maximum": maximum, "default": default}}
        for name, maximum, default in [("page", 100000, 1), ("per_page", 100, 20)]]
    identifier = [{"name": "id", "in": "path", "required": True,
                   "schema": {"type": "integer", "minimum": 1, "maximum": 2147483647}}]
    paths: dict[str, dict[str, dict[str, Any]]] = {}
    for suffix, method, operation_id, response, parameters in [
        ("/status", "get", "getStatus", "Status", []),
        ("/products", "get", "getProducts", "Products", pagination),
        ("/products/{id}", "get", "getProduct", "Product", identifier),
        ("/products/{id}", "patch", "updateProduct", "PatchResult", identifier),
        ("/audit", "get", "getAudit", "Audit", pagination),
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
