"""
Database layer.

For the hackathon prototype we use SQLite through SQLAlchemy instead of a real
Postgres instance (no local Postgres server in this environment). The schema
mirrors the "Core Data Model" section of the architecture doc, so swapping the
connection string for a real Postgres DSN later is a one-line change.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./ai_risk_manager.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
