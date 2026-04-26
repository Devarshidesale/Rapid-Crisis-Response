import os
import uuid
from datetime import datetime
from typing import Literal
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore

# ── Load environment variables ──────────────────────────────────
load_dotenv()

# ── Initialize Firebase Admin SDK ───────────────────────────────
service_account_path = os.getenv("SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")

if os.path.exists(service_account_path):
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    print("[OK] Firebase Admin SDK initialized successfully.")
else:
    print(f"[WARN] Service account file not found at '{service_account_path}'. "
          "Running without Firebase -- Firestore calls will fail.")

# ── FastAPI app ─────────────────────────────────────────────────
app = FastAPI(title="CrisisSyncAI", version="1.0.0")

# ── CORS middleware ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "CrisisSyncAI"}


# ── Pydantic models ─────────────────────────────────────────────
class SignalBody(BaseModel):
    type: Literal[
        "IOT_SMOKE", "VISION_CROWD", "VISION_FALL",
        "GUEST_SOS", "VOICE_SOS", "STAFF_WEARABLE"
    ]
    zone: str
    floor: int
    room: str
    raw_confidence: float
    propertyId: str


# ── Signal ingestion ────────────────────────────────────────────
@app.post("/signal/ingest")
async def ingest_signal(body: SignalBody, background_tasks: BackgroundTasks):
    from services.fusion_engine import calculate_vcs

    signal_id = str(uuid.uuid4())
    signal_doc = {
        "id": signal_id,
        "type": body.type,
        "zone": body.zone,
        "floor": body.floor,
        "room": body.room,
        "raw_confidence": body.raw_confidence,
        "propertyId": body.propertyId,
        "timestamp": datetime.now().isoformat(),
    }

    # Write to Firestore /signals
    try:
        db = firestore.client()
        db.collection("signals").document(signal_id).set(signal_doc)
    except Exception as e:
        print(f"[WARN] Firestore write failed: {e}")

    # Kick off VCS calculation in the background
    background_tasks.add_task(calculate_vcs, body.propertyId, body.zone)

    return {"signalId": signal_id, "ok": True}


# ── Incident activation (Gemini tactical plan) ─────────────────
class ActivateBody(BaseModel):
    incidentId: str


async def activate_incident(incident_id: str) -> dict:
    """Fetch incident, call Gemini, write plan back to Firestore."""
    from services.gemini_orchestrator import generate_tactical_plan

    db = firestore.client()
    doc_ref = db.collection("incidents").document(incident_id)
    doc = doc_ref.get()

    if not doc.exists:
        print(f"[WARN] Incident {incident_id} not found in Firestore.")
        return {}

    incident = doc.to_dict()
    plan = generate_tactical_plan(incident)

    # Persist the plan back to the incident document
    doc_ref.update({
        "geminiPlan": plan,
        "updatedAt": datetime.now().isoformat(),
    })

    print(f"[OK] Gemini plan generated for incident {incident_id}")
    return plan


@app.post("/incident/activate")
async def activate_incident_endpoint(body: ActivateBody):
    plan = await activate_incident(body.incidentId)
    return {"incidentId": body.incidentId, "geminiPlan": plan}


# ── Guest check-in model ────────────────────────────────────────
class GuestCheckInBody(BaseModel):
    guestId: str
    lat: float
    lng: float


# ── Evacuation path ─────────────────────────────────────────────
@app.get("/building/evacpath/{incident_id}/{room_id}")
async def get_evacuation_path(incident_id: str, room_id: str):
    from services.graph_router import get_evac_path

    db = firestore.client()
    doc = db.collection("incidents").document(incident_id).get()

    if not doc.exists:
        return {"error": "Incident not found", "path": [], "trapped": True}

    hazard_zone = doc.to_dict().get("zone", "")
    result = get_evac_path(room_id, hazard_zone)
    return result


# ── Guest assembly check-in ─────────────────────────────────────
@app.post("/guest/checkin")
async def guest_checkin(body: GuestCheckInBody):
    db = firestore.client()
    db.collection("guests").document(body.guestId).update({
        "checkInStatus": "SAFE",
        "assemblyCheckIn": {
            "timestamp": datetime.now().isoformat(),
            "lat": body.lat,
            "lng": body.lng,
        },
    })
    return {"ok": True}


# ── Run server ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
