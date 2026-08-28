from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("--- 1. Testing Drift Status ---")
    resp = client.get("/drift/status")
    assert resp.status_code == 200
    print("Initial status:", resp.json())

    print("--- 2. Testing Drift Injection ---")
    resp = client.post("/drift/inject", json={"drift_type": "adversarial_shift"})
    assert resp.status_code == 200
    res = resp.json()
    print("Injected status:", res)
    assert res["is_drifted"] == True

    print("--- 3. Testing Active Retraining ---")
    resp = client.post("/drift/retrain")
    assert resp.status_code == 200
    res = resp.json()
    print("Retrained status:", res)
    assert res["is_drifted"] == False

    print("ALL DRIFT TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
