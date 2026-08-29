"""
Transaction Sequence Fingerprinting & Card-Testing Ladder Detection Engine.
Extracts temporal sequence patterns (increasing-amount laddering, velocity acceleration, inter-txn jitter).
"""
from typing import Dict, Any, List, Union
from datetime import datetime
import time

# Tunable thresholds for INR micro-transactions
MIN_LADDER_LENGTH = 3
SMALL_AMOUNT_CEILING = 500.0
MAX_WINDOW_SECONDS = 300
INCREASING_RATIO_TOLERANCE = 0.0

# User sequence history: user_id -> list of (timestamp, amount)
_USER_SEQUENCES: Dict[str, List[Dict[str, Any]]] = {}


def _to_epoch_seconds(ts: Union[int, float, datetime]) -> float:
    if isinstance(ts, datetime):
        return ts.timestamp()
    return float(ts)


def analyze_ladder(
    recent_transactions: List[Dict],
    min_length: int = MIN_LADDER_LENGTH,
    small_ceiling: float = SMALL_AMOUNT_CEILING,
    max_window_seconds: int = MAX_WINDOW_SECONDS,
) -> Dict:
    """
    Detects card-testing probe patterns in sliding transaction window.
    """
    if len(recent_transactions) < min_length:
        return {
            "flagged": False,
            "ladder_length": 0,
            "amounts": [],
            "window_seconds": 0.0,
            "is_increasing": False,
            "risk_contribution": 0.0,
            "explanation": f"No card-testing pattern detected ({len(recent_transactions)} recent transactions evaluated).",
        }

    txns = sorted(recent_transactions, key=lambda t: _to_epoch_seconds(t.get("timestamp", t.get("time", 0))))

    # Find longest run of small-amount transactions within time window
    best_run: List[Dict] = []
    current_run: List[Dict] = []

    for txn in txns:
        amt = float(txn.get("amount", 0.0))
        t_val = _to_epoch_seconds(txn.get("timestamp", txn.get("time", 0)))

        if amt > small_ceiling:
            if len(current_run) > len(best_run):
                best_run = current_run
            current_run = []
            continue

        if not current_run:
            current_run = [txn]
            continue

        t_start = _to_epoch_seconds(current_run[0].get("timestamp", current_run[0].get("time", 0)))
        elapsed = t_val - t_start
        if elapsed <= max_window_seconds:
            current_run.append(txn)
        else:
            if len(current_run) > len(best_run):
                best_run = current_run
            current_run = [txn]

    if len(current_run) > len(best_run):
        best_run = current_run

    if len(best_run) < min_length:
        # Check classic probe + sudden surge
        amounts = [float(t.get("amount", 0.0)) for t in txns]
        if len(amounts) >= 3 and all(a < 500 for a in amounts[:-1]) and amounts[-1] > 2000:
            return {
                "flagged": True,
                "ladder_length": len(amounts),
                "amounts": amounts,
                "window_seconds": 60.0,
                "is_increasing": True,
                "risk_contribution": 0.85,
                "explanation": f"Card-testing probe detected: micro-charges {amounts[:-1]} followed by ₹{amounts[-1]} surge.",
            }
        return {
            "flagged": False,
            "ladder_length": 0,
            "amounts": [],
            "window_seconds": 0.0,
            "is_increasing": False,
            "risk_contribution": 0.0,
            "explanation": f"No card-testing pattern detected ({len(txns)} recent transactions evaluated).",
        }

    amounts = [float(t.get("amount", 0.0)) for t in best_run]
    t_end = _to_epoch_seconds(best_run[-1].get("timestamp", best_run[-1].get("time", 0)))
    t_start = _to_epoch_seconds(best_run[0].get("timestamp", best_run[0].get("time", 0)))
    window_seconds = max(t_end - t_start, 1.0)
    is_increasing = all(
        amounts[i] <= amounts[i + 1] + INCREASING_RATIO_TOLERANCE for i in range(len(amounts) - 1)
    )

    base_risk = min(0.3 + 0.1 * len(best_run), 0.85)
    risk_contribution = min(base_risk + (0.15 if is_increasing else 0.0), 1.0)
    pattern_desc = "increasing-amount" if is_increasing else "flat small-amount"

    return {
        "flagged": True,
        "ladder_length": len(best_run),
        "amounts": amounts,
        "window_seconds": round(window_seconds, 1),
        "is_increasing": is_increasing,
        "risk_contribution": round(risk_contribution, 2),
        "explanation": (
            f"{len(best_run)} small charges ({pattern_desc}: {amounts}) within "
            f"{window_seconds:.0f}s — consistent with card-testing probe behavior."
        ),
    }


class SequenceFingerprintService:
    def analyze_sequence(self, user_id: str, amount: float) -> Dict[str, Any]:
        now = time.time()
        history = _USER_SEQUENCES.setdefault(user_id, [])
        history.append({"time": now, "timestamp": now, "amount": float(amount)})
        # Keep last 10 transactions
        _USER_SEQUENCES[user_id] = history[-10:]
        seq = _USER_SEQUENCES[user_id]

        if len(seq) < 2:
            return {
                "fingerprint_type": "COLD_BASELINE",
                "sequence_risk_score": 0.0,
                "is_anomalous_sequence": False,
                "inter_tx_avg_seconds": 0.0,
                "amount_ladder_detected": False,
                "history_length": len(seq),
            }

        # Calculate inter-transaction deltas
        time_deltas = [seq[i]["time"] - seq[i - 1]["time"] for i in range(1, len(seq))]
        amounts = [s["amount"] for s in seq]
        avg_delta = sum(time_deltas) / len(time_deltas)

        # Run card testing ladder detection
        ladder_result = analyze_ladder(seq)
        is_ladder = ladder_result["flagged"] or (
            len(amounts) >= 3
            and all(a < 500 for a in amounts[:-1])
            and amounts[-1] > 2000
        )

        # Burst acceleration check (rapid-fire transactions with < 5s jitter)
        is_burst = len(time_deltas) >= 3 and avg_delta < 5.0

        seq_risk = 0.0
        pattern = "NORMAL_STEADY"

        if is_ladder:
            seq_risk = max(ladder_result.get("risk_contribution", 0.8) * 50.0, 45.0)
            pattern = "MICRO_CARD_TEST_LADDER"
        elif is_burst:
            seq_risk = 35.0
            pattern = "BURST_ACCELERATION"

        return {
            "fingerprint_type": pattern,
            "sequence_risk_score": round(seq_risk, 1),
            "is_anomalous_sequence": is_ladder or is_burst,
            "inter_tx_avg_seconds": round(avg_delta, 1),
            "amount_ladder_detected": is_ladder,
            "ladder_details": ladder_result,
            "history_length": len(seq),
        }


sequence_service = SequenceFingerprintService()

