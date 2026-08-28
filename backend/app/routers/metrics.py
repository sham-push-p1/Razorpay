from fastapi import APIRouter
from app.services.metrics_service import metrics

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
def get_metrics():
    return metrics.snapshot()
