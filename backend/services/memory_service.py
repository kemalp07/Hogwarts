import logging
import os
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from google.auth.transport.requests import Request as GoogleAuthRequest

from ..db.supabase_client import supabase
from .vertex_ai import DEFAULT_LOCATION, DEFAULT_MODEL, _load_service_account

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=True)

logger = logging.getLogger(__name__)

SUMMARY_TRIGGER_TURNS = 10


def _normalize_memory_owner_id(session_id: str) -> str:
    try:
        return str(uuid.UUID(session_id))
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"hpgwarts-memory:{session_id}"))


def _extract_text_from_response(event: dict[str, Any]) -> str:
    candidates = event.get("candidates") or []
    if not candidates:
        return ""

    candidate = candidates[0] if isinstance(candidates[0], dict) else {}
    content = candidate.get("content") or {}
    parts = content.get("parts") or []

    pieces: list[str] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        text = part.get("text")
        if isinstance(text, str) and text:
            pieces.append(text)

    if pieces:
        return "".join(pieces)

    direct_text = event.get("text")
    if isinstance(direct_text, str):
        return direct_text

    return ""


def _format_conversation(conversation: list[dict]) -> str:
    lines: list[str] = []

    for item in conversation or []:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role") or "user").strip().lower()
        content = str(item.get("content") or item.get("text") or "").strip()
        if not content:
            continue

        if role == "assistant" or role == "ai":
            label = "Asistan"
        elif role == "system":
            label = "Sistem"
        else:
            label = "Kullanıcı"

        lines.append(f"{label}: {content}")

    return "\n".join(lines)


def _build_summary_prompt(conversation: list[dict]) -> str:
    conversation_text = _format_conversation(conversation)
    return (
        "Aşağıdaki konuşmayı 2-3 cümleyle özetle. Sadece önemli olayları, "
        "karakterin kullanıcıya karşı tutumunu ve plot gelişmelerini içer. "
        f"Türkçe yaz.\n\n{conversation_text}"
    )


def _build_rolling_summary_prompt(conversation: list[dict]) -> str:
    conversation_text = _format_conversation(conversation)
    return (
        "You are a story memory keeper. Compress this conversation into a structured summary covering:\n"
        "1. Key events that happened\n"
        "2. Character relationships and how they evolved\n"
        "3. Important items, locations, spells mentioned\n"
        "4. The emotional/narrative tone\n"
        "5. Any unresolved plot threads\n"
        "Write in past tense, max 400 words. Be specific with names and details.\n\n"
        f"{conversation_text}"
    )


async def _save_memory_row(session_id: str, character_id: str, summary: str, summary_type: str):
    if not supabase:
        return None

    owner_id = _normalize_memory_owner_id(session_id)
    user_payload = {
        "id": owner_id,
        "email": f"{owner_id}@session.local",
        "tier": "free",
    }
    payload = {
        "user_id": owner_id,
        "character_id": character_id,
        "summary": summary,
        "summary_type": summary_type,
    }

    try:
        user_response = (
            supabase.table("users")
            .select("id")
            .eq("id", owner_id)
            .execute()
        )
        user_rows = getattr(user_response, "data", None) or []

        if not user_rows:
            supabase.table("users").upsert(user_payload, on_conflict="id").execute()

        try:
            return supabase.table("user_memories").upsert(payload).execute()
        except Exception:
            fallback_payload = dict(payload)
            fallback_payload.pop("summary_type", None)
            return supabase.table("user_memories").upsert(fallback_payload).execute()
    except Exception:
        logger.exception("Failed to save user memory")
        return None


