"""
Shared Synthetic Transaction Data Generator.

Single source of truth for labeled transaction data used by BOTH model training
(ml_engine.py) and held-out evaluation (evaluation_service.py). This matters:
if training and evaluation use different, independently-tuned distributions
(as the two previously did), the "held-out" metrics aren't measuring
generalization to anything real - they're measuring performance on an easier
or harder synthetic set than the model ever trained on.

Design goal: realistic overlap between fraud and normal classes, not clean
separation. Real fraud detectors don't get 99%+ precision AND recall
simultaneously - genuine fraud sometimes looks quiet (low-and-slow, single
compromised device) and genuine users sometimes look spiky (real shopping
sprees, family-shared devices, office wifi). A model trained/evaluated on
data where the two classes never overlap will report inflated metrics that
don't mean anything.

Feature order matches FEATURE_NAMES in ml_engine.py:
  0: amount_vs_baseline_ratio
  1: velocity_90s
  2: velocity_300s
  3: is_new_device
  4: device_account_count
  5: ip_recent_user_count
  6: account_age_days
"""
from typing import Tuple
import numpy as np

# Realistic fraud prevalence - not a balanced 50/50 split. Most industry
# fraud detection datasets sit in the 1-20% positive range; we use 15%
# (elevated vs. real card networks) since a hackathon demo needs enough
# positive examples in a small held-out set to make precision/recall stable.
DEFAULT_FRAUD_RATE = 0.15


