import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from app.core.db import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, default=lambda: gen_id("USR"))
    account_age_days = Column(Integer, default=0)
    baseline_amount = Column(Float, default=0.0)
    baseline_velocity = Column(Float, default=0.0)
    verification_level = Column(String, default="basic")


class Device(Base):
    __tablename__ = "devices"
    device_id = Column(String, primary_key=True, default=lambda: gen_id("DEV"))
    fingerprint_hash = Column(String, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    account_count = Column(Integer, default=1)
    risk_score = Column(Float, default=0.0)


class Transaction(Base):
    __tablename__ = "transactions"
    tx_id = Column(String, primary_key=True, default=lambda: gen_id("TX"))
    user_id = Column(String, index=True)
    merchant_id = Column(String, index=True)
    amount = Column(Float)
    currency = Column(String, default="INR")
    timestamp = Column(DateTime, default=datetime.utcnow)
    device_id = Column(String, index=True)
    ip_hash = Column(String, index=True)
    payment_method = Column(String, default="card")
    status = Column(String, default="pending")


class RiskDecision(Base):
    __tablename__ = "risk_decisions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_id = Column(String, index=True)
    score = Column(Float)
    decision = Column(String)
    reason_codes = Column(JSON)
    model_versions = Column(JSON)
    latency_ms = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class Case(Base):
    __tablename__ = "cases"
    case_id = Column(String, primary_key=True, default=lambda: gen_id("CASE"))
    tx_id = Column(String, index=True)
    status = Column(String, default="open")
    analyst_label = Column(String, nullable=True)
    evidence_refs = Column(JSON, default=list)
    investigation_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_id = Column(String, index=True)
    outcome = Column(String)  # "fraud" | "legit"
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
