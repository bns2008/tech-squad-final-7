"""
Watches WATCH_FOLDER for new image files, validates them, waits for
them to be fully written, then sends them to the Mistral vision model
and routes the result to PROCESSED_FOLDER / FAILED_FOLDER.
"""

import os
import shutil
import time
from datetime import datetime

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

import config
import image_utils
import mistral_client
from logger_setup import log


def _parse_condition_result(description: str):
    """
    Pulls 'ANSWER: YES/NO' and 'REASON: ...' out of the model's reply.
    Returns (answer, reason). answer is 'YES', 'NO', or None if the
    model didn't follow the expected format.
    """
    answer = None
    reason = ""
    for line in description.splitlines():
        line = line.strip()
        if line.upper().startswith("ANSWER:"):
            value = line.split(":", 1)[1].strip().upper()
            if value.startswith("YES"):
                answer = "YES"
            elif value.startswith("NO"):
                answer = "NO"
        elif line.upper().startswith("REASON:"):
            reason = line.split(":", 1)[1].strip()
    return answer, reason


def _wait_until_stable(path: str) -> bool:
    """
    Polls file size until it stops changing, so we don't read a file
    that's still being copied/downloaded into the watch folder.
    Returns False if the file disappeared or never stabilized in time.
    """
    waited = 0.0
    last_size = -1
    stable_for = 0.0

    while waited < config.STABILITY_MAX_WAIT:
        if not os.path.exists(path):
            return False
        try:
            size = os.path.getsize(path)
        except OSError:
            return False

        if size == last_size:
            stable_for += config.STABILITY_POLL_INTERVAL
            if stable_for >= config.STABILITY_WINDOW:
                return True
        else:
            stable_for = 0.0
            last_size = size

        time.sleep(config.STABILITY_POLL_INTERVAL)
        waited += config.STABILITY_POLL_INTERVAL

    return False


def _save_result(filename: str, description: str) -> None:
    os.makedirs(config.RESULTS_FOLDER, exist_ok=True)
    base = os.path.splitext(filename)[0]
    out_path = os.path.join(config.RESULTS_FOLDER, f"{base}.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"File: {filename}\n")
        f.write(f"Analyzed at: {datetime.now().isoformat()}\n")
        f.write("-" * 60 + "\n")
        f.write(description + "\n")


def _move(path: str, destination_folder: str) -> None:
    os.makedirs(destination_folder, exist_ok=True)
    filename = os.path.basename(path)
    dest = os.path.join(destination_folder, filename)

    if os.path.exists(dest):
        base, ext = os.path.splitext(filename)
        dest = os.path.join(destination_folder, f"{base}_{int(time.time())}{ext}")

    shutil.move(path, dest)


def process_file(path: str) -> None:
    filename = os.path.basename(path)

    if not image_utils.has_supported_extension(path):
        return

    log.info(f"[QUEUED] '{filename}' detected, waiting for file to finish writing...")

    if not _wait_until_stable(path):
        log.error(f"[FAILED] '{filename}' -> file never stabilized or disappeared before processing")
        return

    is_valid, reason = image_utils.validate_image(path)
    if not is_valid:
        log.error(f"[FAILED] '{filename}' -> validation failed: {reason}")
        _move(path, config.FAILED_FOLDER)
        return

    log.info(f"[QUEUED] '{filename}' validated OK, preparing to send to Mistral")

    try:
        b64_image, media_type = image_utils.encode_image_to_base64(path)
    except OSError as e:
        log.error(f"[FAILED] '{filename}' -> could not read file: {e}")
        _move(path, config.FAILED_FOLDER)
        return

    prompt = config.CONDITION_PROMPT if config.CONDITION_CHECK_MODE else config.DEFAULT_PROMPT

    result = None
    for attempt in range(1, config.MAX_RETRIES + 2):  # first try + retries
        result = mistral_client.analyze_image(path, filename, b64_image, prompt=prompt, media_type=media_type)
        if result.success:
            break
        if attempt <= config.MAX_RETRIES:
            log.warning(
                f"[RETRY] '{filename}' -> attempt {attempt} failed, "
                f"retrying in {config.RETRY_BACKOFF_SECONDS}s"
            )
            time.sleep(config.RETRY_BACKOFF_SECONDS)

    if result and result.success:
        if config.CONDITION_CHECK_MODE:
            answer, condition_reason = _parse_condition_result(result.description)
            if answer == "YES":
                log.warning(f"[CONDITION MET] '{filename}' -> YES — {condition_reason}")
            elif answer == "NO":
                log.info(f"[CONDITION NOT MET] '{filename}' -> NO — {condition_reason}")
            else:
                log.warning(
                    f"[CONDITION UNCLEAR] '{filename}' -> model didn't follow expected format: "
                    f"{result.description[:200]}"
                )
        _save_result(filename, result.description)
        _move(path, config.PROCESSED_FOLDER)
    else:
        _move(path, config.FAILED_FOLDER)


class ImageEventHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        process_file(event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        process_file(event.dest_path)


def process_existing_files() -> None:
    """Handle any images already sitting in the watch folder at startup."""
    if not os.path.isdir(config.WATCH_FOLDER):
        return
    for filename in os.listdir(config.WATCH_FOLDER):
        full_path = os.path.join(config.WATCH_FOLDER, filename)
        if os.path.isfile(full_path):
            process_file(full_path)


def start_watcher() -> None:
    for folder in (config.WATCH_FOLDER, config.PROCESSED_FOLDER, config.FAILED_FOLDER, config.RESULTS_FOLDER):
        os.makedirs(folder, exist_ok=True)

    log.info(f"Watching folder: {os.path.abspath(config.WATCH_FOLDER)}")
    log.info(f"Model: {config.MODEL} (Mistral AI)")

    mistral_client.check_mistral_available()

    process_existing_files()

    event_handler = ImageEventHandler()
    observer = Observer()
    observer.schedule(event_handler, config.WATCH_FOLDER, recursive=False)
    observer.start()
    log.info("Watcher started. Drop .jpg / .jpeg / .png / .webp files into the watch folder. Ctrl+C to stop.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Stopping watcher...")
        observer.stop()
    observer.join()
    log.info("Watcher stopped.")
