from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:bhavesh2008@localhost:5432/er_ai_studio"

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("✅ Connected to PostgreSQL successfully!")
except Exception as e:
    print("❌ Connection failed:", e)