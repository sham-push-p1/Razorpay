from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    user_id: str
    merchant_id: str
    amount: float
    currency: str = "INR"
    device_fingerprint: str
    ip_hash: str
    coarse_geo: Optional[str] = None
    payment_method: str = "card"
    scenario: Optional[str] = None


class RiskFactor(BaseModel):
    code: str
    description: str
    contribution: float


class RiskScoreResponse(BaseModel):
    tx_id: str
    risk_score: float
    decision: str
    reason_codes: List[RiskFactor]
    model_versions: Dict[str, str]
    latency_ms: float
    policy_version: str
    correlation_id: str
    ensemble_scores: Dict[str, float] = Field(default_factory=dict)
    weights_used: Dict[str, float] = Field(default_factory=dict)
    stage_latencies: Dict[str, float] = Field(default_factory=dict)
    is_degraded: bool = False
    disagreement_index: float = 0.0
    customer_explanation: str = ""
    expected_exposure_inr: float = 0.0
    city: Optional[str] = "Bangalore"
    loss_matrix: Dict[str, float] = Field(default_factory=dict)
    model_security_status: str = "SECURE"
    confidence_score: float = 94.0
    counterfactuals: Dict[str, Any] = Field(default_factory=dict)
    sequence_fingerprint: str = "NORMAL_STEADY"


class CaseCreateRequest(BaseModel):
    tx_id: str


class CaseUpdateRequest(BaseModel):
    status: str
    analyst_label: Optional[str] = None


class FeedbackRequest(BaseModel):
    tx_id: str
    outcome: str
    notes: Optional[str] = None


class SimulateAttackRequest(BaseModel):
    scenario: str = Field(
        description="normal_user | credential_stuffing | card_testing | "
        "account_takeover | multi_account_fraud | fraud_ring | velocity_attack"
    )
    count: int = 1
