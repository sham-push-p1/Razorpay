"""
Transaction Sequence Fingerprinting & Velocity Acceleration Engine.
Extracts temporal sequence patterns (amount laddering, velocity acceleration, inter-txn jitter).
"""
from typing import Dict, Any, List
import time

# User sequence history: user_id -> list of (timestamp, amount)
_USER_SEQUENCES: Dict[str, List[Dict[str, Any]]] = {}


class SequenceFingerprintService:
    def analyze_sequence(self, user_id: str, amount: float) -> Dict[str, Any]:
        now = time.time()
        history = _USER_SEQUENCES.setdefault(user_id, [])
        history.append({"time": now, "amount": amount})
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

        # 1. Card-testing micro-amount ladder check (e.g., amounts < ₹500 followed by sudden surge)
        is_ladder = (
            len(amounts) >= 3
            and all(a < 500 for a in amounts[:-1])
            and amounts[-1] > 2000
        )

        # 2. Burst acceleration check (rapid-fire transactions with < 5s jitter)
        is_burst = len(time_deltas) >= 3 and avg_delta < 5.0

        seq_risk = 0.0
        pattern = "NORMAL_STEADY"

        if is_ladder:
            seq_risk += 45.0
            pattern = "MICRO_CARD_TEST_LADDER"
        elif is_burst:
            seq_risk += 35.0
            pattern = "BURST_ACCELERATION"

        return {
            "fingerprint_type": pattern,
            "sequence_risk_score": seq_risk,
            "is_anomalous_sequence": is_ladder or is_burst,
            "inter_tx_avg_seconds": round(avg_delta, 1),
            "amount_ladder_detected": is_ladder,
            "history_length": len(seq),
        }


sequence_service = SequenceFingerprintService()
