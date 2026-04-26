import argparse
import json
import time
import sys
import os
import httpx

def main():
    parser = argparse.ArgumentParser(description="CrisisSyncAI IoT Simulator")
    parser.add_argument("--scenario", default="kitchen_fire", help="Scenario name (default: kitchen_fire)")
    parser.add_argument("--speed", type=float, default=1.0, help="Playback speed multiplier (default: 1.0)")
    parser.add_argument("--backend", default="http://localhost:8000", help="Backend URL (default: http://localhost:8000)")
    args = parser.parse_args()

    # Load JSON file from iot-simulator/scenarios/{scenario}.json
    scenario_file = os.path.join(os.path.dirname(__file__), "scenarios", f"{args.scenario}.json")
    
    try:
        with open(scenario_file, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"✗ Error: Scenario file not found at {scenario_file}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error loading scenario: {e}")
        sys.exit(1)

    property_id = data.get("propertyId", "hotel-a")
    steps = data.get("steps", [])
    total = len(steps)

    print("=== CrisisSyncAI IoT Simulator ===")
    print(f"Scenario: {args.scenario} | Speed: {args.speed}x")
    print(f"Backend: {args.backend}")
    print("Press Ctrl+C to stop")

    with httpx.Client() as client:
        for i, step in enumerate(steps, 1):
            delay = step.get("delay_seconds", 0)
            actual_delay = delay / args.speed
            
            print(f"\n[{i}/{total}] Waiting {actual_delay:.1f}s...")
            time.sleep(actual_delay)
            
            # Prepare payload by stripping delay_seconds and ensuring propertyId exists
            payload = step.copy()
            payload.pop("delay_seconds", None)
            payload["propertyId"] = property_id

            signal_type = payload.get('type')
            zone = payload.get('zone')
            print(f"→ Sending {signal_type} signal from {zone}...")
            
            try:
                response = client.post(f"{args.backend}/signal/ingest", json=payload)
                if response.is_success:
                    res_data = response.json()
                    vcs = res_data.get("vcs", "?")
                    color = res_data.get("uiColor", "?")
                    print(f"✓ Signal accepted | VCS: {vcs}% | {color}")
                else:
                    print(f"✗ Error: {response.status_code}")
                    print(response.text)
            except Exception as e:
                print(f"✗ Network Error: {e}")

    print("\n=== Scenario Complete. Watch the dashboard! ===")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
        sys.exit(0)
