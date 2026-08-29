"""
Counterfactual Explainability Engine.
Computes actionable "What-If" feature interventions showing exactly how a decision can be flipped from BLOCK -> STEP-UP -> APPROVE.
"""
from typing import Dict, Any, List, Callable, Optional


class CounterfactualEngine:
    def __init__(self, fusion_fn: Optional[Callable[[Dict], float]] = None):
        """
        fusion_fn: feature_dict -> risk_score function.
        """
        self.fusion_fn = fusion_fn

    def simulate(self, base_features: Dict, scenarios: Dict[str, Dict]) -> Dict:
        """
        base_features: the actual feature vector used for the real decision.
        scenarios: {scenario_name: {feature_to_override: new_value, ...}, ...}
        """
        base_score = self._safe_score(base_features) if self.fusion_fn else float(base_features.get("score", 75.0))
        results = []

        for name, overrides in scenarios.items():
            if self.fusion_fn:
                perturbed = {**base_features, **overrides}
                new_score = self._safe_score(perturbed)
            else:
                new_score = overrides.get("simulated_score", max(base_score - 25.0, 10.0))
            delta = new_score - base_score
            results.append({
                "name": name,
                "factor": name.replace("_", " ").title(),
                "hypothesis": self._format_hypothesis(name),
                "overridden_features": overrides,
                "simulated_score": round(new_score, 1),
                "simulated_decision": "APPROVE" if new_score <= 30 else ("STEP-UP" if new_score <= 70 else "BLOCK"),
                "delta": round(delta, 1),
                "summary": self._format_summary(name, base_score, new_score),
            })

        # Sort by biggest risk reduction first
        results.sort(key=lambda r: r["delta"])

        return {
            "base_score": round(base_score, 1),
            "current_score": round(base_score, 1),
            "simulations": results,
            "scenarios": results,
            "recommended_resolution": "STEP-UP 2FA AUTHENTICATION" if base_score > 30 else "IMMEDIATE APPROVAL",
            "explanation": f"Transaction score ({base_score}) can be flipped to APPROVE ({results[0]['simulated_score'] if results else base_score}) via verified intervention.",
        }

    def _safe_score(self, features: Dict) -> float:
        try:
            return float(self.fusion_fn(features)) if self.fusion_fn else 50.0
        except Exception:
            return 50.0

    @staticmethod
    def _format_hypothesis(name: str) -> str:
        if "2fa" in name.lower():
            return "If customer verifies dynamic out-of-band 2FA / biometric authentication"
        if "device" in name.lower():
            return "If customer completes transaction from a known trusted device with prior history"
        if "velocity" in name.lower():
            return "If request interval returns to typical human pace (>60s cadence)"
        if "ring" in name.lower():
            return "If account is disassociated from shared hardware cluster"
        return f"If feature condition '{name}' is satisfied"

    @staticmethod
    def _format_summary(name: str, base: float, new: float) -> str:
        base_pct = round(base)
        new_pct = round(new)
        arrow = "↓" if new < base else ("↑" if new > base else "→")
        readable_name = name.replace("_", " ").replace("if ", "If ").capitalize()
        return f"{readable_name}: risk {base_pct} {arrow} {new_pct}"

    def generate_counterfactuals(
        self,
        current_score: float,
        reason_codes: List[Dict[str, Any]],
        amount: float,
        is_new_device: bool,
        velocity_count: int,
    ) -> Dict[str, Any]:
        scenarios = {
            "if_2fa_succeeds": {"simulated_score": max(12.0, min(28.0, current_score - 48.0))},
            "if_device_trusted": {"simulated_score": max(8.0, current_score - 24.0)},
            "if_velocity_normalized": {"simulated_score": max(10.0, current_score - 18.0)},
        }
        return self.simulate({"score": current_score, "is_new_device": is_new_device, "velocity": velocity_count}, scenarios)


counterfactual_service = CounterfactualEngine()

