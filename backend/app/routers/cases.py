from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.db import get_db
from app.models import models
from app.models.schemas import CaseCreateRequest, CaseUpdateRequest
from app.services.investigation_agent import investigation_agent
from app.services.graph_service import graph_service

router = APIRouter(prefix="/cases", tags=["cases"])


class CopilotQueryRequest(BaseModel):
    query: str


@router.get("")
def list_cases(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """List recent cases with optional status filter."""
    query = db.query(models.Case).order_by(models.Case.created_at.desc())
    if status and status != "all":
        query = query.filter(models.Case.status == status)
    cases = query.limit(limit).all()

    results = []
    for c in cases:
        tx = db.get(models.Transaction, c.tx_id)
        results.append({
            "case_id": c.case_id,
            "tx_id": c.tx_id,
            "status": c.status,
            "analyst_label": c.analyst_label,
            "evidence_refs": c.evidence_refs,
            "investigation_report": c.investigation_report,
            "amount": tx.amount if tx else 0.0,
            "user_id": tx.user_id if tx else "Unknown",
            "device_id": tx.device_id if tx else "Unknown",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return {"cases": results}


@router.post("")
def create_case(payload: CaseCreateRequest, db: Session = Depends(get_db)):
    tx = db.get(models.Transaction, payload.tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    rd = (
        db.query(models.RiskDecision)
        .filter(models.RiskDecision.tx_id == payload.tx_id)
        .order_by(models.RiskDecision.id.desc())
        .first()
    )

    graph_metrics = graph_service.analyze_entity_risk(tx.user_id, tx.device_id, tx.ip_hash)
    dossier = investigation_agent.generate_dossier(
        tx_id=tx.tx_id,
        user_id=tx.user_id,
        amount=tx.amount,
        score=rd.score if rd else 0.0,
        decision=rd.decision if rd else "MANUAL_REVIEW",
        reason_codes=rd.reason_codes if rd else [],
        device_id=tx.device_id,
        ip_hash=tx.ip_hash,
        graph_metrics=graph_metrics,
    )

    evidence_refs = [payload.tx_id, f"DEV:{tx.device_id}", f"IP:{tx.ip_hash}"]
    case = models.Case(
        tx_id=payload.tx_id,
        status="open",
        evidence_refs=evidence_refs,
        investigation_report=dossier,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {
        "case_id": case.case_id,
        "tx_id": case.tx_id,
        "status": case.status,
        "evidence_refs": case.evidence_refs,
        "investigation_report": case.investigation_report,
    }


@router.get("/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    tx = db.get(models.Transaction, case.tx_id)
    rd = db.query(models.RiskDecision).filter(models.RiskDecision.tx_id == case.tx_id).order_by(models.RiskDecision.id.desc()).first()
    
    return {
        "case_id": case.case_id,
        "tx_id": case.tx_id,
        "status": case.status,
        "analyst_label": case.analyst_label,
        "evidence_refs": case.evidence_refs,
        "investigation_report": case.investigation_report,
        "transaction": {
            "amount": tx.amount if tx else 0.0,
            "user_id": tx.user_id if tx else "Unknown",
            "device_id": tx.device_id if tx else "Unknown",
            "ip_hash": tx.ip_hash if tx else "Unknown",
            "score": rd.score if rd else 0.0,
            "decision": rd.decision if rd else "NONE",
            "reason_codes": rd.reason_codes if rd else [],
        }
    }


@router.patch("/{case_id}")
def update_case(case_id: str, payload: CaseUpdateRequest, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.status = payload.status
    if payload.analyst_label:
        case.analyst_label = payload.analyst_label
    db.commit()
    return {"case_id": case.case_id, "status": case.status, "analyst_label": case.analyst_label}


@router.post("/{case_id}/copilot")
def query_case_copilot(case_id: str, payload: CopilotQueryRequest, db: Session = Depends(get_db)):
    """Ask the AI Investigator questions about this case."""
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    tx = db.get(models.Transaction, case.tx_id)
    rd = db.query(models.RiskDecision).filter(models.RiskDecision.tx_id == case.tx_id).order_by(models.RiskDecision.id.desc()).first()

    context = {
        "case_id": case_id,
        "tx_id": case.tx_id,
        "user_id": tx.user_id if tx else "Unknown",
        "score": rd.score if rd else 0.0,
        "reason_codes": rd.reason_codes if rd else [],
    }
    return investigation_agent.answer_analyst_query(payload.query, context)


@router.post("/{case_id}/ask")
def query_case_ask_alias(case_id: str, payload: CopilotQueryRequest, db: Session = Depends(get_db)):
    """Alias for query_case_copilot."""
    return query_case_copilot(case_id, payload, db)


@router.post("/{case_id}/investigate")
def re_investigate_case(case_id: str, db: Session = Depends(get_db)):
    """Regenerate complete forensic investigation dossier for this case."""
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    tx = db.get(models.Transaction, case.tx_id)
    rd = db.query(models.RiskDecision).filter(models.RiskDecision.tx_id == case.tx_id).order_by(models.RiskDecision.id.desc()).first()

    graph_metrics = graph_service.analyze_entity_risk(tx.user_id, tx.device_id, tx.ip_hash) if tx else {}
    dossier = investigation_agent.generate_dossier(
        tx_id=case.tx_id,
        user_id=tx.user_id if tx else "Unknown",
        amount=tx.amount if tx else 0.0,
        score=rd.score if rd else 0.0,
        decision=rd.decision if rd else "REVIEW",
        reason_codes=rd.reason_codes if rd else [],
        device_id=tx.device_id if tx else "",
        ip_hash=tx.ip_hash if tx else "",
        graph_metrics=graph_metrics,
    )
    case.investigation_report = dossier
    db.commit()
    return {"case_id": case_id, "investigation_report": dossier}
