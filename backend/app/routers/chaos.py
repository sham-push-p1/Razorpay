from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.chaos_service import chaos_service

router = APIRouter(prefix="/chaos", tags=["chaos"])


class ChaosUpdateRequest(BaseModel):
    graph_offline: Optional[bool] = None
    ml_offline: Optional[bool] = None
    anomaly_offline: Optional[bool] = None
    rules_offline: Optional[bool] = None
    simulated_latency_ms: Optional[float] = None


@router.get("/status")
def get_chaos_status():
    """Get current chaos injection and degradation state."""
    return chaos_service.get_status()


@router.post("/toggle")
def set_chaos_state(req: ChaosUpdateRequest):
    """Toggle simulated outages and network jitter."""
    return chaos_service.set_chaos(
        graph_offline=req.graph_offline,
        ml_offline=req.ml_offline,
        anomaly_offline=req.anomaly_offline,
        rules_offline=req.rules_offline,
        simulated_latency_ms=req.simulated_latency_ms,
    )


@router.post("/disable/{service}")
def disable_service_route(service: str):
    """Disable specific model service: ml, graph, anomaly, rules, network."""
    return chaos_service.disable_service(service)


@router.post("/enable/{service}")
def enable_service_route(service: str):
    """Enable specific model service: ml, graph, anomaly, rules, network."""
    return chaos_service.enable_service(service)


@router.post("/reset")
def reset_chaos_state():
    """Restore all subsystems to nominal production health."""
    return chaos_service.reset()
