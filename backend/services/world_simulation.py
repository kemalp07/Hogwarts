"""
Hogwarts Dünya Simülasyonu
İki katman:
  1. conversation_events: sohbete bakarak puan değişimi
  2. world_events: sohbetten bağımsız, o günkü Hogwarts olayları
"""

import json
import logging
import os
import random
from datetime import datetime
from pathlib import Path

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest

from ..db.supabase_client import supabase
from .vertex_ai import DEFAULT_LOCATION, DEFAULT_MODEL, _load_service_account

logger = logging.getLogger(__name__)
HOUSES = ["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]


async def _call_vertex(prompt: str, max_tokens: int = 300, temperature: float = 0.8) -> str:
    credentials, project_id = _load_service_account()
    if not credentials or not project_id:
        return ""
    if not credentials.token:
        try:
            credentials.refresh(GoogleAuthRequest())
        except Exception:
            return ""

    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
    }

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
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "candidateCount": 1,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                return ""
            data = resp.json()
            candidates = data.get("candidates", [{}])
            parts = candidates[0].get("content", {}).get("parts", [{}])
            return parts[0].get("text", "").strip()
    except Exception as e:
        logger.error(f"_call_vertex error: {e}")
        return ""


def _get_points(session_id: str) -> dict:
    if not supabase:
        return {h: 0 for h in HOUSES}
    try:
        resp = supabase.table("house_points").select("*").eq("session_id", session_id).execute()
        data = (resp.data or [{}])[0]
        return {h: int(data.get(h, 0)) for h in HOUSES}
    except Exception:
        return {h: 0 for h in HOUSES}


def _apply_changes(session_id: str, changes: list):
    if not supabase or not changes:
        return
    current = _get_points(session_id)
    update = {}
    for ch in changes:
        house = ch.get("house", "").lower()
        delta = int(ch.get("delta", 0))
        if house not in HOUSES or delta == 0:
            continue
        current[house] = max(0, current[house] + delta)
        update[house] = current[house]
        try:
            supabase.table("house_point_events").insert({
                "session_id": session_id,
                "house": house,
                "delta": delta,
                "reason": ch.get("reason", ""),
                "source": ch.get("source", "world_event"),
            }).execute()
        except Exception:
            pass
    if update:
        try:
            update["session_id"] = session_id
            update["updated_at"] = datetime.utcnow().isoformat()
            supabase.table("house_points").upsert(update, on_conflict="session_id").execute()
        except Exception as e:
            logger.error(f"_apply_changes error: {e}")


def _parse_json(text: str) -> list:
    try:
        clean = text.strip()
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean.strip())
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "changes" in data:
            return data["changes"]
    except Exception:
        pass
    return []


async def analyze_conversation_points(session_id: str, conversation: list, player_house: str):
    """Sohbete bakarak puan değişimlerini çıkar."""
    if not conversation:
        return
    recent = conversation[-10:]
    conv_text = "\n".join(
        f"{m['role'].upper()}: {m['content'][:300]}" for m in recent
    )
    prompt = f"""Sen Hogwarts'ın puan kayıt büyücüsüsün. Aşağıdaki konuşmayı analiz et.

Oyuncunun evi: {player_house}
Yıl: 1991-92

KONUŞMA:
{conv_text}

Kurallar:
- Sadece konuşmada GERÇEKTEN geçen olayları değerlendir
- Oyuncu iyi/cesur/akıllı davrandıysa kendi evine +puan
- Kural ihlali, saygısızlık, ders kaçırma varsa -puan
- Hiçbir olay yoksa boş liste döndür
- Her delta max ±15
- CRITICAL: If a teacher explicitly stated an exact number (e.g. "twenty points from Gryffindor", "yirmi puan gidiyor"), you MUST use that EXACT number as the delta. Do not reduce or round it.
- Examples: "yirmi puan" → delta: -20, "beş puan" → delta: -5, "on puan" → delta: 10
- SADECE JSON döndür, başka hiçbir şey yazma

Format:
[{{"house": "gryffindor", "delta": 5, "reason": "Snape'e cesurca cevap verdi", "source": "conversation_event"}}]

Değişim yoksa: []"""

    text = await _call_vertex(prompt, max_tokens=200, temperature=0.3)
    changes = _parse_json(text)
    if changes:
        logger.info(f"[{session_id}] Conversation points: {changes}")
        _apply_changes(session_id, changes)


async def simulate_world_events(session_id: str, week: int, day: int):
    """Sohbetten bağımsız, o günkü Hogwarts olaylarını simüle et."""
    # %90 ihtimalle çalış — her yanıtta dünya değişmesin
    if random.random() > 0.9:
        return

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe",
                 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}
    day_name = day_names.get(day, "gün")

    prompt = f"""Sen Hogwarts'ın gizli günlük kayıt büyücüsüsün. 1991-92 yılı, {week}. hafta, {day_name}.

Bugün Hogwarts'ta yaşanan 2-3 olayı hayal et ve ev puanlarına yansıt.
Sınıflarda, koridorlarda, yemekhanede, Quidditch sahasında olabilir.
Öğretmenler puan verir/alır, öğrenciler başarı gösterir veya kural çiğner.

Kurallar:
- 1991-92 Hogwarts atmosferi (1. sınıf öğrencileri var, Harry Potter da burada)
- Her delta max ±10 (küçük günlük değişimler)
- Her world_events çağrısında 4 evin TÜMÜNE değin — her ev en az bir olay alsın.
- Bazı olaylar pozitif bazıları negatif olsun. Eğer bir ev sohbette hiç geçmediyse,
- o eve arka planda bir şey olmuştur — Hufflepuff bahçe dersinde başarılı oldu,
- Slytherin koridorda kavga çıkardı gibi. Hiçbir ev 0'da kalmasın.
- SADECE JSON döndür

Format:
[
  {{"house": "slytherin", "delta": 8, "reason": "Potions sınavında en yüksek not Slytherin'de", "source": "world_event"}},
  {{"house": "gryffindor", "delta": -5, "reason": "Fred ve George koridorda patlayan şeker kullandı", "source": "world_event"}}
]"""

    text = await _call_vertex(prompt, max_tokens=250, temperature=0.85)
    changes = _parse_json(text)
    if changes:
        logger.info(f"[{session_id}] World events w={week} d={day}: {changes}")
        _apply_changes(session_id, changes)


async def run_point_simulation(
    session_id: str,
    conversation: list,
    player_house: str,
    week: int = 1,
    day: int = 1,
):
    """Ana fonksiyon — background task buraya çağrı yapar."""
    import asyncio
    await asyncio.gather(
        analyze_conversation_points(session_id, conversation, player_house),
        simulate_world_events(session_id, week, day),
        return_exceptions=True,
    )
