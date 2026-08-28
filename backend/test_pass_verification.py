from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_pass_verification():
    print("--- 1. Testing Policy Simulate Endpoint ---")
    resp = client.get("/policy/simulate?approve_th=25&step_up_th=65")
    assert resp.status_code == 200
    res = resp.json()
    print("Simulate response:", res)

    print("--- 2. Testing Graph Entity Endpoint ---")
    resp = client.get("/graph/entity/USR-DEMO-01")
    assert resp.status_code == 200
    print("Graph Entity response:", resp.json())

    print("--- 3. Testing Chaos Disable Endpoint ---")
    resp = client.post("/chaos/disable/graph")
    assert resp.status_code == 200
    print("Chaos Disable response:", resp.json())
    assert resp.json()["graph_offline"] == True

    # Reset chaos
    client.post("/chaos/reset")

    print("\nALL PASS VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_pass_verification()
