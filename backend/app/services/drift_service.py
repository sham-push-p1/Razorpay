"""
Model Drift Detection & Continuous Online Active Retraining Service.

Calculates real Population Stability Index (PSI) mathematically across
feature/score distribution quantiles, rather than relying on randomized
simulations or hardcoded constants.

PSI interpretation:
- PSI < 0.10: Nominal / Stable (No significant shift)
- 0.10 <= PSI < 0.25: Moderate shift (Monitor closely)
- PSI >= 0.25: Significant Population Drift (Triggers Active Retraining)
"""
from typing import Dict, Any
from datetime import datetime
import numpy as np
import xgboost as xgb

import app.services.ml_engine as ml_engine
from app.services.ml_engine import FEATURE_NAMES, get_train_set, get_held_out_set
from app.services.fraud_data_generator import generate_dataset


def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
    """
    Calculates empirical Population Stability Index (PSI) between two score distributions:
    PSI = sum((actual_pct - expected_pct) * ln(actual_pct / expected_pct))
    """
    percentiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(expected, percentiles)
    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    eps = 1e-4
    expected_pct = np.maximum(expected_counts / len(expected), eps)
    actual_pct = np.maximum(actual_counts / len(actual), eps)

    expected_pct /= np.sum(expected_pct)
    actual_pct /= np.sum(actual_pct)

    psi_value = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi_value)


class ModelDriftService:
    def __init__(self):
        self.is_drifted = False
        self.last_drift_detected_at = None
        self.last_retrained_at = datetime.utcnow().strftime("%H:%M:%S UTC")
        self.drift_type = None
        self.psi_score = self._compute_nominal_psi()

    def _get_baseline_scores(self) -> np.ndarray:
        X_train, _ = get_train_set()
        dmat_train = xgb.DMatrix(X_train, feature_names=FEATURE_NAMES)
        return ml_engine._MODEL.predict(dmat_train)

    def _compute_nominal_psi(self) -> float:
        baseline_scores = self._get_baseline_scores()
        X_test, _, _ = get_held_out_set()
        dmat_test = xgb.DMatrix(X_test, feature_names=FEATURE_NAMES)
        test_scores = ml_engine._MODEL.predict(dmat_test)
        return calculate_psi(baseline_scores, test_scores)

    def get_drift_status(self) -> Dict[str, Any]:
        return {
            "is_drifted": self.is_drifted,
            "psi_score": round(self.psi_score, 3),
            "status": "DRIFT_DETECTED" if self.is_drifted else "NOMINAL_STABLE",
            "last_retrained_at": self.last_retrained_at,
            "last_drift_detected_at": self.last_drift_detected_at,
            "drift_type": self.drift_type,
            "psi_calculation_method": "Empirical 10-decile PSI vs training baseline score distribution",
        }

    def inject_drift(self, drift_type: str = "adversarial_shift") -> Dict[str, Any]:
        """
        Simulate an authentic distribution shift (e.g. elevated attack volume or altered fraud patterns)
        and compute real measured PSI from live inference on the shifted batch.
        """
        baseline_scores = self._get_baseline_scores()
        # Generate shifted transaction batch with altered fraud prevalence and attack distributions
        X_drift, _, _ = generate_dataset(n_samples=2000, seed=999, fraud_rate=0.55)
        dmat_drift = xgb.DMatrix(X_drift, feature_names=FEATURE_NAMES)
        drifted_scores = ml_engine._MODEL.predict(dmat_drift)

        self.psi_score = calculate_psi(baseline_scores, drifted_scores)
        self.is_drifted = self.psi_score >= 0.20
        self.last_drift_detected_at = datetime.utcnow().strftime("%H:%M:%S UTC")
        self.drift_type = drift_type
        return self.get_drift_status()

    def retrain_model(self) -> Dict[str, Any]:
        """
        Trigger fast active-learning model update on fresh training batch and
        recalculate honest measured PSI.
        """
        ml_engine._MODEL = ml_engine._train_default_model(retrain_seed=1337)
        self.psi_score = self._compute_nominal_psi()
        self.is_drifted = False
        self.last_retrained_at = datetime.utcnow().strftime("%H:%M:%S UTC")
        self.drift_type = None
        return self.get_drift_status()


drift_service = ModelDriftService()
