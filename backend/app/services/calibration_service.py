"""
Platt Scaling Risk Calibration & Confidence Engine.

Fits real Platt scaling (logistic regression of the model's raw score
against ground-truth labels) at startup, and reports a real Brier score
measured on the held-out set - not hardcoded constants.

Note on methodology: Platt scaling is fit on the model's own TRAINING
predictions, not the held-out set - the held-out set is reserved for
reporting (both here, as the Brier score, and in evaluation_service.py, as
precision/recall/AUC) so it's never used to fit anything. This is a
deliberate, disclosed simplification versus a three-way train/calibration/
test split (which a production system would use); for a hackathon-scale
demo, fitting on train and *only* reporting on held-out keeps the reported
numbers honest without needing a fourth data split.
"""
from typing import Dict, Any
import math
import numpy as np
import xgboost as xgb
from sklearn.linear_model import LogisticRegression

import app.services.ml_engine as ml_engine
from app.services.ml_engine import FEATURE_NAMES, get_train_set, get_held_out_set


class RiskCalibrationService:
    def __init__(self):
        X_train, y_train = get_train_set()
        dmat = xgb.DMatrix(X_train, feature_names=FEATURE_NAMES)
        raw_scores = ml_engine._MODEL.predict(dmat) * 100.0  # same 0-100 scale used everywhere else

        # Platt scaling: fit P(fraud | raw_score) = sigmoid(a * raw_score + b)
        lr = LogisticRegression()
        lr.fit(raw_scores.reshape(-1, 1), y_train)
        self.platt_a = float(lr.coef_[0][0])
        self.platt_b = float(lr.intercept_[0])

        # Real Brier score, measured on the held-out set (never used to fit
        # the Platt parameters above).
        X_test, y_test, _ = get_held_out_set()
        dmat_test = xgb.DMatrix(X_test, feature_names=FEATURE_NAMES)
        test_raw = ml_engine._MODEL.predict(dmat_test) * 100.0
        test_probs = 1.0 / (1.0 + np.exp(-(self.platt_a * test_raw + self.platt_b)))
        self.running_brier_score = round(float(np.mean((test_probs - y_test) ** 2)), 4)

    def calibrate(self, raw_score: float, disagreement_sigma: float) -> Dict[str, Any]:
        """
        Applies the fitted Platt scaling and calculates a confidence score
        from Platt margin and ensemble disagreement (sigma).
        """
        logit = (self.platt_a * raw_score) + self.platt_b
        calibrated_prob = 1.0 / (1.0 + math.exp(-logit))
        calibrated_score = round(calibrated_prob * 100.0, 1)

        margin_certainty = abs(calibrated_prob - 0.5) * 2.0
        sigma_penalty = min(0.4, (disagreement_sigma / 100.0) * 1.5)

        confidence_pct = max(35.0, min(99.0, (margin_certainty - sigma_penalty) * 100.0))

        if confidence_pct >= 85.0:
            conf_level = "VERY_HIGH"
        elif confidence_pct >= 65.0:
            conf_level = "MODERATE"
        else:
            conf_level = "LOW_UNCERTAIN"

        return {
            "calibrated_score": calibrated_score,
            "calibrated_probability": round(calibrated_prob, 4),
            "confidence_pct": round(confidence_pct, 1),
            "confidence_level": conf_level,
            "brier_score": self.running_brier_score,
            "calibration_method": "Platt Scaling (fit on train, Brier measured on held-out)",
        }


calibration_service = RiskCalibrationService()
