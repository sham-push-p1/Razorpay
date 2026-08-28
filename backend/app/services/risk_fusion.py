"""
Risk Fusion Engine (Layer 7) with Ensemble Disagreement and Chaos Degradation.
"""
from dataclasses import dataclass
from typing import List, Dict, Any
import numpy as np
import time

from app.services.risk_models import ml_score, anomaly_score, graph_score, rule_score, MODEL_VERSIONS
from app.services.feature_service import FeatureVector
from app.services.chaos_service import chaos_service


@dataclass
class FusionResult:
    final_score: float
    reason_codes: List[dict]
    model_versions: Dict[str, str]
    ensemble_scores: Dict[str, float]
    weights_used: Dict[str, float]
    stage_latencies: Dict[str, float]
    is_degraded: bool
    disagreement_index: float


def fuse(fv: FeatureVector) -> FusionResult:
    stage_latencies = {}

    # Base nominal weights
    base_weights = {
        "ml": 0.50,
        "anomaly": 0.25,
        "graph": 0.20,
        "rules": 0.05,
    }

    # 1. Evaluate ML Model
    t0 = time.perf_counter()
    if not chaos_service.ml_offline:
        ml = ml_score(fv)
    else:
        ml = type("DummyOutput", (), {"score": 0.0, "reasons": [{"code": "CHAOS_ML_OFFLINE", "description": "ML Subsystem offline — running in degraded fallback mode", "contribution": 0}]})()
    stage_latencies["ml_inference_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # 2. Evaluate Anomaly Model
    t0 = time.perf_counter()
    if not chaos_service.anomaly_offline:
        anomaly = anomaly_score(fv)
    else:
        anomaly = type("DummyOutput", (), {"score": 0.0, "reasons": [{"code": "CHAOS_ANOMALY_OFFLINE", "description": "Anomaly model offline", "contribution": 0}]})()
    stage_latencies["anomaly_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # 3. Evaluate Graph Intelligence
    t0 = time.perf_counter()
    if not chaos_service.graph_offline:
        graph = graph_score(fv)
    else:
        graph = type("DummyOutput", (), {"score": 0.0, "reasons": [{"code": "CHAOS_GRAPH_OFFLINE", "description": "Graph Engine offline — running in degraded fallback mode", "contribution": 0}]})()
    stage_latencies["graph_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # 4. Evaluate Safety Rules
    t0 = time.perf_counter()
    if not chaos_service.rules_offline:
        rules = rule_score(fv)
    else:
        rules = type("DummyOutput", (), {"score": 0.0, "reasons": [{"code": "CHAOS_RULES_OFFLINE", "description": "Rules engine offline", "contribution": 0}]})()
    stage_latencies["rules_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # Active status
    is_active = {
        "ml": not chaos_service.ml_offline,
        "anomaly": not chaos_service.anomaly_offline,
        "graph": not chaos_service.graph_offline,
        "rules": not chaos_service.rules_offline,
    }

    is_degraded = not all(is_active.values())

    active_weight_sum = sum(base_weights[k] for k, active in is_active.items() if active)

    # Dynamic Weight Renormalization
    if active_weight_sum > 0:
        weights_used = {
            k: round(base_weights[k] / active_weight_sum, 4) if is_active[k] else 0.0
            for k in base_weights
        }
    else:
        weights_used = {k: 0.0 for k in base_weights}

    # If ALL models down, fail safe to fixed STEP-UP score 50.0
    if active_weight_sum == 0:
        final = 50.0
        reasons = [{"code": "CHAOS_FULL_OUTAGE_FAILSAFE", "description": "Complete subsystem outage — default to STEP-UP challenge for safety", "contribution": 100}]
    elif rules.score >= 100 and is_active["rules"]:
        final = 100.0
        reasons = ml.reasons + anomaly.reasons + graph.reasons + rules.reasons
    else:
        final = (
            weights_used["ml"] * ml.score
            + weights_used["anomaly"] * anomaly.score
            + weights_used["graph"] * graph.score
            + weights_used["rules"] * rules.score
        )
        reasons = ml.reasons + anomaly.reasons + graph.reasons + rules.reasons

    reasons.sort(key=lambda r: r.get("contribution", 0), reverse=True)

    # Compute Ensemble Disagreement Index (Standard Deviation across active scores)
    active_scores = []
    if is_active["ml"]:
        active_scores.append(ml.score)
    if is_active["anomaly"]:
        active_scores.append(anomaly.score)
    if is_active["graph"]:
        active_scores.append(graph.score)

    disagreement = float(np.std(active_scores)) if len(active_scores) > 1 else 0.0

    ensemble_scores = {
        "ml": round(ml.score, 1),
        "anomaly": round(anomaly.score, 1),
        "graph": round(graph.score, 1),
        "rules": round(rules.score, 1),
    }

    return FusionResult(
        final_score=round(min(max(final, 0.0), 100.0), 2),
        reason_codes=reasons,
        model_versions=MODEL_VERSIONS,
        ensemble_scores=ensemble_scores,
        weights_used=weights_used,
        stage_latencies=stage_latencies,
        is_degraded=is_degraded,
        disagreement_index=round(disagreement, 2),
    )
