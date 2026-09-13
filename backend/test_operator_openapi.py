import json
from pathlib import Path

from fastapi import FastAPI

from export_operator_openapi import contract
from operator_api import create_router


def test_export_matches_routes_and_has_only_operator_endpoints():
    document = contract()
    app = FastAPI()
    app.include_router(create_router(None))
    actual = {(route.path.replace("{product_id}", "{id}"), method.lower())
              for route in app.routes if route.path.startswith("/api/operator/v1/")
              for method in route.methods}
    exported = {(path, method) for path, operations in document["paths"].items() for method in operations}
    assert exported == actual
    assert {op["operationId"] for ops in document["paths"].values() for op in ops.values()} == {
        "getStatus", "getProducts", "getProduct", "updateProduct", "getAudit"}
    assert document["components"]["securitySchemes"]["OperatorBearer"] == {"type": "http", "scheme": "bearer"}
    assert all(op["security"] == [{"OperatorBearer": []}]
               for ops in document["paths"].values() for op in ops.values())
    assert document["components"]["schemas"]["Rename"]["additionalProperties"] is False
    assert document == json.loads(Path(__file__).with_name("operator-openapi.json").read_text())
