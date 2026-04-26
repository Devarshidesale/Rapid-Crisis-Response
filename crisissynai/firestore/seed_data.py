import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv("../backend/.env")

service_account_path = os.getenv("SERVICE_ACCOUNT_PATH", "../backend/serviceAccountKey.json")

if not os.path.exists(service_account_path):
    print(f"Error: {service_account_path} not found. Cannot seed database.")
    exit(1)

cred = credentials.Certificate(service_account_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def seed_db():
    print("Seeding database...")
    
    # 1. Add Hotel Property
    hotel_ref = db.collection("properties").document("hotel-a")
    hotel_ref.set({
        "name": "Hotel Grand A",
        "totalRooms": 100,
        "sisterPropertyIds": ["hotel-b"],
        "dutyManagerPhone": "+1234567890",
        "buildingGraph": {
          "nodes": [
            {"id": "room101", "floor": 1, "zone": "east"},
            {"id": "room102", "floor": 1, "zone": "east"},
            {"id": "room201", "floor": 2, "zone": "east"},
            {"id": "room202", "floor": 2, "zone": "east"},
            {"id": "kitchen", "floor": 1, "zone": "kitchen"},
            {"id": "lobby",   "floor": 1, "zone": "lobby"},
            {"id": "stair_a", "floor": 1, "zone": "stair"},
            {"id": "stair_b", "floor": 1, "zone": "stair"},
            {"id": "EXIT_NORTH", "floor": 1, "zone": "exit"},
            {"id": "EXIT_SOUTH", "floor": 1, "zone": "exit"}
          ],
          "edges": [
            {"from": "room101", "to": "lobby",      "weight": 1, "zone": "lobby"},
            {"from": "room102", "to": "lobby",      "weight": 1, "zone": "lobby"},
            {"from": "room201", "to": "stair_a",    "weight": 1, "zone": "stair"},
            {"from": "room202", "to": "stair_b",    "weight": 1, "zone": "stair"},
            {"from": "kitchen", "to": "lobby",      "weight": 1, "zone": "kitchen"},
            {"from": "lobby",   "to": "stair_a",    "weight": 1, "zone": "lobby"},
            {"from": "lobby",   "to": "stair_b",    "weight": 1, "zone": "lobby"},
            {"from": "stair_a", "to": "EXIT_NORTH", "weight": 1, "zone": "stair"},
            {"from": "stair_b", "to": "EXIT_SOUTH", "weight": 1, "zone": "stair"}
          ]
        }
    })
    
    # 2. Add Guests
    guests = [
        {"id": "g1", "name": "Amit Shah", "roomId": "room101", "floor": 1, "propertyId": "hotel-a", "checkInStatus": "CHECKED_IN", "specialNeeds": False, "language": "en", "assemblyCheckIn": None},
        {"id": "g2", "name": "Sara Khan", "roomId": "room102", "floor": 1, "propertyId": "hotel-a", "checkInStatus": "CHECKED_IN", "specialNeeds": True, "language": "hi", "assemblyCheckIn": None},
        {"id": "g3", "name": "Raj Patel", "roomId": "room201", "floor": 2, "propertyId": "hotel-a", "checkInStatus": "CHECKED_IN", "specialNeeds": False, "language": "en", "assemblyCheckIn": None},
        {"id": "g4", "name": "Meena Iyer", "roomId": "room202", "floor": 2, "propertyId": "hotel-a", "checkInStatus": "CHECKED_IN", "specialNeeds": False, "language": "en", "assemblyCheckIn": None}
    ]
    
    for g in guests:
        db.collection("guests").document(g["id"]).set(g)
        
    # 3. Add Staff
    staff = [
        {"id": "s1", "name": "Security Chief Singh", "role": "SECURITY", "certifications": ["FIRST_AID", "CROWD_CONTROL"], "propertyId": "hotel-a", "status": "AVAILABLE", "currentFloor": 1, "activeTaskId": None},
        {"id": "s2", "name": "Nurse Priya", "role": "MEDICAL", "certifications": ["CPR", "FIRST_AID"], "propertyId": "hotel-a", "status": "AVAILABLE", "currentFloor": 2, "activeTaskId": None},
        {"id": "s3", "name": "Warden Dave", "role": "FIRE_WARDEN", "certifications": ["FIRE_SAFETY", "EVACUATION"], "propertyId": "hotel-a", "status": "AVAILABLE", "currentFloor": 1, "activeTaskId": None}
    ]
    
    for s in staff:
        db.collection("staff").document(s["id"]).set(s)

    print("✅ Database seeded successfully!")

if __name__ == "__main__":
    seed_db()
