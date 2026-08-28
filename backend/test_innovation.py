from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_innovation_features():
    print("--- 1. Testing AI vs AI Adversarial Battle ---")
    for r in range(1, 6):
        resp = client.get(f"/innovation/adversarial/round/{r}")
        assert resp.status_code == 200
        data = resp.json()
        print(f"Round {r} -> Decision: {data['decision']} -> Score: {data['risk_score']}")
        assert data["decision"] in ("BLOCK", "STEP-UP")

    print("\n--- 2. Testing City Fraud Heatmap ---")
    resp = client.get("/innovation/geo/heatmap")
    assert resp.status_code == 200
    cities = resp.json()["cities"]
    print(f"Loaded {len(cities)} city risk nodes")
    assert len(cities) >= 5

    print("\n--- 3. Testing Champion vs Challenger Shadow Model ---")
    resp = client.get("/innovation/models/shadow")
    assert resp.status_code == 200
    shadow = resp.json()
    print("Champion AUC:", shadow["champion"]["roc_auc"])
    print("Challenger AUC:", shadow["challenger"]["roc_auc"])
    assert shadow["challenger"]["roc_auc"] > shadow["champion"]["roc_auc"]

    print("\n--- 4. Testing Impossible Travel Detection in Risk Scoring ---")
    # First txn from Chennai
    client.post("/risk/score", json={
        "user_id": "USR-GEO-TESTER",
        "merchant_id": "merchant-demo",
        "amount": 2500,
        "device_fingerprint": "DEV-GEO-01",
        "ip_hash": "IP-CHENNAI",
        "coarse_geo": "Chennai",
        "payment_method": "card",
    })

    # Immediate second txn from London (Impossible Travel)
    resp = client.post("/risk/score", json={
        "user_id": "USR-GEO-TESTER",
        "merchant_id": "merchant-demo",
        "amount": 12000,
        "device_fingerprint": "DEV-GEO-02",
        "ip_hash": "IP-LONDON",
        "coarse_geo": "London",
        "payment_method": "card",
    })
    assert resp.status_code == 200
    data = resp.json()
    print("Geo impossible travel decision:", data["decision"], "| Score:", data["risk_score"])
    print("Expected financial exposure:", data["expected_exposure_inr"])
    assert data["expected_exposure_inr"] > 0
    assert any(r["code"] == "IMPOSSIBLE_TRAVEL" for r in data["reason_codes"])

    print("\nALL INNOVATION AND TIER S/A TESTS PASSED 100%!")

if __name__ == "__main__":
    test_innovation_features()
