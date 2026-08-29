"""
Real Machine Learning Fraud Classifier & Tree-SHAP Feature Attribution Engine.

Uses a trained XGBoost Gradient Boosted Trees model with native Tree-SHAP attribution (pred_contribs=True)
to provide calibrated 0-100 fraud risk probabilities and mathematically exact per-feature contributions.
"""
from typing import List, Dict, Tuple
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from app.services.feature_service import FeatureVector
from app.services.fraud_data_generator import generate_dataset


FEATURE_NAMES = [
    "amount_vs_baseline_ratio",
    "velocity_90s",
    "velocity_300s",
    "is_new_device",
    "device_account_count",
    "ip_recent_user_count",
    "account_age_days",
]

FEATURE_DESCRIPTIONS = {
    "amount_vs_baseline_ratio": "Transaction amount spike vs historical baseline",
    "velocity_90s": "Burst payment velocity in 90-second window",
    "velocity_300s": "Sustained transaction velocity in 5-minute window",
    "is_new_device": "Unrecognized or first-seen hardware fingerprint",
    "device_account_count": "Device fingerprint shared across multiple accounts",
    "ip_recent_user_count": "IP address cluster fan-out across multiple users",
    "account_age_days": "New user account vulnerability factor",
}

FEATURE_CODES = {
    "amount_vs_baseline_ratio": "ML_AMOUNT_ANOMALY",
    "velocity_90s": "ML_VELOCITY_BURST",
    "velocity_300s": "ML_SUSTAINED_VELOCITY",
    "is_new_device": "ML_NEW_DEVICE",
    "device_account_count": "ML_DEVICE_FANOUT",
    "ip_recent_user_count": "ML_IP_FANOUT",
    "account_age_days": "ML_NEW_ACCOUNT",
}


_PARAMS = {
    "max_depth": 4,
    "eta": 0.1,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "seed": 42,
}


def _fit(X: np.ndarray, y: np.ndarray) -> xgb.Booster:
    dtrain = xgb.DMatrix(X, label=y, feature_names=FEATURE_NAMES)
    return xgb.train(_PARAMS, dtrain, num_boost_round=50)


def _train_default_model(retrain_seed: int = 42) -> xgb.Booster:
    """
    Train (or retrain) the fraud detector on a fresh TRAIN split only.

    The held-out set (_HELD_OUT_X/_Y/_AMOUNTS below) is generated once at
    module load and is never touched here - it stays fixed so that
    evaluation_service's benchmark is always measuring generalization to
    genuinely unseen data, even across retrains triggered by drift_service.
    """
    X, y, _ = generate_dataset(n_samples=6400, seed=retrain_seed)
    return _fit(X, y)


# ---- One-time train/held-out split, shared by ml_engine and evaluation_service ----
# 8000 samples total, 80/20 stratified split. The 20% held-out slice is never
# used for training - by this model or any retrain - only for benchmarking.
_ALL_X, _ALL_Y, _ALL_AMOUNTS = generate_dataset(n_samples=8000, seed=42)
_idx = np.arange(len(_ALL_Y))
_train_idx, _test_idx = train_test_split(
    _idx, test_size=0.2, stratify=_ALL_Y, random_state=42
)

_HELD_OUT_X = _ALL_X[_test_idx]
_HELD_OUT_Y = _ALL_Y[_test_idx]
_HELD_OUT_AMOUNTS = _ALL_AMOUNTS[_test_idx]

# Global singleton model instance - trained ONLY on the train split.
_MODEL = _fit(_ALL_X[_train_idx], _ALL_Y[_train_idx])


def get_held_out_set() -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns (X, y, amounts) for the fixed, never-trained-on held-out set."""
    return _HELD_OUT_X, _HELD_OUT_Y, _HELD_OUT_AMOUNTS


def get_train_set() -> Tuple[np.ndarray, np.ndarray]:
    """Returns (X, y) for the training split - used by services that need to
    train a genuinely separate model (e.g. champion/challenger comparison)
    on the exact same data the production model was trained on, so any
    comparison against it is apples-to-apples."""
    return _ALL_X[_train_idx], _ALL_Y[_train_idx]


def extract_features(fv: FeatureVector) -> np.ndarray:
    return np.array([[
        float(fv.amount_vs_baseline_ratio),
        float(fv.velocity_90s),
        float(fv.velocity_300s),
        1.0 if fv.is_new_device else 0.0,
        float(fv.device_account_count),
        float(fv.ip_recent_user_count),
        float(fv.account_age_days),
    ]])


def predict_with_explanations(fv: FeatureVector) -> Tuple[float, List[Dict]]:
    """
    Computes calibrated XGBoost fraud score and exact per-feature Tree-SHAP attributions.
    Returns:
      - score: calibrated 0-100 float
      - reasons: list of sorted feature explanations with exact Tree-SHAP contribution scores
    """
    x = extract_features(fv)
    dmat = xgb.DMatrix(x, feature_names=FEATURE_NAMES)
    
    # 1. Raw probability score
    prob = float(_MODEL.predict(dmat)[0])
    score = round(prob * 100, 2)

    # 2. Native Tree-SHAP feature attribution: shape (1, 8) -> 7 features + 1 base bias
    shap_vals = _MODEL.predict(dmat, pred_contribs=True)[0]
    feature_shaps = shap_vals[:7]
    base_value = shap_vals[7]

    # Positive SHAP values push log-odds towards fraud
    positive_shaps = [max(0.0, float(v)) for v in feature_shaps]
    total_pos_shap = sum(positive_shaps)

    reasons = []
    if total_pos_shap > 0.001 and score > 20:
        for i, name in enumerate(FEATURE_NAMES):
            s_val = positive_shaps[i]
            if s_val > 0.05:  # significant attribution
                contrib_pct = round((s_val / total_pos_shap) * score, 1)
                reasons.append({
                    "code": FEATURE_CODES[name],
                    "description": f"{FEATURE_DESCRIPTIONS[name]} (Tree-SHAP: +{round(s_val, 3)}, val: {round(x[0, i], 2)})",
                    "contribution": min(contrib_pct, score),
                    "shap_value": round(float(feature_shaps[i]), 4),
                })
    elif score > 20:
        # Fallback if diffuse
        for i, name in enumerate(FEATURE_NAMES):
            if x[0, i] > 2.0 or (i == 3 and x[0, i] == 1.0):
                reasons.append({
                    "code": FEATURE_CODES[name],
                    "description": f"{FEATURE_DESCRIPTIONS[name]} (val: {round(x[0, i], 2)})",
                    "contribution": round(score / 3, 1),
                    "shap_value": round(float(feature_shaps[i]), 4),
                })

    # Sort descending by contribution
    reasons.sort(key=lambda r: r["contribution"], reverse=True)
    return score, reasons
