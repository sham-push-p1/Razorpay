import urllib.request
import json

base_url = "http://127.0.0.1:8000"

def test_api():
    # 1. Health check
    req = urllib.request.Request(f"{base_url}/health")
    with urllib.request.urlopen(req) as resp:
        print("Health status:", resp.read().decode())

    # 2. Score a normal transaction
    payload = {
        "user_id": "USR-TEST-01",
        "merchant_id": "merchant-demo",
        "amount": 450.0,
        "device_fingerprint": "DEV-TEST-01",
        "ip_hash": "IP-TEST-01",
        "payment_method": "card",
        "currency": "INR"
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{base_url}/risk/score", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Scored transaction:", res["tx_id"], "Decision:", res["decision"], "Score:", res["risk_score"], "Reasons:", len(res["reason_codes"]))

    # 3. Simulate fraud ring attack
    sim_payload = {"scenario": "fraud_ring", "count": 6}
    data = json.dumps(sim_payload).encode()
    req = urllib.request.Request(f"{base_url}/simulate/attack", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Simulated attack:", res["scenario"], "Total scored:", res["count"])

    # 4. Check graph data
    req = urllib.request.Request(f"{base_url}/graph/data")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Graph stats:", res["stats"], "Fraud rings detected:", len(res.get("fraud_rings", [])))

    # 5. Check cases
    req = urllib.request.Request(f"{base_url}/cases")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Cases total:", len(res.get("cases", [])))
        if res.get("cases"):
            first = res["cases"][0]
            print("First Case ID:", first["case_id"], "Dossier Severity:", first.get("investigation_report", {}).get("severity"))

    # 6. Check policy config
    req = urllib.request.Request(f"{base_url}/policy/config")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Policy config:", res)

if __name__ == "__main__":
    test_api()
