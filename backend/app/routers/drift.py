from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.drift_service import drift_service

router = APIRouter(prefix="/drift", tags=["drift"])


class DriftInjectRequest(BaseModel):
    drift_type: Optional[str] = "adversarial_shift"


@router.get("/status")
def get_drift_status():
    return drift_service.get_drift_status()


@router.post("/inject")
def inject_synthetic_drift(req: DriftInjectRequest):
    return drift_service.inject_drift(req.drift_type or "adversarial_shift")


@router.post("/retrain")
def trigger_online_retraining():
    return drift_service.retrain_model()
