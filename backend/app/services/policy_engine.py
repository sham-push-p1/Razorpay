"""
Adaptive Policy Engine (Layer 8) with dynamic thresholds, emergency kill-switch, and immutable ops audit log.
"""
from typing import Dict, Any, List
from datetime import datetime


class PolicyEngine:
    def __init__(self):
        self.version = "policy-v2.5-enterprise"
        self.approve_threshold = 30.0
        self.step_up_threshold = 70.0
        self.blacklisted_users = set()
        self.blacklisted_devices = set()
        self.blacklisted_ips = set()
        self.auto_step_up_new_device = False
        
        # Emergency Ops Kill-Switch & Immutable Audit Trail
        self.kill_switch_active = False
        self.audit_log: List[Dict[str, Any]] = [
            {
                "id": "AUDIT-001",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "actor": "SystemInit",
                "action": "POLICY_DEPLOYED",
                "details": "Initialized baseline policy thresholds (Approve <= 30, Step-Up <= 70)",
            }
        ]

    def calculate_expected_loss(self, score: float, amount: float) -> Dict[str, Any]:
        """
        Calculates expected business loss for each candidate gateway action:
        - Approve: Risk of full fraud chargeback = P(fraud) * Amount
        - Step-Up: Auth cost + Abandonment on legitimate users = ₹2.50 + 12% * Amount * (1 - P(fraud))
        - Block: Lost merchant margin on false positives = 15% * Amount * (1 - P(fraud))
        """
        p_fraud = max(0.01, min(0.99, score / 100.0))
        p_legit = 1.0 - p_fraud

        cost_approve = round(p_fraud * amount, 2)
        cost_step_up = round(2.50 + (0.12 * amount * p_legit), 2)
        cost_block = round(0.15 * amount * p_legit, 2)

        # Minimum Expected Cost Action
        costs = {
            "APPROVE": cost_approve,
            "STEP-UP": cost_step_up,
            "BLOCK": cost_block,
        }
        optimal_action = min(costs, key=costs.get)

        return {
            "cost_approve_inr": cost_approve,
            "cost_step_up_inr": cost_step_up,
            "cost_block_inr": cost_block,
            "economically_optimal_action": optimal_action,
            "min_expected_loss_inr": costs[optimal_action],
        }

    SIGMA_ESCALATION_THRESHOLD = 18.0

    def decide(
        self,
        score: float,
        user_id: str = "",
        device_id: str = "",
        ip_hash: str = "",
        is_new_device: bool = False,
        sigma: float = 0.0,
        amount: float = 2499.0,
    ) -> str:
        """Evaluate policy with uncertainty arbitration (sigma), kill-switch, and deterministic bands."""
        # 0. Deterministic precision rounding
        score = round(float(score), 2)

        # 1. Emergency Kill-Switch Check
        if self.kill_switch_active:
            return "STEP-UP" if score > self.approve_threshold else "APPROVE"

        # 2. Global Quarantine Blacklist
        if user_id in self.blacklisted_users or device_id in self.blacklisted_devices or ip_hash in self.blacklisted_ips:
            return "BLOCK"

        # 3. Uncertainty-Aware Arbitration (Operationalizing Sigma)
        # When models strongly disagree (sigma >= 18.0), do not blindly APPROVE — escalate to STEP-UP
        if score <= self.approve_threshold and sigma >= self.SIGMA_ESCALATION_THRESHOLD:
            return "STEP-UP"

        # 4. New Device Challenge Policy
        if self.auto_step_up_new_device and is_new_device and score <= self.step_up_threshold:
            return "STEP-UP"

        # 5. Deterministic Score-Based Bands (<= Approve, <= Step-Up, > Block)
        if score <= self.approve_threshold:
            return "APPROVE"
        elif score <= self.step_up_threshold:
            return "STEP-UP"
        else:
            return "BLOCK"

    def get_config(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "approve_threshold": self.approve_threshold,
            "step_up_threshold": self.step_up_threshold,
            "blacklisted_users_count": len(self.blacklisted_users),
            "blacklisted_devices_count": len(self.blacklisted_devices),
            "blacklisted_ips_count": len(self.blacklisted_ips),
            "auto_step_up_new_device": self.auto_step_up_new_device,
            "kill_switch_active": self.kill_switch_active,
            "audit_log": self.audit_log[-20:],
        }

    def update_config(
        self,
        approve_th: float = None,
        step_up_th: float = None,
        auto_step_up_new: bool = None,
        actor: str = "Analyst",
    ):
        changes = []
        if approve_th is not None and approve_th != self.approve_threshold:
            changes.append(f"Approve threshold: {self.approve_threshold} -> {approve_th}")
            self.approve_threshold = float(approve_th)
        if step_up_th is not None and step_up_th != self.step_up_threshold:
            changes.append(f"Step-Up threshold: {self.step_up_threshold} -> {step_up_th}")
            self.step_up_threshold = float(step_up_th)
        if auto_step_up_new is not None and auto_step_up_new != self.auto_step_up_new_device:
            changes.append(f"Auto Step-up New Device: {self.auto_step_up_new_device} -> {auto_step_up_new}")
            self.auto_step_up_new_device = bool(auto_step_up_new)

        if changes:
            self._log_audit(actor, "THRESHOLD_UPDATE", "; ".join(changes))

    def toggle_kill_switch(self, active: bool, actor: str = "SecOps Lead", reason: str = "Flash Sale False-Positive Mitigation"):
        self.kill_switch_active = bool(active)
        action_name = "KILL_SWITCH_ENGAGED" if active else "KILL_SWITCH_DISENGAGED"
        self._log_audit(actor, action_name, f"Reason: {reason}")
        return self.get_config()

    def add_to_blacklist(self, entity_type: str, entity_value: str, actor: str = "Analyst"):
        if entity_type == "user":
            self.blacklisted_users.add(entity_value)
        elif entity_type == "device":
            self.blacklisted_devices.add(entity_value)
        elif entity_type == "ip":
            self.blacklisted_ips.add(entity_value)
        self._log_audit(actor, "BLACKLIST_ADDED", f"Added {entity_type}: {entity_value}")

    def _log_audit(self, actor: str, action: str, details: str):
        entry = {
            "id": f"AUDIT-{len(self.audit_log) + 1:03d}",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "actor": actor,
            "action": action,
            "details": details,
        }
        self.audit_log.append(entry)


policy_engine = PolicyEngine()
POLICY_VERSION = policy_engine.version


def decide(score: float, user_id: str = "", device_id: str = "", ip_hash: str = "", is_new_device: bool = False) -> str:
    return policy_engine.decide(score, user_id, device_id, ip_hash, is_new_device)
