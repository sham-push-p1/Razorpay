from fastapi import APIRouter
from app.services.adversarial_ai_service import adversarial_ai_service
from app.services.geo_service import geo_service
from app.services.champion_challenger_service import champion_challenger_service

router = APIRouter(prefix="/innovation", tags=["innovation"])


@router.get("/adversarial/round/{round_num}")
def get_adversarial_round(round_num: int):
    """Execute AI vs AI Adaptive Adversarial Attack & Defense Round."""
    return adversarial_ai_service.run_battle_round(round_num)


@router.get("/geo/heatmap")
def get_city_fraud_heatmap():
    """Real-time city fraud risk index across major Indian metros."""
    return geo_service.get_city_fraud_heatmap()


@router.get("/models/shadow")
def get_champion_challenger_comparison():
    """Champion vs Challenger shadow candidate live model evaluation."""
    return champion_challenger_service.get_shadow_comparison()
