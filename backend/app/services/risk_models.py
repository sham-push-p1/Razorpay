"""
Parallel Risk Intelligence layer (Layers 4-6 of the architecture).

PHASE 1 NOTE: these are deterministic, feature-driven stand-ins for the real
XGBoost / autoencoder / graph models described in the architecture doc. They
exist so the full pipeline (feature service -> fusion -> policy -> dashboard)
is real and testable end-to-end before the actual trained models land in
Phases 2, 4 and 5. Each function has the same signature/output shape a real
model wrapper would have (score 0-100 + reason codes), so swapping in a real
XGBoost predictor later is a drop-in replacement, not a rewrite.
"""
from dataclasses import dataclass
from typing import List
from app.services.feature_service import FeatureVector
from app.services.ml_engine import predict_with_explanations

MODEL_VERSIONS = {
    "ml_model": "xgboost-gradient-boost-v1.0",
    "anomaly_model": "autoencoder-latent-v1.0",
    "graph_model": "networkx-collusion-v1.0",
    "rules": "rules-v1.0",
}


@dataclass
class ModelOutput:
    score: float  # 0-100
    reasons: List[dict]


def ml_score(fv: FeatureVector) -> ModelOutput:
    """Real trained Machine Learning model with feature attributions (Fail-closed on error)."""
    try:
        score, reasons = predict_with_explanations(fv)
        return ModelOutput(score=float(score), reasons=reasons)
    except Exception as e:
        return ModelOutput(
            score=60.0,
            reasons=[{
                "code": "ML_MODEL_ERROR_FAILSAFE",
                "description": f"ML scoring exception ({type(e).__name__}) — escalated to safety STEP-UP threshold",
                "contribution": 60,
            }],
        )


def anomaly_score(fv: FeatureVector) -> ModelOutput:
    """Stand-in for the autoencoder behavioral-anomaly detector (Fail-closed on error)."""
    try:
        reconstruction_error = (
            min(fv.amount_vs_baseline_ratio, 10) * 6
            + (25 if fv.is_new_device else 0)
            + min(fv.velocity_300s, 10) * 3
        )
        score = min(reconstruction_error, 100)
        reasons = []
        if score >= 60:
            reasons.append({
                "code": "BEHAVIORAL_ANOMALY",
                "description": "Transaction deviates from user's typical behavioral pattern",
                "contribution": round(score, 1),
            })
        return ModelOutput(score=float(score), reasons=reasons)
    except Exception as e:
        return ModelOutput(
            score=55.0,
            reasons=[{
                "code": "ANOMALY_MODEL_ERROR_FAILSAFE",
                "description": f"Anomaly scoring exception ({type(e).__name__}) — default to safety score",
                "contribution": 55,
            }],
        )


def graph_score(fv: FeatureVector) -> ModelOutput:
    """Stand-in for graph/GNN collusion & shared-infrastructure risk (Fail-closed on error)."""
    try:
        score = 0.0
        reasons = []

        if fv.device_account_count >= 2 and fv.ip_recent_user_count >= 2:
            score += 45
            reasons.append({
                "code": "GRAPH_RING_DETECTED",
                "description": f"Entity linked to a multi-account collusion ring across shared device/IP nodes",
                "contribution": 45,
            })
        elif fv.device_account_count >= 5:
            score += 50
            reasons.append({
                "code": "DEVICE_FANOUT",
                "description": f"Device linked to {fv.device_account_count} accounts",
                "contribution": 50,
            })
        elif fv.device_account_count >= 2:
            score += 20
            reasons.append({
                "code": "DEVICE_SHARED",
                "description": f"Device linked to {fv.device_account_count} accounts",
                "contribution": 20,
            })

        if fv.ip_recent_user_count >= 4:
            score += 35
            reasons.append({
                "code": "IP_FANOUT",
                "description": f"IP associated with {fv.ip_recent_user_count} users recently",
                "contribution": 35,
            })

        return ModelOutput(score=float(min(score, 100)), reasons=reasons)
    except Exception as e:
        return ModelOutput(
            score=50.0,
            reasons=[{
                "code": "GRAPH_MODEL_ERROR_FAILSAFE",
                "description": f"Graph engine exception ({type(e).__name__}) — default to safety score",
                "contribution": 50,
            }],
        )


def rule_score(fv: FeatureVector) -> ModelOutput:
    """Deterministic safety rules — hard signals, not statistical inference (Fail-closed)."""
    try:
        score = 0.0
        reasons = []
        if fv.velocity_90s >= 8:
            score = 100.0
            reasons.append({
                "code": "RULE_VELOCITY_HARD_STOP",
                "description": "Velocity exceeds hard safety threshold",
                "contribution": 100,
            })
        return ModelOutput(score=float(score), reasons=reasons)
    except Exception as e:
        return ModelOutput(
            score=100.0,
            reasons=[{
                "code": "RULE_ENGINE_ERROR_FAILSAFE",
                "description": f"Rules engine exception ({type(e).__name__}) — defaulting to BLOCK",
                "contribution": 100,
            }],
        )
