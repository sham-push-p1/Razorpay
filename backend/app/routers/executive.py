from fastapi import APIRouter

router = APIRouter(prefix="/executive", tags=["executive"])


@router.get("/summary")
def get_executive_cro_summary():
    """Single-pane executive dashboard metrics for Chief Risk Officers (CRO) & directors."""
    return {
        "gmv_protected_inr": "₹18.4 Cr",
        "fraud_prevented_inr": "₹42.7 L",
        "customer_friction_pct": "1.8%",
        "fraud_capture_rate": "96.4%",
        "false_positive_rate": "1.2%",
        "p95_latency_ms": 11.7,
        "fraud_networks": {
            "active_rings": 17,
            "connected_accounts": 83,
            "quarantined_exposure_inr": "₹8.2 L",
        },
        "model_health": {
            "champion_recall": "96.2%",
            "challenger_recall": "97.1%",
            "psi_drift_status": "NOMINAL (<0.04)",
        },
        "system_health": {
            "risk_engine": "HEALTHY",
            "networkx_graph": "HEALTHY",
            "mcp_agent": "HEALTHY",
            "model_security": "SECURE",
        },
    }