def generate_dataset(n_samples: int = 8000, seed: int = 42, fraud_rate: float = DEFAULT_FRAUD_RATE):
    """
    Generates a labeled transaction dataset with realistic overlap between
    fraud and normal classes.

    Returns:
        X: (n_samples, 7) feature matrix
        y: (n_samples,) binary labels (1 = fraud)
        amounts: (n_samples,) transaction amount in INR, for cost-based metrics
    """
    rng = np.random.default_rng(seed)
    n_fraud = int(n_samples * fraud_rate)
    n_normal = n_samples - n_fraud

    # ---- Normal transactions (label = 0) ----
    # Amount ratio: centered near baseline, but a real fat tail exists
    # (payday purchases, one-off big-ticket buys) that overlaps with fraud.
    normal_ratio = rng.lognormal(mean=0.0, sigma=0.45, size=n_normal)
    normal_ratio = np.clip(normal_ratio, 0.1, 8.0)

    # Velocity: mostly quiet, but bill-splitting / retry-after-decline
    # produces a genuine burst tail that overlaps with fraud velocity.
    normal_v90 = rng.poisson(lam=0.25, size=n_normal)
    normal_v300 = normal_v90 + rng.poisson(lam=0.35, size=n_normal)

    # New device: legitimate new-phone / reinstall rate.
    normal_new_dev = rng.binomial(1, 0.12, size=n_normal)

    # Device/IP fan-out: mostly solo, but shared family devices / office wifi
    # are common and genuinely overlap with fraud's fan-out signal.
    normal_dev_acc = rng.choice([1, 2, 3], p=[0.82, 0.13, 0.05], size=n_normal)
    normal_ip_usr = rng.choice([1, 2, 3, 4], p=[0.75, 0.15, 0.06, 0.04], size=n_normal)

    # Account age: skews old, but includes genuinely new legitimate users.
    normal_age = rng.exponential(scale=250, size=n_normal)
    normal_age = np.clip(normal_age, 0, 2000)

    # ---- Fraudulent transactions (label = 1) ----
    # Bimodal: half look like "spike" attacks (large one-off), half look
    # like "low-and-slow" / card-testing (small, quiet, blending in).
    is_spike = rng.binomial(1, 0.5, size=n_fraud).astype(bool)
    fraud_ratio = np.where(
        is_spike,
        rng.lognormal(mean=1.4, sigma=0.5, size=n_fraud),   # spike: big
        rng.lognormal(mean=-1.1, sigma=0.4, size=n_fraud),  # card-testing: small
    )
    fraud_ratio = np.clip(fraud_ratio, 0.05, 15.0)

    fraud_v90 = np.where(
        is_spike,
        rng.poisson(lam=2.5, size=n_fraud),
        rng.poisson(lam=0.4, size=n_fraud),  # low-and-slow: deliberately quiet
    )
    fraud_v300 = fraud_v90 + np.where(
        is_spike,
        rng.poisson(lam=3.5, size=n_fraud),
        rng.poisson(lam=1.2, size=n_fraud),
    )

    # ~30% of fraud is account-takeover on an already-trusted device, not a
    # brand-new one - this is exactly the overlap that makes ATO hard to catch.
    fraud_new_dev = rng.binomial(1, 0.68, size=n_fraud)

    # Device/IP fan-out: elevated on average, but solo-device fraud
    # (single compromised account, no ring) genuinely looks like normal=1.
    fraud_dev_acc = np.where(
        rng.binomial(1, 0.25, size=n_fraud).astype(bool),
        1,  # solo fraud, no fan-out signal
        rng.choice([2, 4, 6, 10], p=[0.35, 0.30, 0.20, 0.15], size=n_fraud),
    )
    fraud_ip_usr = np.where(
        rng.binomial(1, 0.25, size=n_fraud).astype(bool),
        1,
        rng.choice([2, 5, 8, 12], p=[0.35, 0.30, 0.20, 0.15], size=n_fraud),
    )

    # Account age: mostly new/burner accounts, but ATO on old accounts
    # produces a genuine long tail into "trusted" age territory.
    fraud_age = np.where(
        is_spike,
        rng.exponential(scale=4, size=n_fraud),        # fresh burner accounts
        rng.exponential(scale=180, size=n_fraud),       # ATO on aged accounts
    )
    fraud_age = np.clip(fraud_age, 0, 1500)

    # ---- Assemble ----
    X_normal = np.column_stack([
        normal_ratio, normal_v90, normal_v300, normal_new_dev,
        normal_dev_acc, normal_ip_usr, normal_age,
    ])
    X_fraud = np.column_stack([
        fraud_ratio, fraud_v90, fraud_v300, fraud_new_dev,
        fraud_dev_acc, fraud_ip_usr, fraud_age,
    ])

    # ---- Genuine non-separability floor ----
    # A meaningful slice of real fraud is a single compromised account with
    # no velocity, device, or fan-out signal at all - indistinguishable from
    # a normal transaction on these 7 tabular features alone. That's exactly
    # why the real pipeline adds graph and behavioral-sequence signals on top
    # of this tabular model rather than relying on it alone. Mirroring that
    # here means this model genuinely cannot resolve ~14% of fraud cases -
    # and a small slice of normal users will legitimately look risky.
    hard_fraud_mask = rng.binomial(1, 0.14, size=n_fraud).astype(bool)
    n_hard_fraud = int(hard_fraud_mask.sum())
    if n_hard_fraud > 0:
        mimic_idx = rng.integers(0, n_normal, size=n_hard_fraud)
        X_fraud[hard_fraud_mask] = X_normal[mimic_idx]

    noisy_normal_mask = rng.binomial(1, 0.04, size=n_normal).astype(bool)
    n_noisy_normal = int(noisy_normal_mask.sum())
    if n_noisy_normal > 0:
        mimic_idx = rng.integers(0, n_fraud, size=n_noisy_normal)
        X_normal[noisy_normal_mask] = X_fraud[mimic_idx]

    X = np.vstack([X_normal, X_fraud]).astype(float)
    y = np.concatenate([np.zeros(n_normal), np.ones(n_fraud)])

    # Synthetic transaction amounts (INR), independent baseline * ratio,
    # used only for false-positive/false-negative cost reporting.
    baseline = rng.lognormal(mean=6.8, sigma=0.6, size=n_samples)  # median ~₹900
    amounts = np.clip(baseline * (X[:, 0] / np.median(X[:, 0])), 10, 500_000)

    # Shuffle so class order isn't positional.
    perm = rng.permutation(n_samples)
    return X[perm], y[perm], amounts[perm]
