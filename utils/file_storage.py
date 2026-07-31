"""
utils/file_storage.py
──────────────────────
Handles saving uploaded ER diagram images to disk.
Returns the file path to store in the images table.
"""

import os
import uuid
import datetime
from pathlib import Path

# Images are saved under:  uploads/YYYY-MM/  (organised by month)
UPLOAD_BASE = Path(__file__).parent.parent / "uploads"


def save_uploaded_image(file_bytes: bytes, original_filename: str, mime_type: str) -> dict:
    """
    Save raw image bytes to disk.

    Returns a dict with:
        filename          – sanitised unique filename on disk
        original_filename – what the user uploaded
        file_path         – full path on disk (store this in DB)
        file_size_bytes   – size in bytes
        mime_type         – e.g. 'image/png'
    """
    ext_map = {
        "image/png":  ".png",
        "image/jpeg": ".jpg",
        "image/jpg":  ".jpg",
        "image/webp": ".webp",
    }
    ext = ext_map.get(mime_type, ".png")

    # Build month-based subfolder: uploads/2026-07/
    month_folder = UPLOAD_BASE / datetime.datetime.utcnow().strftime("%Y-%m")
    month_folder.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}{ext}"
    full_path   = month_folder / unique_name

    full_path.write_bytes(file_bytes)

    return {
        "filename":          unique_name,
        "original_filename": original_filename,
        "file_path":         str(full_path),
        "file_size_bytes":   len(file_bytes),
        "mime_type":         mime_type,
    }


def delete_image_file(file_path: str) -> bool:
    """Delete the file from disk. Returns True if deleted, False if not found."""
    p = Path(file_path)
    if p.exists():
        p.unlink()
        return True
    return False
