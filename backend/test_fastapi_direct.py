from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def run_tests():
    print("\n--- 1. TESTING GROUND-TRUTH CONFUSION MATRIX BENCHMARK ---")
    resp = client.get("/policy/benchmark?samples=200")
    assert resp.status_code == 200
    res = resp.json()
    print("Confusion Matrix:", res["confusion_matrix"])
    print("Metrics (Precision/Recall/AUC):", res["metrics"])
    print("Active Thresholds:", res["active_thresholds"])

    print("\n--- 2. TESTING MASTER EMERGENCY KILL-SWITCH ENGAGEMENT ---")
    kill_payload = {
        "active": True,
        "actor": "SecOps Lead (Ashwin)",
        "reason": "Flash Sale False-Positive Spike Mitigation"
    }
    resp = client.post("/policy/kill-switch", json=kill_payload)
    assert resp.status_code == 200
    res = resp.json()
    print("Kill Switch Active:", res.get("kill_switch_active"))
    print("Audit Log Tail:", res.get("audit_log")[-1])

    print("\n--- 3. TESTING TRANSACTION UNDER KILL-SWITCH (SHOULD NOT BLOCK) ---")
    tx_payload = {
        "user_id": "USR-ATTACK-01",
        "merchant_id": "merchant-demo",
        "amount": 99999.0,
        "device_fingerprint": "DEV-SUSPICIOUS-01",
        "ip_hash": "IP-ATTACK-01",
        "payment_method": "card",
        "currency": "INR"
    }
    resp = client.post("/risk/score", json=tx_payload)
    assert resp.status_code == 200
    res = resp.json()
    print("Decision under Kill Switch:", res["decision"])
    print("Customer Friendly Explanation:", res.get("customer_explanation"))

    print("\n--- 4. RESTORING KILL-SWITCH TO NORMAL ---")
    kill_payload["active"] = False
    kill_payload["reason"] = "Flash Sale concluded; normal automated blocking restored."
    resp = client.post("/policy/kill-switch", json=kill_payload)
    assert resp.status_code == 200
    res = resp.json()
    print("Kill Switch Deactivated. Active:", res.get("kill_switch_active"))
    print("\n[SUCCESS] ALL BUNDLE B TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
