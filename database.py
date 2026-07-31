from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:bhavesh2008@localhost:5432/er_ai_studio"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine)

from models import Base

Base.metadata.create_all(bind=engine)