"""
Database connection setup.
Reads DATABASE_URL from .env so you can change credentials without touching code.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:bhavesh2008@localhost:5432/er_ai_studio"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # automatically reconnect on dropped connections
    echo=False,           # set True to print every SQL statement (useful for debugging)
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Session:
    """
    FastAPI dependency — yields a DB session and closes it after the request.
    Usage in a route:
        @app.get("/something")
        def route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