async def get_memories(session_id: str, limit: int = 5) -> list[str]:
    if not supabase:
        return []

    owner_id = _normalize_memory_owner_id(session_id)
    effective_limit = min(max(limit, 0), 4)

    try:
        rolling_rows = []
        episodic_rows = []

        try:
            rolling_response = (
                supabase.table("user_memories")
                .select("summary, summary_type, created_at")
                .eq("user_id", owner_id)
                .eq("summary_type", "rolling")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            rolling_rows = getattr(rolling_response, "data", None) or []

            episodic_limit = effective_limit - 1 if rolling_rows else effective_limit
            episodic_limit = max(0, min(episodic_limit, 3 if rolling_rows else 4))
            episodic_response = (
                supabase.table("user_memories")
                .select("summary, summary_type, created_at")
                .eq("user_id", owner_id)
                .eq("summary_type", "episodic")
                .order("created_at", desc=True)
                .limit(episodic_limit)
                .execute()
            )
            episodic_rows = getattr(episodic_response, "data", None) or []
        except Exception:
            response = (
                supabase.table("user_memories")
                .select("summary")
                .eq("user_id", owner_id)
                .order("created_at", desc=True)
                .limit(effective_limit)
                .execute()
            )
            rows = getattr(response, "data", None) or []
            memories: list[str] = []
            for row in rows:
                if not isinstance(row, dict):
                    continue
                summary = str(row.get("summary") or "").strip()
                if summary:
                    memories.append(summary)
            return memories[:effective_limit]
    except Exception:
        logger.exception("Failed to load user memories")
        return []

    memories: list[str] = []
    for row in rolling_rows[:1]:
        if not isinstance(row, dict):
            continue
        summary = str(row.get("summary") or "").strip()
        if summary:
            memories.append(summary)

    for row in episodic_rows[: max(0, effective_limit - len(memories))]:
        if not isinstance(row, dict):
            continue
        summary = str(row.get("summary") or "").strip()
        if summary:
            memories.append(summary)

    return memories[:effective_limit]


async def save_memory(session_id: str, character_id: str, summary: str):
    return await _save_memory_row(session_id, character_id, summary, "episodic")


async def maybe_summarize_and_compress(session_id: str, character_id: str, full_history: list[dict]) -> str | None:
    assistant_count = 0
    for message in full_history or []:
        if not isinstance(message, dict):
            continue
        role = str(message.get("role") or "").strip().lower()
        if role == "assistant":
            assistant_count += 1

    if assistant_count < SUMMARY_TRIGGER_TURNS or assistant_count % SUMMARY_TRIGGER_TURNS != 0:
        return None

    conversation_text = _format_conversation(full_history)
    if not conversation_text.strip():
        return None

    credentials, project_id = _load_service_account()
    if not credentials or not project_id:
        logger.warning("Vertex AI service account not configured for rolling memory summaries")
        return None

    if not credentials.token:
        try:
            credentials.refresh(GoogleAuthRequest())
        except Exception:
            logger.exception("Failed to refresh Vertex AI credentials for rolling memory summary")
            return None

    location = os.getenv("VERTEX_AI_LOCATION", DEFAULT_LOCATION)
    model_name = os.getenv("VERTEX_AI_MODEL", DEFAULT_MODEL)
    api_host = (
        "https://aiplatform.googleapis.com"
        if location == "global"
        else f"https://{location}-aiplatform.googleapis.com"
    )
    url = (
        f"{api_host}/v1/projects/{project_id}/locations/{location}"
        f"/publishers/google/models/{model_name}:generateContent"
    )
    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
    }
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _build_rolling_summary_prompt(full_history)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
            "candidateCount": 1,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                logger.warning("Vertex AI rolling memory summary failed with HTTP %s", response.status_code)
                return None

            data = response.json()
            summary = _extract_text_from_response(data).strip()
            if summary:
                await _save_memory_row(session_id, character_id, summary, "rolling")
                return summary
            return None
    except Exception:
        logger.exception("Failed to generate rolling memory summary")
        return None


async def generate_summary(conversation: list[dict]) -> str:
    conversation_text = _format_conversation(conversation)
    if not conversation_text.strip():
        return ""

    credentials, project_id = _load_service_account()
    if not credentials or not project_id:
        logger.warning("Vertex AI service account not configured for memory summaries")
        return ""

    if not credentials.token:
        try:
            credentials.refresh(GoogleAuthRequest())
        except Exception:
            logger.exception("Failed to refresh Vertex AI credentials for memory summary")
            return ""

    location = os.getenv("VERTEX_AI_LOCATION", DEFAULT_LOCATION)
    model_name = os.getenv("VERTEX_AI_MODEL", DEFAULT_MODEL)
    api_host = (
        "https://aiplatform.googleapis.com"
        if location == "global"
        else f"https://{location}-aiplatform.googleapis.com"
    )
    url = (
        f"{api_host}/v1/projects/{project_id}/locations/{location}"
        f"/publishers/google/models/{model_name}:generateContent"
    )
    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
    }
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _build_summary_prompt(conversation)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
            "candidateCount": 1,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                logger.warning("Vertex AI memory summary failed with HTTP %s", response.status_code)
                return ""

            data = response.json()
            summary = _extract_text_from_response(data).strip()
            return summary
    except Exception:
        logger.exception("Failed to generate memory summary")
        return ""