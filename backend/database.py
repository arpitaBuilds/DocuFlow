import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

db_url = os.getenv("DATABASE_URL", "sqlite:///./docuflow.db")

try:
    if db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    else:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            pass
except Exception as exc:
    logging.warning(f"Database connection to '{db_url}' failed ({exc}). Falling back to SQLite.")
    db_url = "sqlite:///./docuflow.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()