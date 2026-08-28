import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.graph_service import graph_service
from app.services.feature_service import FeatureVector
from app.services.risk_models import ml_score, anomaly_score, graph_score, rule_score
from app.services.risk_fusion import fuse
from app.services.policy_engine import policy_engine
from app.services.investigation_agent import investigation_agent
from app.routers.simulate import _build_scenario_requests


def test_hub_node_cap():
    print("\n--- 1. Testing Hub-Node Cap in Graph Engine ---")
    graph_service.reset()
    # Create a shared hub node with 25 accounts (public wifi/proxy)
    hub_ip = "IP-HUB-PUBLIC-WIFI"
    for i in range(25):
        graph_service.record_transaction(
            user_id=f"USER-{i:03d}",
            device_id=f"DEV-{i:03d}",
            ip_hash=hub_ip,
            tx_id=f"TX-{i:03d}",
            amount=500.0,
            score=15.0,
            decision="APPROVE",
        )

    rings = graph_service.detect_fraud_rings()
    print(f"Total detected fraud rings on shared hub: {len(rings)}")
    # Hub nodes should NOT merge all 25 users into a massive fraud ring
    assert len(rings) == 0, f"Expected 0 fraud rings due to hub cap, but got {len(rings)}"
    
    # Verify entity risk marks shared infra
    risk_info = graph_service.analyze_entity_risk("USER-001", "DEV-001", hub_ip)
    assert risk_info["is_shared_infra"] is True, "Hub IP should be flagged as shared infra"
    print("[PASSED] Hub-Node Cap & Shared Infrastructure Test Passed!")


def test_fail_closed_models():
    print("\n--- 2. Testing Fail-Closed Model Error Handling ---")
    # Passing malformed / None features to test exception handling
    bad_fv = None
    m_out = ml_score(bad_fv)
    assert m_out.score >= 50.0, f"Expected fail-closed score >= 50, got {m_out.score}"
    assert "FAILSAFE" in m_out.reasons[0]["code"]

    a_out = anomaly_score(bad_fv)
    assert a_out.score >= 50.0, f"Expected fail-closed score >= 50, got {a_out.score}"

    g_out = graph_score(bad_fv)
    assert g_out.score >= 50.0, f"Expected fail-closed score >= 50, got {g_out.score}"

    r_out = rule_score(bad_fv)
    assert r_out.score == 100.0, f"Expected rule fail-closed 100.0, got {r_out.score}"
    print("[PASSED] Fail-Closed Model Resilience Test Passed!")


def test_hard_rule_override():
    print("\n--- 3. Testing Hard Rule Direct 100 Override ---")
    fv = FeatureVector(
        amount=500.0,
        amount_vs_baseline_ratio=1.0,
        device_first_seen_minutes_ago=10.0,
        device_account_count=1,
        velocity_90s=12,  # Breaches velocity hard stop (>=8)
        velocity_300s=15,
        is_new_device=False,
        ip_recent_user_count=1,
        account_age_days=100,
    )
    fusion = fuse(fv)
    assert fusion.final_score == 100.0, f"Expected final score 100.0 for hard rule, got {fusion.final_score}"
    decision = policy_engine.decide(score=fusion.final_score)
    assert decision == "BLOCK", f"Expected BLOCK decision for score 100, got {decision}"
    print("[PASSED] Hard Rule Direct Override Test Passed!")


def test_sigma_policy_escalation():
    print("\n--- 4. Testing Sigma Disagreement Policy Escalation ---")
    # Low score (e.g. 25.0) which would normally be APPROVE, but high sigma (disagreement >= 18.0)
    score = 25.0
    sigma_low = 5.0
    sigma_high = 22.0

    dec_low = policy_engine.decide(score=score, sigma=sigma_low)
    assert dec_low == "APPROVE", f"Expected APPROVE with low sigma, got {dec_low}"

    dec_high = policy_engine.decide(score=score, sigma=sigma_high)
    assert dec_high == "STEP-UP", f"Expected STEP-UP with high sigma disagreement, got {dec_high}"
    print("[PASSED] Sigma Disagreement Policy Escalation Test Passed!")


def test_attack_scenarios():
    print("\n--- 5. Testing Impossible Travel & Card-Testing Ladder Scenarios ---")
    reqs_geo = _build_scenario_requests("impossible_travel", 4)
    assert len(reqs_geo) == 4
    assert reqs_geo[0].coarse_geo != reqs_geo[1].coarse_geo
    print(f"Generated impossible travel cities: {[r.coarse_geo for r in reqs_geo]}")

    reqs_ladder = _build_scenario_requests("card_testing_ladder", 5)
    assert len(reqs_ladder) == 5
    assert reqs_ladder[0].amount < reqs_ladder[-1].amount
    print(f"Generated card ladder amounts: {[r.amount for r in reqs_ladder]}")
    print("[PASSED] Attack Scenarios Generation Test Passed!")


def test_thin_evidence_guard():
    print("\n--- 6. Testing Investigation Agent Thin-Evidence Guard ---")
    dossier = investigation_agent.generate_dossier(
        tx_id="TX-BENIGN-001",
        user_id="USR-BENIGN",
        amount=350.0,
        score=12.0,
        decision="APPROVE",
        reason_codes=[],
        device_id="DEV-BENIGN",
        ip_hash="IP-BENIGN",
        graph_metrics={"device_connected_users": 1, "ip_connected_users": 1, "cluster_size": 1},
    )
    assert dossier["severity"] == "LOW"
    assert "Insufficient anomalous signals" in dossier["summary"]
    print("Dossier Summary:", dossier["summary"])
    print("[PASSED] Thin-Evidence Guard Test Passed!")


if __name__ == "__main__":
    test_hub_node_cap()
    test_fail_closed_models()
    test_hard_rule_override()
    test_sigma_policy_escalation()
    test_attack_scenarios()
    test_thin_evidence_guard()
    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")
