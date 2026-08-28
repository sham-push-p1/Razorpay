from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import models
from app.models.schemas import FeedbackRequest

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("")
def record_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    fb = models.Feedback(tx_id=payload.tx_id, outcome=payload.outcome, notes=payload.notes)
    db.add(fb)
    db.commit()
    return {"status": "recorded", "tx_id": payload.tx_id, "outcome": payload.outcome}
