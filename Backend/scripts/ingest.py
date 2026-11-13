"""(Re)index course material for retrieval: ``python -m scripts.ingest [--course CS101] [--no-embed]``."""
import argparse
import logging

from ai import rag
from core.config import get_settings
from core.logging import configure_logging
from database.db import ensure_indexes


def main() -> None:
    parser = argparse.ArgumentParser(description="Index course material for the AI study buddy")
    parser.add_argument("--course", help="only this course_id")
    parser.add_argument("--no-embed", action="store_true", help="skip embeddings (keyword search only)")
    args = parser.parse_args()
    configure_logging(get_settings().log_level)
    ensure_indexes()
    stats = rag.reindex_all(args.course, embed=not args.no_embed)
    logging.getLogger("ingest").info("Indexed %s", stats)
    print(stats)


if __name__ == "__main__":
    main()
