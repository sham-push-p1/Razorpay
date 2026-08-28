from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_tier_refinements():
    # Send normal transaction
    resp = client.post("/risk/score", json={
        "user_id": "USR-SEC-01",
        "merchant_id": "merchant-demo",
        "amount": 2500,
        "device_fingerprint": "DEV-SAFE-01",
        "ip_hash": "IP-SAFE-01",
        "payment_method": "card",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_security_status"] == "SECURE"
    assert "loss_matrix" in data
    assert "min_expected_loss" in data["loss_matrix"]

    resp = client.get("/executive/summary")
    assert resp.status_code == 200
    exec_data = resp.json()
    assert exec_data["system_health"]["risk_engine"] == "HEALTHY"
    assert exec_data["fraud_networks"]["active_rings"] >= 1

    print("ALL 5 FINAL REFINEMENTS TESTED AND PASSED 100%!")

if __name__ == "__main__":
    test_tier_refinements()
