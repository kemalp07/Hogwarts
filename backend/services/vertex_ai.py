import json
import os
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from .text_utils import normalize_turkish_text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=True)

VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
DEFAULT_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")
DEFAULT_MODEL = os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")


def _resolve_credential_source() -> Optional[str]:
    candidate = (
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or os.getenv("VERTEX_AI_SERVICE_ACCOUNT_JSON")
        or os.getenv("VERTEX_AI_CREDENTIALS")
    )
    if candidate:
        return candidate.strip().strip('"').strip("'")
    return None


def _load_service_account() -> Tuple[Optional[service_account.Credentials], Optional[str]]:
    credential_source = _resolve_credential_source()
    if not credential_source:
        return None, None

    try:
        if credential_source.startswith("{"):
            info = json.loads(credential_source)
            credentials = service_account.Credentials.from_service_account_info(
                info,
                scopes=[VERTEX_SCOPE],
            )
            project_id = os.getenv("VERTEX_AI_PROJECT_ID") or info.get("project_id") or credentials.project_id
            return credentials, project_id

        credential_path = Path(credential_source)
        if not credential_path.is_absolute():
            credential_path = PROJECT_ROOT / credential_path

        credentials = service_account.Credentials.from_service_account_file(
            str(credential_path),
            scopes=[VERTEX_SCOPE],
        )
        project_id = os.getenv("VERTEX_AI_PROJECT_ID") or credentials.project_id
        if not project_id:
            try:
                raw = json.loads(credential_path.read_text(encoding="utf-8"))
                project_id = os.getenv("VERTEX_AI_PROJECT_ID") or raw.get("project_id")
            except Exception:
                project_id = None
        return credentials, project_id
    except Exception:
        return None, None


def _extract_text_from_event(event: Dict[str, Any]) -> str:
    candidates = event.get("candidates") or []
    if not candidates:
        return ""

    candidate = candidates[0] if isinstance(candidates[0], dict) else {}
    content = candidate.get("content") or {}
    parts = content.get("parts") or []

    pieces: List[str] = []
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


def _split_system_and_contents(messages: List[Dict[str, Any]]) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    system_text: Optional[str] = None
    contents: List[Dict[str, Any]] = []

    for message in messages or []:
        role = message.get("role")
        content = message.get("content", "")
        text = content if isinstance(content, str) else str(content)

        if role == "system" and system_text is None:
            system_text = text
            continue

        vertex_role = "user" if role == "user" else "model"
        contents.append(
            {
                "role": vertex_role,
                "parts": [{"text": text}],
            }
        )

    return system_text, contents


def _build_vertex_payload(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.85,
) -> Tuple[Dict[str, Any], service_account.Credentials, str, str, str]:
    system_text, contents = _split_system_and_contents(messages)
    credentials, project_id = _load_service_account()
    location = os.getenv("VERTEX_AI_LOCATION", DEFAULT_LOCATION)
    model_name = model or os.getenv("VERTEX_AI_MODEL", DEFAULT_MODEL)
    max_tokens = int(os.getenv("VERTEX_AI_MAX_TOKENS", "2048"))

    if not credentials or not project_id:
        raise RuntimeError(
            "Vertex AI service account bulunamadi. GOOGLE_APPLICATION_CREDENTIALS veya "
            "VERTEX_AI_SERVICE_ACCOUNT_JSON ayarlayin."
        )

    auth_request = GoogleAuthRequest()
    credentials.refresh(auth_request)

    payload: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "candidateCount": 1,
        },
    }

    if system_text:
        payload["systemInstruction"] = {
            "parts": [{"text": system_text}],
        }

    return payload, credentials, project_id, location, model_name


async def stream_vertex_ai(messages: List[Dict[str, Any]], model: Optional[str] = None) -> AsyncIterator[str]:
    try:
        payload, credentials, project_id, location, model_name = _build_vertex_payload(messages, model=model)
    except Exception as exc:
        yield normalize_turkish_text(str(exc))
        return

    if not credentials:
        yield normalize_turkish_text("Vertex AI kimlik bilgileri bulunamadi. GOOGLE_APPLICATION_CREDENTIALS ayarini kontrol edin.")
        return

    if not credentials.token:
        try:
            credentials.refresh(GoogleAuthRequest())
        except Exception as exc:
            yield normalize_turkish_text(f"Vertex AI kimlik yenileme hatası: {exc}")
            return

    access_token = credentials.token
    api_host = (
        "https://aiplatform.googleapis.com"
        if location == "global"
        else f"https://{location}-aiplatform.googleapis.com"
    )
    url = (
        f"{api_host}/v1/projects/{project_id}/locations/{location}"
        f"/publishers/google/models/{model_name}:streamGenerateContent?alt=sse"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code >= 400:
                    text = await response.aread()
                    yield normalize_turkish_text(f"Vertex AI HTTP {response.status_code}: {text[:300].decode('utf-8', errors='replace')}")
                    return

                buffer = ""
                async for byte_chunk in response.aiter_bytes(chunk_size=1024):
                    buffer += byte_chunk.decode("utf-8", errors="replace")
                    lines = buffer.split("\n")
                    buffer = lines[-1]

                    for line in lines[:-1]:
                        if not line.strip():
                            continue

                        if line.startswith("data:"):
                            data = line[5:].strip()
                        else:
                            continue

                        if not data or data == "[DONE]":
                            continue

                        try:
                            event = json.loads(data)
                        except Exception:
                            continue

                        chunk = _extract_text_from_event(event)
                        if chunk:
                            yield chunk

                if buffer.strip():
                    if buffer.startswith("data:"):
                        data = buffer[5:].strip()
                        if data and data != "[DONE]":
                            try:
                                event = json.loads(data)
                                chunk = _extract_text_from_event(event)
                                if chunk:
                                    yield chunk
                            except Exception:
                                pass
    except Exception as exc:
        yield normalize_turkish_text(f"Vertex AI bağlantı hatası: {exc}")