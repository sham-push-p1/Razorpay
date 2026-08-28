"""
Counterfactual Explainability Engine.
Computes actionable "What-If" feature interventions showing exactly how a decision can be flipped from BLOCK -> STEP-UP -> APPROVE.
"""
from typing import Dict, Any, List


class CounterfactualService:
    def generate_counterfactuals(
        self,
        current_score: float,
        reason_codes: List[Dict[str, Any]],
        amount: float,
        is_new_device: bool,
        velocity_count: int,
    ) -> Dict[str, Any]:
        """
        Generates actionable counterfactual intervention simulations.
        """
        simulations = []

        # 1. Counterfactual: If device was trusted / recognized
        if is_new_device or any("DEVICE" in r.get("code", "") for r in reason_codes):
            reduced_score = max(5.0, current_score - 24.0)
            simulations.append({
                "factor": "Trusted Device Recognition",
                "hypothesis": "If customer completes transaction from a known trusted device",
                "simulated_score": round(reduced_score, 1),
                "simulated_decision": "APPROVE" if reduced_score <= 30 else "STEP-UP",
                "delta": -24.0,
            })

        # 2. Counterfactual: If transaction velocity was at normal baseline (1 req/min)
        if velocity_count > 1 or any("VELOCITY" in r.get("code", "") for r in reason_codes):
            reduced_score = max(8.0, current_score - 18.0)
            simulations.append({
                "factor": "Normalized Velocity Cadence",
                "hypothesis": "If request interval returns to typical human pace (>60s)",
                "simulated_score": round(reduced_score, 1),
                "simulated_decision": "APPROVE" if reduced_score <= 30 else "STEP-UP",
                "delta": -18.0,
            })

        # 3. Counterfactual: If Step-Up 2FA / Passkey challenge succeeds
        reduced_score_2fa = max(12.0, min(28.0, current_score - 48.0))
        simulations.append({
            "factor": "Biometric / OTP Step-Up Success",
            "hypothesis": "If customer verifies dynamic out-of-band 2FA authentication",
            "simulated_score": round(reduced_score_2fa, 1),
            "simulated_decision": "APPROVE",
            "delta": round(reduced_score_2fa - current_score, 1),
        })

        recommended_action = "STEP-UP 2FA AUTHENTICATION" if current_score > 30 else "IMMEDIATE APPROVAL"

        return {
            "current_score": current_score,
            "simulations": simulations,
            "recommended_resolution": recommended_action,
            "explanation": f"Transaction score ({current_score}) can be flipped to APPROVE ({simulations[-1]['simulated_score']}) via 2FA step-up verification.",
        }


counterfactual_service = CounterfactualService()
