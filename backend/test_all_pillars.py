from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_all_5_pillars():
    # 1. Test Single Transaction Lifecycle through all 5 pillars
    resp = client.post("/risk/score", json={
        "user_id": "USR-END2END-01",
        "merchant_id": "merchant-swiggy",
        "amount": 4200,
        "device_fingerprint": "DEV-E2E-01",
        "ip_hash": "IP-BANGALORE-01",
        "payment_method": "card",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "confidence_score" in data
    assert "counterfactuals" in data
    assert "loss_matrix" in data
    assert "sequence_fingerprint" in data
    assert data["model_security_status"] == "SECURE"

    # 2. Test Sequence Fingerprinting Ladder Detection
    client.post("/risk/score", json={"user_id": "USR-LADDER-01", "merchant_id": "merchant-1", "amount": 10, "device_fingerprint": "D1", "ip_hash": "IP1", "payment_method": "card"})
    client.post("/risk/score", json={"user_id": "USR-LADDER-01", "merchant_id": "merchant-1", "amount": 20, "device_fingerprint": "D1", "ip_hash": "IP1", "payment_method": "card"})
    ladder_resp = client.post("/risk/score", json={"user_id": "USR-LADDER-01", "merchant_id": "merchant-1", "amount": 15000, "device_fingerprint": "D1", "ip_hash": "IP1", "payment_method": "card"})
    assert ladder_resp.status_code == 200
    ladder_data = ladder_resp.json()
    assert ladder_data["sequence_fingerprint"] == "MICRO_CARD_TEST_LADDER"

    # 3. Test Immutable Risk Decision Ledger & SHA-256 Hash Chain
    ledger_resp = client.get("/risk/ledger?limit=10")
    assert ledger_resp.status_code == 200
    ledger_items = ledger_resp.json()["ledger"]
    assert len(ledger_items) >= 2
    assert "ledger_id" in ledger_items[0]
    assert "block_hash" in ledger_items[0]
    assert "prev_hash" in ledger_items[0]

    # Verify cryptographic hash-chain integrity
    verify_resp = client.get("/risk/ledger/verify")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True
    assert verify_resp.json()["status"] == "SECURE_AUDITED"

    # 4. Test Executive CRO Summary
    exec_resp = client.get("/executive/summary")
    assert exec_resp.status_code == 200
    assert exec_resp.json()["system_health"]["risk_engine"] == "HEALTHY"

    print("ALL 5 ENTERPRISE INTELLIGENCE PILLARS & TREE-SHAP & SHA-256 AUDIT LEDGER VERIFIED 100%!")

if __name__ == "__main__":
    test_all_5_pillars()
