from fastapi import FastAPI, APIRouter, Request, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import hashlib
import hmac
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ── WooCommerce webhooks ─────────────────────────────────────
# Validates X-WC-Webhook-Signature (base64 HMAC-SHA256 of the raw body),
# persists each delivery once (idempotent via unique delivery_id), and
# stores only metadata here — full order sync happens server-side via the
# authenticated REST API later. Returns 503 until WC_WEBHOOK_SECRET is set.

WC_WEBHOOK_SECRET = os.environ.get('WC_WEBHOOK_SECRET')
ALLOWED_WC_TOPICS = {
    "order.created",
    "order.updated",
    "product.updated",
    "customer.created",
    "customer.updated",
}


@app.on_event("startup")
async def create_webhook_index():
    await db.webhook_events.create_index("delivery_id", unique=True, sparse=True)


@api_router.post("/webhooks/woocommerce")
async def woocommerce_webhook(request: Request):
    if not WC_WEBHOOK_SECRET:
        raise HTTPException(503, "WooCommerce webhook secret is not configured")

    raw = await request.body()
    supplied = request.headers.get("x-wc-webhook-signature", "")
    expected = base64.b64encode(
        hmac.new(WC_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).digest()
    ).decode()
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(401, "Invalid WooCommerce webhook signature")

    topic = request.headers.get("x-wc-webhook-topic", "")
    if topic not in ALLOWED_WC_TOPICS:
        return {"accepted": False, "reason": "ignored topic"}

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON payload")

    delivery_id = request.headers.get("x-wc-delivery-id")
    if delivery_id:
        try:
            await db.webhook_events.insert_one({
                "delivery_id": delivery_id,
                "topic": topic,
                "payload_id": payload.get("id"),
                "received_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as exc:
            if "duplicate" in str(exc).lower():
                return {"accepted": True, "duplicate": True}
            raise HTTPException(500, "Could not persist webhook event")

    logger.info("WooCommerce webhook accepted: %s", topic)
    return {"accepted": True}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()