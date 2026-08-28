"""
Real-Time Feature Service (Layer 3 of the architecture).

Builds a feature vector from transaction, device, IP and velocity signals.
Velocity counters come from the in-process HotStore (Redis stand-in).
"""
from dataclasses import dataclass, field
from typing import Dict, Any

from app.core.state import hot_store


@dataclass
class FeatureVector:
    amount: float
    amount_vs_baseline_ratio: float
    device_first_seen_minutes_ago: float
    device_account_count: int
    velocity_90s: int
    velocity_300s: int
    is_new_device: bool
    ip_recent_user_count: int
    account_age_days: int = 30
    raw: Dict[str, Any] = field(default_factory=dict)


def build_feature_vector(
    user_id: str,
    device_id: str,
    ip_hash: str,
    amount: float,
    baseline_amount: float,
    account_age_days: int = 30,
) -> FeatureVector:
    velocity_key_90 = f"velocity:{user_id}"
    velocity_90s = hot_store.record_event(velocity_key_90, window_seconds=90)
    velocity_300s = hot_store.count(velocity_key_90, window_seconds=300)

    # First-seen tracking: is this the first time we've seen this device at all?
    seen_before = hot_store.get_kv(f"device_seen:{device_id}") is not None
    hot_store.set_kv(f"device_seen:{device_id}", {"seen": True}, ttl_seconds=86400)
    is_new_device = not seen_before

    # Fan-out tracking: how many distinct accounts has this device transacted from?
    device_account_count = hot_store.add_to_set(
        f"device_accounts:{device_id}", user_id, ttl_seconds=86400
    )

    # Fan-out tracking: how many distinct users have transacted from this IP recently?
    ip_recent_user_count = hot_store.add_to_set(
        f"ip_users:{ip_hash}", user_id, ttl_seconds=3600
    )

    baseline = baseline_amount if baseline_amount > 0 else max(amount, 1.0)
    ratio = round(amount / baseline, 2)

    return FeatureVector(
        amount=amount,
        amount_vs_baseline_ratio=ratio,
        device_first_seen_minutes_ago=0 if is_new_device else 999,
        device_account_count=device_account_count,
        velocity_90s=velocity_90s,
        velocity_300s=velocity_300s,
        is_new_device=is_new_device,
        ip_recent_user_count=ip_recent_user_count,
        account_age_days=account_age_days,
        raw={"user_id": user_id, "device_id": device_id, "ip_hash": ip_hash},
    )
