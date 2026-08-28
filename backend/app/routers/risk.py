import time
import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import models
from app.models.schemas import CheckoutRequest, RiskScoreResponse, RiskFactor
from app.services.feature_service import build_feature_vector
from app.services.risk_fusion import fuse
from app.services.policy_engine import decide, policy_engine, POLICY_VERSION
from app.services.metrics_service import metrics
from app.services.graph_service import graph_service
from app.services.investigation_agent import investigation_agent
from app.services.chaos_service import chaos_service
from app.services.explainability_service import generate_customer_explanation
from app.services.geo_service import geo_service
from app.services.model_security_service import model_security_service
from app.services.calibration_service import calibration_service
from app.services.counterfactual_service import counterfactual_service
from app.services.sequence_service import sequence_service
from app.services.ledger_service import ledger_service

router = APIRouter(prefix="/risk", tags=["risk"])

LATENCY_BUDGET_MS = 100


@router.post("/score", response_model=RiskScoreResponse)
def score_transaction(payload: CheckoutRequest, db: Session = Depends(get_db)):
    start = time.perf_counter()
    correlation_id = str(uuid.uuid4())
    stage_latencies = {}

    # Simulate network jitter under chaos if enabled
    if chaos_service.simulated_latency_ms > 0:
        time.sleep(chaos_service.simulated_latency_ms / 1000.0)

    # --- get or create user (baseline lookup) ---
    t_feat_start = time.perf_counter()
    user = db.get(models.User, payload.user_id)
    if user is None:
        user = models.User(
            user_id=payload.user_id,
            account_age_days=0,
            baseline_amount=payload.amount,
            baseline_velocity=0,
        )
        db.add(user)
        db.commit()

    # --- persist transaction record ---
    tx = models.Transaction(
        user_id=payload.user_id,
        merchant_id=payload.merchant_id,
        amount=payload.amount,
        currency=payload.currency,
        device_id=payload.device_fingerprint,
        ip_hash=payload.ip_hash,
        payment_method=payload.payment_method,
        status="pending",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # --- feature extraction ---
    fv = build_feature_vector(
        user_id=payload.user_id,
        device_id=payload.device_fingerprint,
        ip_hash=payload.ip_hash,
        amount=payload.amount,
        baseline_amount=user.baseline_amount,
        account_age_days=user.account_age_days or 30,
    )
    stage_latencies["feature_extraction_ms"] = round((time.perf_counter() - t_feat_start) * 1000, 2)

    # --- parallel risk intelligence + fusion ---
    fusion = fuse(fv)
    stage_latencies.update(fusion.stage_latencies)

    t_dec_start = time.perf_counter()
    decision = policy_engine.decide(
        score=fusion.final_score,
        user_id=payload.user_id,
        device_id=payload.device_fingerprint,
        ip_hash=payload.ip_hash,
        is_new_device=fv.is_new_device,
        sigma=fusion.disagreement_index,
        amount=payload.amount,
    )
    stage_latencies["policy_decision_ms"] = round((time.perf_counter() - t_dec_start) * 1000, 2)

    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    # --- update dynamic graph intelligence ---
    if not chaos_service.graph_offline:
        graph_service.record_transaction(
            user_id=payload.user_id,
            device_id=payload.device_fingerprint,
            ip_hash=payload.ip_hash,
            tx_id=tx.tx_id,
            amount=payload.amount,
            score=fusion.final_score,
            decision=decision,
        )

    # --- persist decision ---
    tx.status = decision
    rd = models.RiskDecision(
        tx_id=tx.tx_id,
        score=fusion.final_score,
        decision=decision,
        reason_codes=fusion.reason_codes,
        model_versions=fusion.model_versions,
        latency_ms=latency_ms,
    )
    db.add(rd)
    db.commit()

    # --- auto-create case for BLOCK or STEP-UP transactions ---
    if decision in ("BLOCK", "STEP-UP"):
        graph_metrics = graph_service.analyze_entity_risk(payload.user_id, payload.device_fingerprint, payload.ip_hash)
        dossier = investigation_agent.generate_dossier(
            tx_id=tx.tx_id,
            user_id=payload.user_id,
            amount=payload.amount,
            score=fusion.final_score,
            decision=decision,
            reason_codes=fusion.reason_codes,
            device_id=payload.device_fingerprint,
            ip_hash=payload.ip_hash,
            graph_metrics=graph_metrics,
        )
        case = models.Case(
            tx_id=tx.tx_id,
            status="open",
            evidence_refs=[tx.tx_id, f"DEV:{payload.device_fingerprint}", f"IP:{payload.ip_hash}"],
            investigation_report=dossier,
        )
        db.add(case)
        db.commit()

    metrics.record(latency_ms, decision)

    if latency_ms > LATENCY_BUDGET_MS:
        fusion.reason_codes.append({
            "code": "LATENCY_BUDGET_EXCEEDED",
            "description": f"Decision took {latency_ms}ms, budget is {LATENCY_BUDGET_MS}ms",
            "contribution": 0,
        })

    # 0. Model Security & Adversarial Feature Integrity Check
    sec_check = model_security_service.inspect_feature_integrity(
        payload.amount, payload.user_id, payload.device_fingerprint, payload.ip_hash
    )
    if sec_check["is_manipulated"]:
        for flag in sec_check["security_flags"]:
            fusion.reason_codes.append({
                "code": flag,
                "description": f"Adversarial feature manipulation detected ({flag})",
                "contribution": 35,
            })
        fusion.final_score = min(fusion.final_score + sec_check["security_penalty"], 100.0)

    # 1. Sequence Fingerprinting & Velocity Acceleration
    seq_check = sequence_service.analyze_sequence(payload.user_id, payload.amount)
    if seq_check["is_anomalous_sequence"]:
        fusion.reason_codes.append({
            "code": f"SEQUENCE_{seq_check['fingerprint_type']}",
            "description": f"Anomalous transaction sequence progression ({seq_check['fingerprint_type']})",
            "contribution": seq_check["sequence_risk_score"],
        })
        fusion.final_score = min(fusion.final_score + seq_check["sequence_risk_score"], 100.0)

    # 2. Geospatial Impossible-Travel Check
    city = payload.coarse_geo or "Bangalore"
    geo_check = geo_service.check_impossible_travel(payload.user_id, city)
    if geo_check["is_impossible_travel"]:
        fusion.reason_codes.append({
            "code": "IMPOSSIBLE_TRAVEL",
            "description": f"Impossible travel detected: {geo_check['previous_city']} -> {city} ({geo_check['velocity_kmh']} km/h)",
            "contribution": 50,
        })
        fusion.final_score = min(fusion.final_score + 40.0, 100.0)

    # 3. Uncertainty-Aware & Economic Policy Decision (Operationalizing Sigma)
    if fusion.disagreement_index >= policy_engine.SIGMA_ESCALATION_THRESHOLD and fusion.final_score <= policy_engine.approve_threshold:
        fusion.reason_codes.append({
            "code": "SIGMA_DISAGREEMENT_ESCALATION",
            "description": f"High ensemble variance (σ={fusion.disagreement_index}) — escalated to STEP-UP verification",
            "contribution": 25,
        })

    t_dec_start = time.perf_counter()
    decision = policy_engine.decide(
        score=fusion.final_score,
        user_id=payload.user_id,
        device_id=payload.device_fingerprint,
        ip_hash=payload.ip_hash,
        is_new_device=fv.is_new_device,
        sigma=fusion.disagreement_index,
        amount=payload.amount,
    )
    stage_latencies["policy_decision_ms"] = round((time.perf_counter() - t_dec_start) * 1000, 2)

    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    # 4. Platt Calibration & Decision Confidence
    calib = calibration_service.calibrate(fusion.final_score, fusion.disagreement_index)

    # 5. Counterfactual "What-If" Interventions
    counterfactuals = counterfactual_service.generate_counterfactuals(
        fusion.final_score,
        fusion.reason_codes,
        payload.amount,
        fv.is_new_device,
        fv.velocity_90s,
    )

    # 6. Calculate Economic Expected Loss Vector
    loss_data = policy_engine.calculate_expected_loss(fusion.final_score, payload.amount)
    expected_exposure = round((fusion.final_score / 100.0) * payload.amount, 2)

    customer_exp = generate_customer_explanation(fusion.reason_codes)

    # 7. Record Immutable Decision Ledger Event
    ledger_service.record_decision({
        "tx_id": tx.tx_id,
        "user_id": payload.user_id,
        "merchant_id": payload.merchant_id,
        "amount": payload.amount,
        "risk_score": fusion.final_score,
        "confidence_score": calib["confidence_pct"],
        "sigma": fusion.disagreement_index,
        "decision": decision,
        "ensemble_scores": fusion.ensemble_scores,
        "weights_used": fusion.weights_used,
        "policy_version": POLICY_VERSION,
        "model_versions": fusion.model_versions,
        "reason_codes": [r["code"] for r in fusion.reason_codes],
        "latency_ms": latency_ms,
        "expected_exposure_inr": expected_exposure,
    })

    return RiskScoreResponse(
        tx_id=tx.tx_id,
        risk_score=fusion.final_score,
        decision=decision,
        reason_codes=[RiskFactor(**r) for r in fusion.reason_codes],
        model_versions=fusion.model_versions,
        latency_ms=latency_ms,
        policy_version=POLICY_VERSION,
        correlation_id=correlation_id,
        ensemble_scores=fusion.ensemble_scores,
        weights_used=fusion.weights_used,
        stage_latencies=stage_latencies,
        is_degraded=fusion.is_degraded,
        disagreement_index=fusion.disagreement_index,
        customer_explanation=customer_exp,
        expected_exposure_inr=expected_exposure,
        city=city,
        loss_matrix={
            "cost_approve": loss_data["cost_approve_inr"],
            "cost_step_up": loss_data["cost_step_up_inr"],
            "cost_block": loss_data["cost_block_inr"],
            "min_expected_loss": loss_data["min_expected_loss_inr"],
        },
        model_security_status="MANIPULATION_DETECTED" if sec_check["is_manipulated"] else "SECURE",
        confidence_score=calib["confidence_pct"],
        counterfactuals=counterfactuals,
        sequence_fingerprint=seq_check["fingerprint_type"],
    )


@router.get("/ledger")
def get_risk_decision_ledger(limit: int = 50):
    """Retrieve immutable forensic decision ledger entries."""
    return {"ledger": ledger_service.get_ledger(limit)}


@router.get("/ledger/verify")
def verify_risk_decision_ledger():
    """Cryptographically audit and verify SHA-256 hash-chain integrity of the decision ledger."""
    return ledger_service.verify_integrity()



@router.get("/{tx_id}")
def get_decision(tx_id: str, db: Session = Depends(get_db)):
    tx = db.get(models.Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    rd = (
        db.query(models.RiskDecision)
        .filter(models.RiskDecision.tx_id == tx_id)
        .order_by(models.RiskDecision.id.desc())
        .first()
    )
    return {
        "tx_id": tx.tx_id,
        "user_id": tx.user_id,
        "merchant_id": tx.merchant_id,
        "amount": tx.amount,
        "status": tx.status,
        "decision": rd.decision if rd else None,
        "score": rd.score if rd else None,
        "reason_codes": rd.reason_codes if rd else [],
        "model_versions": rd.model_versions if rd else {},
        "latency_ms": rd.latency_ms if rd else None,
    }
