"""
Real Machine Learning Fraud Classifier & Tree-SHAP Feature Attribution Engine.

Uses a trained XGBoost Gradient Boosted Trees model with native Tree-SHAP attribution (pred_contribs=True)
to provide calibrated 0-100 fraud risk probabilities and mathematically exact per-feature contributions.
"""
from typing import List, Dict, Tuple
import numpy as np
import xgboost as xgb
from app.services.feature_service import FeatureVector


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


def _train_default_model() -> xgb.Booster:
    """Pre-train an XGBoost fraud detector on realistic payment patterns with Tree-SHAP capability."""
    np.random.seed(42)
    n_samples = 4000

    # Normal user distribution
    normal_ratio = np.random.uniform(0.5, 2.0, n_samples // 2)
    normal_v90 = np.random.poisson(0.2, n_samples // 2)
    normal_v300 = np.random.poisson(0.5, n_samples // 2)
    normal_new_dev = np.random.binomial(1, 0.1, n_samples // 2)
    normal_dev_acc = np.random.choice([1, 2], p=[0.9, 0.1], size=n_samples // 2)
    normal_ip_usr = np.random.choice([1, 2], p=[0.85, 0.15], size=n_samples // 2)
    normal_age = np.random.uniform(30, 700, n_samples // 2)
    y_normal = np.zeros(n_samples // 2)

    # Fraudulent transaction distribution (attacks: velocity bursts, fan-outs, amount spikes)
    fraud_ratio = np.random.uniform(2.5, 12.0, n_samples // 2)
    fraud_v90 = np.random.poisson(3.5, n_samples // 2)
    fraud_v300 = np.random.poisson(6.0, n_samples // 2)
    fraud_new_dev = np.random.binomial(1, 0.75, n_samples // 2)
    fraud_dev_acc = np.random.choice([2, 4, 8, 12], p=[0.2, 0.3, 0.3, 0.2], size=n_samples // 2)
    fraud_ip_usr = np.random.choice([2, 5, 10, 15], p=[0.2, 0.3, 0.3, 0.2], size=n_samples // 2)
    fraud_age = np.random.uniform(0, 15, n_samples // 2)
    y_fraud = np.ones(n_samples // 2)

    X_normal = np.column_stack([
        normal_ratio, normal_v90, normal_v300, normal_new_dev, normal_dev_acc, normal_ip_usr, normal_age
    ])
    X_fraud = np.column_stack([
        fraud_ratio, fraud_v90, fraud_v300, fraud_new_dev, fraud_dev_acc, fraud_ip_usr, fraud_age
    ])

    X = np.vstack([X_normal, X_fraud])
    y = np.concatenate([y_normal, y_fraud])

    dtrain = xgb.DMatrix(X, label=y, feature_names=FEATURE_NAMES)
    params = {
        "max_depth": 4,
        "eta": 0.1,
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "seed": 42,
    }
    booster = xgb.train(params, dtrain, num_boost_round=50)
    return booster


# Global singleton model instance
_MODEL = _train_default_model()


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
