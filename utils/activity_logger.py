"""
utils/activity_logger.py
─────────────────────────
Helper to log user activity to the user_activity table.
Import and call log_activity() from any route handler.
"""

from sqlalchemy.orm import Session
from models import UserActivity
from typing import Optional
import datetime


def log_activity(
    db: Session,
    activity_type: str,
    user_id: Optional[int] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Insert one row into user_activity.

    Example usage:
        log_activity(db, "login", user_id=1, description="Login successful", ip_address="192.168.1.1")
        log_activity(db, "upload", user_id=1, description="Uploaded er_diagram.png", metadata={"filename": "er_diagram.png", "size_bytes": 245000})
    """
    entry = UserActivity(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.datetime.utcnow(),
        metadata_json=metadata,
    )
    db.add(entry)
    db.commit()
