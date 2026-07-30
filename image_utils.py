"""
Image validation and base64 encoding helpers.

Validates that a file is a readable image of a supported format using
Pillow, then base64-encodes it for the Mistral vision API.

Mistral accepts PNG and JPEG natively. WEBP and other formats are
converted to PNG in-memory before encoding — the original file on
disk is never modified.
"""

import base64
import io
import os
from typing import Tuple

from PIL import Image, UnidentifiedImageError

import config

# Formats that can be sent as-is; everything else is converted to PNG.
SAFE_FORMATS = {"PNG", "JPEG"}
SAFE_FORMAT_MIME = {"PNG": "image/png", "JPEG": "image/jpeg"}

PIL_FORMAT_MAP = {
    "JPEG": {".jpg", ".jpeg"},
    "PNG": {".png"},
    "WEBP": {".webp"},
}


class ImageValidationError(Exception):
    pass


def has_supported_extension(path: str) -> bool:
    ext = os.path.splitext(path)[1].lower()
    return ext in config.SUPPORTED_EXTENSIONS


def validate_image(path: str) -> Tuple[bool, str]:
    """
    Confirms the file is a genuine, undamaged image of a supported format.
    Returns (is_valid, reason_if_invalid).
    """
    if not has_supported_extension(path):
        ext = os.path.splitext(path)[1]
        return False, f"Unsupported extension '{ext}'. Allowed: {sorted(config.SUPPORTED_EXTENSIONS)}"

    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            real_format = img.format
    except (UnidentifiedImageError, OSError, ValueError) as e:
        return False, f"File is not a valid/readable image: {e}"

    if real_format not in PIL_FORMAT_MAP:
        return False, f"Detected format '{real_format}' is not supported."

    return True, ""


def encode_image_to_base64(path: str) -> Tuple[str, str]:
    """
    Base64-encodes the image and returns (base64_string, mime_type).

    Non-safe formats (WEBP, etc.) are transparently re-encoded as PNG
    in memory. The original file on disk is left untouched.
    """
    with Image.open(path) as img:
        fmt = img.format  # e.g. 'JPEG', 'PNG', 'WEBP'

        if fmt in SAFE_FORMATS:
            with open(path, "rb") as f:
                data = base64.b64encode(f.read()).decode("utf-8")
            return data, SAFE_FORMAT_MIME[fmt]

        # Convert to PNG in-memory
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        data = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return data, "image/png"
