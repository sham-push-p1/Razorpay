import random
import string
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.state import hot_store
from app.models.schemas import CheckoutRequest, SimulateAttackRequest
from app.routers.risk import score_transaction

router = APIRouter(prefix="/simulate", tags=["simulate"])


def _rand_id(prefix: str, n=6) -> str:
    return prefix + "-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def _build_scenario_requests(scenario: str, count: int) -> list[CheckoutRequest]:
    reqs = []

    if scenario == "normal_user":
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=_rand_id("USR"),
                merchant_id="merchant-demo",
                amount=round(random.uniform(200, 3000), 2),
                device_fingerprint=_rand_id("DEV"),
                ip_hash=_rand_id("IP"),
                scenario=scenario,
            ))

    elif scenario == "credential_stuffing":
        shared_device = _rand_id("DEV")
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=_rand_id("USR"),
                merchant_id="merchant-demo",
                amount=round(random.uniform(50, 500), 2),
                device_fingerprint=shared_device,
                ip_hash=_rand_id("IP"),
                scenario=scenario,
            ))

    elif scenario == "card_testing":
        user_id = _rand_id("USR")
        device_id = _rand_id("DEV")
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=user_id,
                merchant_id="merchant-demo",
                amount=round(random.uniform(1, 20), 2),  # tiny probing amounts
                device_fingerprint=device_id,
                ip_hash=_rand_id("IP"),
                scenario=scenario,
            ))

    elif scenario == "account_takeover":
        user_id = _rand_id("USR")
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=user_id,
                merchant_id="merchant-demo",
                amount=round(random.uniform(8000, 25000), 2),  # spend far above baseline
                device_fingerprint=_rand_id("DEV"),  # unfamiliar device
                ip_hash=_rand_id("IP"),
                scenario=scenario,
            ))

    elif scenario == "multi_account_fraud":
        shared_device = _rand_id("DEV")
        shared_ip = _rand_id("IP")
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=_rand_id("USR"),
                merchant_id="merchant-demo",
                amount=round(random.uniform(1000, 5000), 2),
                device_fingerprint=shared_device,
                ip_hash=shared_ip,
                scenario=scenario,
            ))

    elif scenario == "fraud_ring":
        shared_device = _rand_id("DEV")
        shared_ip = _rand_id("IP")
        for i in range(count):
            reqs.append(CheckoutRequest(
                user_id=_rand_id("USR"),
                merchant_id="merchant-demo",
                amount=round(random.uniform(3000, 15000), 2),
                device_fingerprint=shared_device if i % 2 == 0 else _rand_id("DEV"),
                ip_hash=shared_ip,
                scenario=scenario,
            ))

    elif scenario == "velocity_attack":
        user_id = _rand_id("USR")
        device_id = _rand_id("DEV")
        for _ in range(count):
            reqs.append(CheckoutRequest(
                user_id=user_id,
                merchant_id="merchant-demo",
                amount=round(random.uniform(500, 2000), 2),
                device_fingerprint=device_id,
                ip_hash=_rand_id("IP"),
                scenario=scenario,
            ))

    elif scenario == "impossible_travel":
        user_id = _rand_id("USR")
        device_id = _rand_id("DEV")
        cities = ["Bangalore", "London", "New York", "Dubai", "Singapore"]
        for i in range(count):
            reqs.append(CheckoutRequest(
                user_id=user_id,
                merchant_id="merchant-demo",
                amount=round(random.uniform(1500, 8000), 2),
                device_fingerprint=device_id,
                ip_hash=_rand_id("IP"),
                coarse_geo=cities[i % len(cities)],
                scenario=scenario,
            ))

    elif scenario == "card_testing_ladder":
        user_id = _rand_id("USR")
        device_id = _rand_id("DEV")
        ip_id = _rand_id("IP")
        ladder_amounts = [10.0, 25.0, 150.0, 450.0, 8500.0, 18500.0, 45000.0]
        for i in range(count):
            amt = ladder_amounts[min(i, len(ladder_amounts) - 1)]
            reqs.append(CheckoutRequest(
                user_id=user_id,
                merchant_id="merchant-demo",
                amount=amt,
                device_fingerprint=device_id,
                ip_hash=ip_id,
                scenario=scenario,
            ))

    else:
        raise ValueError(f"Unknown scenario: {scenario}")

    return reqs


@router.post("/attack")
def simulate_attack(payload: SimulateAttackRequest, db: Session = Depends(get_db)):
    requests = _build_scenario_requests(payload.scenario, payload.count)
    results = []
    for req in requests:
        result = score_transaction(req, db=db)
        results.append(result)
    return {
        "scenario": payload.scenario,
        "count": len(results),
        "results": results,
    }


from app.services.graph_service import graph_service


@router.post("/reset")
def reset_simulation():
    hot_store.reset()
    graph_service.reset()
    return {"status": "reset"}
