"""
Central logger used for all pipeline events:
queued, sent, accepted, completed, failed.
"""

import logging
import sys

import config


def get_logger() -> logging.Logger:
    logger = logging.getLogger("mistral_pipeline")

    if logger.handlers:
        # Already configured — avoid duplicate handlers on re-import
        return logger

    level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    file_handler = logging.FileHandler(config.LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    return logger


log = get_logger()
