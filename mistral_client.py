"""
Client for the Mistral AI vision API (mistral-small-latest and other
vision-capable Mistral models).

Stages logged:
  SENT      -> HTTP request dispatched to Mistral
  ACCEPTED  -> 200 response received, parsing content
  COMPLETED -> full analysis text extracted
  FAILED    -> error at any stage
"""

import base64
import time
from dataclasses import dataclass
from typing import Optional

import requests

import config
from logger_setup import log


@dataclass
class AnalysisResult:
    success: bool
    filename: str
    description: Optional[str] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None


def _build_headers() -> dict:
    return {
        "Authorization": f"Bearer {config.MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }


def check_mistral_available() -> bool:
    """Simple connectivity check against the Mistral API."""
    try:
        resp = requests.get(
            "https://api.mistral.ai/v1/models",
            headers=_build_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        log.info(f"Mistral API reachable. Using model: {config.MODEL}")
        return True
    except requests.exceptions.RequestException as e:
        log.error(f"Cannot reach Mistral API: {e}")
        return False


def analyze_image(
    image_path: str,
    filename: str,
    base64_image: str,
    prompt: str = config.DEFAULT_PROMPT,
    media_type: str = "image/png",
) -> AnalysisResult:
    """
    Sends one image to the Mistral vision model and returns the result.

    base64_image  : base64-encoded image bytes (PNG preferred)
    media_type    : MIME type matching the encoded image (image/png or image/jpeg)
    """
    payload = {
        "model": config.MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{base64_image}"
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }
        ],
    }

    log.info(f"[SENT] '{filename}' -> dispatching to Mistral model '{config.MODEL}'")
    start_time = time.time()

    try:
        response = requests.post(
            config.MISTRAL_API_URL,
            headers=_build_headers(),
            json=payload,
            timeout=config.REQUEST_TIMEOUT,
        )
        response.raise_for_status()

        log.info(f"[ACCEPTED] '{filename}' -> Mistral returned HTTP 200, parsing response")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            msg = "Mistral returned no choices in the response"
            log.error(f"[FAILED] '{filename}' -> {msg}")
            return AnalysisResult(False, filename, error=msg)

        description = choices[0].get("message", {}).get("content", "").strip()
        duration = time.time() - start_time

        if not description:
            msg = "Mistral returned an empty content field"
            log.error(f"[FAILED] '{filename}' -> {msg}")
            return AnalysisResult(False, filename, error=msg, duration_seconds=duration)

        log.info(
            f"[COMPLETED] '{filename}' -> analysis received in {duration:.1f}s "
            f"({len(description)} chars)"
        )
        return AnalysisResult(True, filename, description=description, duration_seconds=duration)

    except requests.exceptions.Timeout:
        msg = f"Request timed out after {config.REQUEST_TIMEOUT}s"
        log.error(f"[FAILED] '{filename}' -> {msg}")
        return AnalysisResult(False, filename, error=msg)

    except requests.exceptions.ConnectionError as e:
        msg = f"Could not connect to Mistral API: {e}"
        log.error(f"[FAILED] '{filename}' -> {msg}")
        return AnalysisResult(False, filename, error=msg)

    except requests.exceptions.HTTPError as e:
        body = ""
        try:
            body = e.response.text[:300]
        except Exception:
            pass
        msg = f"Mistral returned HTTP error: {e} | {body}"
        log.error(f"[FAILED] '{filename}' -> {msg}")
        return AnalysisResult(False, filename, error=msg)

    except Exception as e:  # noqa: BLE001
        msg = f"Unexpected error: {e}"
        log.error(f"[FAILED] '{filename}' -> {msg}")
        return AnalysisResult(False, filename, error=msg)
