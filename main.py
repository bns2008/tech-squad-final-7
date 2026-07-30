"""
Entry point.

Run:
    python main.py

This starts the folder watcher. Drop jpg/png/webp files into the
watch folder (default: ./incoming_images) and results will appear
in ./results, with processed originals moved to ./processed_images
(or ./failed_images if something went wrong).
"""

from watcher import start_watcher

if __name__ == "__main__":
    start_watcher()
