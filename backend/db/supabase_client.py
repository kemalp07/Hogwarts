import os
import logging
from pathlib import Path
from dotenv import load_dotenv

try:
    from supabase import create_client
except Exception:
    create_client = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=True)

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = None

if create_client and SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception:
        logger.debug("Supabase client could not be created")
        supabase = None


def insert_message(session_id: str, character_id: str | None, role: str, content: str):
    """Insert a message into `messages` table. Returns supabase response or None."""
    if not supabase:
        logger.warning("Supabase client is not configured; skipping message insert")
        return None
    payload = {
        "session_id": session_id,
        "character_id": character_id,
        "role": role,
        "content": content,
    }
    try:
        return supabase.table("messages").insert(payload).execute()
    except Exception:
        logger.exception("Failed to insert message into Supabase")
        return None
