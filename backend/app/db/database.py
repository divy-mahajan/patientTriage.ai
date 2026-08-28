"""
PatientTriage.ai — Database Engine & Session Management
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# SQLite specific thread check exemption
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables and perform non-destructive SQLite column additions if needed."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            # Check patients table columns
            result = conn.execute(text("PRAGMA table_info(patients)")).fetchall()
            existing_cols = [r[1] for r in result]
            new_cols = [
                ("predicted_triage_level", "INTEGER"),
                ("triage_level_name", "VARCHAR(64)"),
                ("risk_score", "FLOAT"),
                ("is_high_risk", "BOOLEAN DEFAULT 0"),
                ("confidence", "FLOAT"),
                ("age_group", "VARCHAR(32)"),
                ("data_quality", "VARCHAR(32)"),
                ("last_reassessment_timestamp", "DATETIME"),
                ("monitoring_status", "VARCHAR(32) DEFAULT 'STABLE'"),
                ("vitals_history", "TEXT"),
                ("clinician_override_level", "INTEGER"),
                ("clinician_override_reason", "TEXT")
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE patients ADD COLUMN {col_name} {col_type}"))
            conn.commit()
        except Exception as e:
            print(f"Column migration note: {e}")


def get_db():
    """FastAPI Dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
