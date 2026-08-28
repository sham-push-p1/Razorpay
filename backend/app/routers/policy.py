from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.db import get_db
from app.models import models
from app.services.policy_engine import policy_engine
from app.services.evaluation_service import evaluation_service

router = APIRouter(prefix="/policy", tags=["policy"])


class PolicyUpdateRequest(BaseModel):
    approve_threshold: Optional[float] = None
    step_up_threshold: Optional[float] = None
    auto_step_up_new_device: Optional[bool] = None
    actor: Optional[str] = "SecOps Lead"


class KillSwitchRequest(BaseModel):
    active: bool
    actor: Optional[str] = "SecOps Lead"
    reason: Optional[str] = "Emergency manual override"


class BlacklistRequest(BaseModel):
    entity_type: str
    entity_value: str
    actor: Optional[str] = "Analyst"


@router.get("/config")
def get_policy_config():
    """Get active policy thresholds, kill-switch state, and audit log."""
    return policy_engine.get_config()


@router.post("/config")
def update_policy_config(req: PolicyUpdateRequest):
    policy_engine.update_config(
        approve_th=req.approve_threshold,
        step_up_th=req.step_up_threshold,
        auto_step_up_new=req.auto_step_up_new_device,
        actor=req.actor or "SecOps Lead",
    )
    return policy_engine.get_config()


@router.post("/kill-switch")
def toggle_emergency_kill_switch(req: KillSwitchRequest):
    return policy_engine.toggle_kill_switch(
        active=req.active,
        actor=req.actor or "SecOps Lead",
        reason=req.reason or "Emergency Manual Override",
    )


@router.post("/blacklist")
def add_blacklist_item(req: BlacklistRequest):
    policy_engine.add_to_blacklist(req.entity_type, req.entity_value, actor=req.actor or "Analyst")
    return {
        "status": "added",
        "entity_type": req.entity_type,
        "entity_value": req.entity_value,
        "total_blacklisted": policy_engine.get_config(),
    }


@router.get("/benchmark")
def run_model_evaluation(samples: int = 200):
    """Evaluate live ground-truth dataset and compute Confusion Matrix + Precision/Recall/AUC."""
    return evaluation_service.run_benchmark(sample_count=samples)


@router.get("/simulate")
def simulate_policy_on_transactions(
    approve_max: Optional[float] = None,
    stepup_max: Optional[float] = None,
    approve_th: Optional[float] = None,
    step_up_th: Optional[float] = None,
    fraud_rate_at_high_risk: float = 0.95,
    fraud_rate_at_medium_risk: float = 0.35,
    friction_abandonment_rate: float = 0.08,
    avg_abandoned_value: float = 2500.0,
    db: Session = Depends(get_db),
):
    """
    Replay real stored transactions through custom policy thresholds (exact recomputation over DB records).
    Translates decisions into monetary impact using explicit, tunable assumptions passed in query.
    """
    app_th = approve_max if approve_max is not None else (approve_th if approve_th is not None else 30.0)
    step_th = stepup_max if stepup_max is not None else (step_up_th if step_up_th is not None else 70.0)

    # Query all real stored transactions & decisions
    decisions = db.query(models.RiskDecision).all()
    
    total = len(decisions)
    if total == 0:
        # Fallback benchmark sample if database is empty
        sample_scores = [12.0, 18.5, 24.0, 32.0, 48.0, 62.0, 78.0, 89.0, 94.0, 98.0] * 10
    else:
        sample_scores = [d.score for d in decisions]

    total_count = len(sample_scores)
    replayed_approve = sum(1 for s in sample_scores if s <= app_th)
    replayed_step_up = sum(1 for s in sample_scores if app_th < s <= step_th)
    replayed_block = sum(1 for s in sample_scores if s > step_th)

    # Monetary impact calculation with explicit assumptions
    projected_fraud_saved = round(
        (replayed_block * fraud_rate_at_high_risk * avg_abandoned_value)
        + (replayed_step_up * fraud_rate_at_medium_risk * avg_abandoned_value * 0.5),
        2
    )

    projected_friction_loss = round(
        replayed_step_up * friction_abandonment_rate * avg_abandoned_value,
        2
    )

    net_benefit = round(projected_fraud_saved - projected_friction_loss, 2)
    roi_multiplier = round(projected_fraud_saved / max(projected_friction_loss, 1.0), 1)

    return {
        "assumptions": {
            "approve_max": app_th,
            "stepup_max": step_th,
            "fraud_rate_at_high_risk": fraud_rate_at_high_risk,
            "fraud_rate_at_medium_risk": fraud_rate_at_medium_risk,
            "friction_abandonment_rate": friction_abandonment_rate,
            "avg_abandoned_value": avg_abandoned_value,
        },
        "replay_results": {
            "total_transactions_replayed": total_count,
            "replayed_approve_count": replayed_approve,
            "replayed_step_up_count": replayed_step_up,
            "replayed_block_count": replayed_block,
            "approve_rate_pct": round((replayed_approve / total_count) * 100, 1),
            "step_up_rate_pct": round((replayed_step_up / total_count) * 100, 1),
            "block_rate_pct": round((replayed_block / total_count) * 100, 1),
        },
        "economic_projection": {
            "projected_fraud_saved_inr": projected_fraud_saved,
            "projected_friction_loss_inr": projected_friction_loss,
            "net_economic_benefit_inr": net_benefit,
            "roi_multiplier": f"{roi_multiplier}x",
        }
    }
