from datetime import datetime, timedelta
from firebase_admin import firestore

# ── Signal type weights (each type counted ONCE) ────────────────
SIGNAL_WEIGHTS = {
    "IOT_SMOKE":       30,
    "VISION_CROWD":    25,
    "VISION_FALL":     35,
    "GUEST_SOS":       20,
    "VOICE_SOS":       25,
    "STAFF_WEARABLE":  30,
}


def _get_ui_color(vcs: int) -> str:
    """Map VCS score to a dashboard color."""
    if vcs < 40:
        return "BLUE"
    if vcs < 85:
        return "AMBER"
    return "RED"


def calculate_vcs(property_id: str, zone: str) -> None:
    """
    Fetch recent signals for a property+zone, compute the
    Verification Confidence Score, and upsert the matching incident.
    Called as a FastAPI BackgroundTask (sync function is fine).
    """
    db = firestore.client()
    cutoff = (datetime.now() - timedelta(seconds=60)).isoformat()

    # ── 1. Fetch signals from last 60 seconds ──────────────────
    signals_ref = (
        db.collection("signals")
        .where("propertyId", "==", property_id)
        .where("zone", "==", zone)
        .where("timestamp", ">=", cutoff)
        .stream()
    )

    # ── 2. Deduplicate by type and sum weights ─────────────────
    seen_types: set[str] = set()
    signal_ids: list[str] = []

    for doc in signals_ref:
        data = doc.to_dict()
        signal_ids.append(data["id"])
        seen_types.add(data["type"])

    total = sum(SIGNAL_WEIGHTS.get(t, 0) for t in seen_types)
    total = min(total, 100)  # cap at 100
    ui_color = _get_ui_color(total)

    print(f"VCS calculated: {total} | {ui_color}")

    # ── 3. Find or create incident for this property+zone ──────
    incidents_ref = (
        db.collection("incidents")
        .where("propertyId", "==", property_id)
        .where("zone", "==", zone)
        .where("status", "in", ["DETECTING", "VERIFYING", "VERIFIED"])
        .limit(1)
        .stream()
    )

    incident_doc = None
    for doc in incidents_ref:
        incident_doc = doc
        break

    now_iso = datetime.now().isoformat()

    if incident_doc:
        # ── Update existing incident ───────────────────────────
        old_data = incident_doc.to_dict()
        was_red = old_data.get("uiColor") == "RED"

        incident_doc.reference.update({
            "vcs": total,
            "uiColor": ui_color,
            "signalIds": signal_ids,
            "status": "VERIFIED" if ui_color == "RED" else (
                "VERIFYING" if ui_color == "AMBER" else "DETECTING"
            ),
            "updatedAt": now_iso,
        })

        incident_id = incident_doc.id

        # First time crossing RED → activate
        if ui_color == "RED" and not was_red:
            _activate_incident(incident_id)
    else:
        # ── Create new incident ────────────────────────────────
        import uuid
        incident_id = str(uuid.uuid4())

        db.collection("incidents").document(incident_id).set({
            "id": incident_id,
            "propertyId": property_id,
            "type": "FIRE",  # default; Gemini will refine
            "severity": "P3",
            "status": "DETECTING" if ui_color == "BLUE" else (
                "VERIFYING" if ui_color == "AMBER" else "VERIFIED"
            ),
            "vcs": total,
            "uiColor": ui_color,
            "zone": zone,
            "floor": 1,  # updated by signal context later
            "signalIds": signal_ids,
            "geminiPlan": None,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        })

        if ui_color == "RED":
            _activate_incident(incident_id)


def _activate_incident(incident_id: str) -> None:
    """
    Triggered when VCS first crosses 85 (RED).
    Calls Gemini to generate tactical plan and writes it to Firestore.
    """
    print(f"[ALERT] Incident {incident_id} activated -- calling Gemini orchestrator...")

    from services.gemini_orchestrator import generate_tactical_plan

    db = firestore.client()
    doc_ref = db.collection("incidents").document(incident_id)
    doc = doc_ref.get()

    if not doc.exists:
        print(f"[WARN] Incident {incident_id} not found.")
        return

    incident = doc.to_dict()
    plan = generate_tactical_plan(incident)

    doc_ref.update({
        "geminiPlan": plan,
        "updatedAt": datetime.now().isoformat(),
    })

    print(f"[OK] Gemini plan generated for incident {incident_id}")

