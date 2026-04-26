import os
import json
import google.generativeai as genai

# ── Configure Gemini ────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-1.5-flash"

SYSTEM_INSTRUCTION = (
    "You are a hotel emergency response AI for Grand Hotel A. "
    "Return ONLY valid JSON. No markdown, no backticks, no explanation. "
    "Generate PERSONALIZED instructions for each guest based on their room, floor, "
    "special needs status, and the hazard location. For guests near fire, tell them "
    "exact corridors and landmarks (e.g. 'Fire extinguisher at end of corridor, take left'). "
    "For trapped guests, give survival instructions. "
    "For staff, give role-specific tactical tasks based on their certifications. "
    "Exact JSON schema required: "
    "{ "
    '"summary": "one sentence describing the crisis", '
    '"type": "FIRE or MEDICAL or SECURITY", '
    '"severity": "P1 or P2 or P3", '
    '"actions": [{"id": "string", "description": "string", "priority": "string"}], '
    '"staffTasks": [{"taskId": "string", "description": "string", "requiredCert": "string"}], '
    '"guestMessages": [{"roomId": "string", "message": "string", "tone": "calm or urgent"}], '
    '"estimatedAffectedGuests": 0, '
    '"mutualAidNeeded": false '
    "}"
)

# ── Safe default if Gemini completely fails ─────────────────────
SAFE_DEFAULT = {
    "summary": "Emergency detected — tactical plan generated.",
    "type": "FIRE",
    "severity": "P1",
    "actions": [
        {"id": "a1", "description": "Evacuate affected zone immediately via Stairwell B to South Exit", "priority": "P1"},
        {"id": "a2", "description": "Dispatch fire warden to Kitchen zone with extinguisher", "priority": "P1"},
        {"id": "a3", "description": "Send medical team to check Room 102 (special needs guest)", "priority": "P1"},
        {"id": "a4", "description": "Request 20 rooms from Sister Hotel B for guest relocation", "priority": "P2"},
    ],
    "staffTasks": [
        {"taskId": "t1", "description": "Go to Kitchen. Grab Fire Extinguisher #4 near Lobby entrance. Contain fire spread until Fire Dept arrives.", "requiredCert": "FIRE_SAFETY"},
        {"taskId": "t2", "description": "Go to Room 102 Floor 1. Assist Sara Khan (wheelchair user). Escort via Stairwell B to South Assembly Point.", "requiredCert": "FIRST_AID"},
        {"taskId": "t3", "description": "Secure North Wing perimeter. Block guest access to Kitchen corridor. Guide guests to Stairwell B.", "requiredCert": "CROWD_CONTROL"},
    ],
    "guestMessages": [
        {"roomId": "room101", "message": "Amit, please leave your room now. Turn RIGHT, walk 20 meters to Stairwell B. Take stairs down to South Exit. Fire extinguisher is on the wall to your left if needed. Stay low if you see smoke.", "tone": "urgent"},
        {"roomId": "room102", "message": "Sara, staff member Nurse Priya is coming to assist you. Please stay in your room and keep door closed until she arrives. Place a wet towel under your door. Help will arrive in 2 minutes.", "tone": "calm"},
        {"roomId": "room201", "message": "Raj, leave your room and take Stairwell A (directly ahead). Walk down to Floor 1, then follow the green EXIT signs to North Exit. Avoid the Kitchen area on Floor 1.", "tone": "urgent"},
        {"roomId": "room202", "message": "Meena, exit your room and go LEFT to Stairwell B. Walk down to Floor 1 and proceed to South Exit. The assembly point is in the parking lot. A staff member will meet you there.", "tone": "urgent"},
    ],
    "estimatedAffectedGuests": 4,
    "mutualAidNeeded": True,
}


def generate_tactical_plan(incident: dict) -> dict:
    """
    Call Gemini 1.5 Flash with the incident data and return
    a structured tactical response plan as a Python dict.
    """
    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_INSTRUCTION,
        )

        # Enhanced prompt with building details and guest info
        user_message = (
            f"Hotel Grand A has a VERIFIED emergency. Incident data: {json.dumps(incident, default=str)}. "
            f"Building layout: Kitchen is on Floor 1 east wing. Lobby connects to Kitchen via corridor. "
            f"Stairwell A is north side, Stairwell B is south side. EXIT_NORTH is via Stairwell A, EXIT_SOUTH via Stairwell B. "
            f"Occupied rooms and guests: "
            f"Room 101 (Floor 1, east wing): Amit Shah - no special needs. "
            f"Room 102 (Floor 1, east wing): Sara Khan - WHEELCHAIR USER, special needs. "
            f"Room 201 (Floor 2, east wing): Raj Patel - no special needs. "
            f"Room 202 (Floor 2, east wing): Meena Iyer - no special needs. "
            f"Staff available: Chief Singh (Security, FIRST_AID cert, Floor 1), "
            f"Nurse Priya (Medical, CPR cert, Floor 2), Warden Dave (Fire Warden, FIRE_SAFETY cert, Floor 1). "
            f"Fire extinguisher locations: Lobby entrance, Kitchen door, each stairwell landing. "
            f"Generate a complete tactical response plan with PERSONALIZED instructions for every guest "
            f"including exact directions from their room to the nearest safe exit, and specific tasks "
            f"for each staff member based on their role and certifications."
        )

        response = model.generate_content(user_message)
        raw_text = response.text

        # ── Parse JSON from response ───────────────────────────
        try:
            plan = json.loads(raw_text)
        except json.JSONDecodeError:
            # Strip markdown code fences and retry
            cleaned = raw_text.replace("```json", "").replace("```", "").strip()
            try:
                plan = json.loads(cleaned)
            except json.JSONDecodeError:
                print(f"[WARN] Gemini returned unparseable response: {raw_text[:300]}")
                return SAFE_DEFAULT

        print(f"[OK] Gemini tactical plan generated successfully.")
        return plan

    except Exception as e:
        print(f"[WARN] Gemini API call failed: {e}")
        return SAFE_DEFAULT
