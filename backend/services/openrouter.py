import os
import httpx
from typing import List, Dict
from dotenv import load_dotenv
from pathlib import Path
from .text_utils import normalize_turkish_text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=True)


async def call_openrouter(model: str, messages: List[Dict]) -> str:
    """Call OpenRouter chat completions API. If `OPENROUTER_API_KEY` is not set, fall back to a stub reply.

    Returns assistant's text content as string.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return (
            "OpenRouter API key bulunamadi. Gercek yanit icin proje kokundeki .env dosyasina "
            "OPENROUTER_API_KEY=sk-or-... ekleyip sunucuyu yeniden baslatin."
        )

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {"model": model, "messages": messages}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response is not None else "?"
        body = exc.response.text[:300] if exc.response is not None else ""
        return normalize_turkish_text(f"OpenRouter HTTP {status}: {body}")
    except Exception as exc:
        return normalize_turkish_text(f"OpenRouter bağlantı hatası: {exc}")

    # OpenRouter response structure may vary; attempt to extract assistant text
    # Common shape: data['choices'][0]['message']['content'] or choices[].message.content
    try:
        choice = data.get("choices", [])[0]
        message = choice.get("message") if isinstance(choice, dict) else None
        if message:
            content = message.get("content")
            if isinstance(content, str):
                return normalize_turkish_text(content)
            # sometimes content is dict with 'text'
            if isinstance(content, dict):
                return normalize_turkish_text(content.get("text", str(content)))
    except Exception:
        pass

    # Fallback: return stringified response normalized
    return normalize_turkish_text(str(data))

