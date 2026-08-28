import urllib.request
import json

base_url = "http://127.0.0.1:8000"

def test_bundle_a():
    # 1. Health check
    req = urllib.request.Request(f"{base_url}/health")
    with urllib.request.urlopen(req) as resp:
        print("Health status:", resp.read().decode())

    # 2. Score transaction and verify ensemble scores & stage latencies
    payload = {
        "user_id": "USR-JUDGE-01",
        "merchant_id": "merchant-demo",
        "amount": 1500.0,
        "device_fingerprint": "DEV-TEST-01",
        "ip_hash": "IP-TEST-01",
        "payment_method": "card",
        "currency": "INR"
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{base_url}/risk/score", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("\n--- TRANSACTION DECISION & TECHNICAL PROOF ---")
        print("Tx ID:", res["tx_id"])
        print("Risk Score:", res["risk_score"], "| Decision:", res["decision"])
        print("Ensemble Scores:", res.get("ensemble_scores"))
        print("Disagreement Index (std):", res.get("disagreement_index"))
        print("Stage Latencies (ms):", res.get("stage_latencies"))
        print("Total Latency:", res.get("latency_ms"), "ms")
        print("Degraded Fallback Mode:", res.get("is_degraded"))

    # 3. Test Chaos Toggle: Kill Graph Service
    print("\n--- TESTING CHAOS MODE: KILL GRAPH SERVICE ---")
    chaos_req = {"graph_offline": True}
    data = json.dumps(chaos_req).encode()
    req = urllib.request.Request(f"{base_url}/chaos/toggle", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        status = json.loads(resp.read().decode())
        print("Chaos status after killing graph:", status)

    # Score again under chaos
    req = urllib.request.Request(f"{base_url}/risk/score", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Scored under Chaos -> Score:", res["risk_score"], "Degraded:", res["is_degraded"], "Reason codes:", [r["code"] for r in res["reason_codes"]])

    # 4. Reset Chaos
    req = urllib.request.Request(f"{base_url}/chaos/reset", data=b"{}", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        print("Chaos Reset:", json.loads(resp.read().decode()))

if __name__ == "__main__":
    test_bundle_a()
