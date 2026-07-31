"""
database/init_db.py
───────────────────
Run this ONCE to create all tables in PostgreSQL.
It is safe to run multiple times — it will not drop existing data.

Usage:
    python database/init_db.py

After running, open pgAdmin and run:
    SELECT * FROM users;
    SELECT * FROM images;
    SELECT * FROM conversions;
    SELECT * FROM user_activity;
    SELECT * FROM payments;
    SELECT * FROM api_usage;
    SELECT * FROM export_logs;
"""

import sys
import os

# Make sure the parent folder (tech-squad-final-7) is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import Base

def init():
    print("🔌 Connecting to PostgreSQL...")
    try:
        with engine.connect() as conn:
            print("✅ Connected successfully!")
    except Exception as e:
        print(f"❌ Could not connect: {e}")
        print("\nCheck that:")
        print("  1. PostgreSQL is running")
        print("  2. The database 'er_ai_studio' exists")
        print("  3. Username / password in .env or database.py is correct")
        sys.exit(1)

    print("\n📦 Creating tables (if they don't already exist)...")
    Base.metadata.create_all(bind=engine)

    print("\n✅ Done! Tables created:")
    for table in Base.metadata.sorted_tables:
        print(f"   • {table.name}")

    print("\n📋 Now open pgAdmin and run these queries to verify:")
    print("   SELECT * FROM users;")
    print("   SELECT * FROM images;")
    print("   SELECT * FROM conversions;")
    print("   SELECT * FROM user_activity;")
    print("   SELECT * FROM payments;")
    print("   SELECT * FROM api_usage;")
    print("   SELECT * FROM export_logs;")


if __name__ == "__main__":
    init()
