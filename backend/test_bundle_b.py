import urllib.request
import json
import sys

base_url = "http://localhost:8000"

def test_bundle_b():
    sys.stdout.reconfigure(line_buffering=True)
    print("\n--- 1. TESTING GROUND-TRUTH CONFUSION MATRIX BENCHMARK ---")
    req = urllib.request.Request(f"{base_url}/policy/benchmark?samples=200")
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode())
        print("Confusion Matrix:", res["confusion_matrix"])
        print("Metrics (Precision/Recall/AUC):", res["metrics"])
        print("Active Thresholds:", res["active_thresholds"])

    print("\n--- 2. TESTING MASTER EMERGENCY KILL-SWITCH ENGAGEMENT ---")
    kill_payload = {
        "active": True,
        "actor": "SecOps Lead (Ashwin)",
        "reason": "Flash Sale False-Positive Spike Mitigation"
    }
    data = json.dumps(kill_payload).encode()
    req = urllib.request.Request(f"{base_url}/policy/kill-switch", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode())
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
    data = json.dumps(tx_payload).encode()
    req = urllib.request.Request(f"{base_url}/risk/score", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode())
        print("Decision under Kill Switch:", res["decision"])
        print("Customer Friendly Explanation:", res.get("customer_explanation"))

    print("\n--- 4. RESTORING KILL-SWITCH TO NORMAL ---")
    kill_payload["active"] = False
    kill_payload["reason"] = "Flash Sale concluded; normal automated blocking restored."
    data = json.dumps(kill_payload).encode()
    req = urllib.request.Request(f"{base_url}/policy/kill-switch", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        res = json.loads(resp.read().decode())
        print("Kill Switch Deactivated. Active:", res.get("kill_switch_active"))

if __name__ == "__main__":
    test_bundle_b()
