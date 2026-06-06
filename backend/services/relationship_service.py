"""
Karakter İlişki Servisi
- Her karakterle ilişki skoru (-100 ile +100)
- Sohbet sonrası AI analizi ile güncellenir
- System prompt'a enjekte edilir
"""

import json
import logging
import os
from datetime import datetime

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest

from ..db.supabase_client import supabase
from .vertex_ai import DEFAULT_LOCATION, DEFAULT_MODEL, _load_service_account

logger = logging.getLogger(__name__)


async def _call_vertex(prompt: str, max_tokens: int = 300) -> str:
    credentials, project_id = _load_service_account()
    if not credentials or not project_id:
        return ""
    if not credentials.token:
        try:
            credentials.refresh(GoogleAuthRequest())
        except Exception:
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
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
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
        logger.error(f"relationship _call_vertex error: {e}")
        return ""


def get_relationships(session_id: str) -> dict:
    """Tüm karakter ilişkilerini döner: {character_name: {score, last_interaction, relationship_type}}"""
    if not supabase:
        return {}
    try:
        resp = (
            supabase.table("character_relationships")
            .select("character_name,score,last_interaction,relationship_type")
            .eq("session_id", session_id)
            .execute()
        )
        return {
            row["character_name"]: {
                "score": row["score"],
                "last_interaction": row.get("last_interaction", ""),
                "relationship_type": row.get("relationship_type", "neutral"),
            }
            for row in (resp.data or [])
        }
    except Exception as e:
        logger.error(f"get_relationships error: {e}")
        return {}


def update_relationship_type(session_id: str, character_name: str, new_type: str):
    """İlişki tipini güncelle."""
    if not supabase:
        return
    try:
        supabase.table("character_relationships").upsert(
            {
                "session_id": session_id,
                "character_name": character_name,
                "relationship_type": new_type,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="session_id,character_name",
        ).execute()
        logger.info(f"[{session_id}] {character_name} relationship_type → {new_type}")
    except Exception as e:
        logger.error(f"update_relationship_type error: {e}")


def update_relationship(session_id: str, character_name: str, delta: int, reason: str):
    """Tek bir karakter için ilişki skorunu güncelle."""
    if not supabase:
        return
    try:
        resp = (
            supabase.table("character_relationships")
            .select("score")
            .eq("session_id", session_id)
            .eq("character_name", character_name)
            .execute()
        )
        current_score = (resp.data or [{}])[0].get("score", 0) if resp.data else 0
        new_score = max(-100, min(100, current_score + delta))

        supabase.table("character_relationships").upsert(
            {
                "session_id": session_id,
                "character_name": character_name,
                "score": new_score,
                "last_interaction": reason[:200],
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="session_id,character_name",
        ).execute()

        logger.info(
            f"[{session_id}] {character_name}: {current_score} → {new_score} "
            f"({'+' if delta > 0 else ''}{delta}: {reason})"
        )
    except Exception as e:
        logger.error(f"update_relationship error: {e}")


async def analyze_relationship_changes(
    session_id: str,
    conversation: list,
    player_name: str,
    player_attraction: str = "Her ikisi",
):
    """
    Sohbeti analiz et, karakter ilişkilerini güncelle.
    Her yanıt sonrası background'da çalışır.
    """
    if not conversation:
        return

    recent = conversation[-12:]
    conv_text = "\n".join(
        f"{m['role'].upper()}: {m['content'][:400]}" for m in recent
    )

    prompt = f"""Sen Hogwarts'ın gizli ilişki kayıt büyücüsüsün.
Oyuncu adı: {player_name}

Aşağıdaki sohbeti analiz et. Oyuncunun karakterlerle olan etkileşimlerini değerlendir.
- KRİTİK: Sadece bu konuşmada gerçekten konuşan veya etkileşime giren karakterleri değerlendir. Sohbette adı geçmeyen veya aktif olmayan karakterlere kesinlikle puan değişimi uygulama.
Her değişim -10 ile +10 arasında olsun. Küçük etkileşimler için -3 ile +3 tercih et. Sadece çok belirgin olaylar için ±10 kullan.

KONUŞMA:
{conv_text}

Değerlendirme kriterleri:
- Oyuncu bir karaktere saygılı/yardımcı/nazik davrandıysa → pozitif
- Oyuncu bir karaktere saygısız/düşmanca/kaba davrandıysa → negatif
- Oyuncu bir karakteri etkilediyse (başarı, yetenek gösterisi) → pozitif
- Karakter zaten oyuncudan nefret ediyorsa (Draco, Snape gibi), küçük gelişmelerde az değişim
- Hiçbir önemli etkileşim yoksa boş liste döndür

SADECE JSON döndür:
[
  {{"character": "Hermione Granger", "delta": 8, "reason": "Dönüşüm dersinde etkileyici performans"}},
  {{"character": "Severus Snape", "delta": -5, "reason": "Sınıfta dikkat dağıttı"}}
]

Değişim yoksa: []"""

    text = await _call_vertex(prompt, max_tokens=300)
    if not text:
        return

    try:
        clean = text.strip()
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        changes = json.loads(clean.strip())
        if not isinstance(changes, list):
            return

        for ch in changes:
            char = ch.get("character", "").strip()
            delta = int(ch.get("delta", 0))
            reason = ch.get("reason", "")
            if char and delta != 0:
                update_relationship(session_id, char, delta, reason)

    except Exception as e:
        logger.error(f"analyze_relationship_changes parse error: {e}")

    await check_romance_trigger(session_id, conversation, player_name, player_attraction)


async def check_romance_trigger(
    session_id: str,
    conversation: list,
    player_name: str,
    player_attraction: str = "Her ikisi",
):
    """
    Romantik ilişki tetikleyici kontrolü.
    Koşullar: skor >= 60 VE oyuncu açıkça ilgi göstermiş.
    """
    relationships = get_relationships(session_id)

    candidates = [
        (name, data)
        for name, data in relationships.items()
        if data["score"] >= 60 and data.get("relationship_type", "neutral") != "romance"
    ]

    if not candidates:
        return

    recent = conversation[-6:]
    conv_text = "\n".join(f"{m['role'].upper()}: {m['content'][:300]}" for m in recent)

    candidate_names = [name for name, _ in candidates]

    prompt = f"""Aşağıdaki sohbette oyuncu ({player_name}) şu karakterlerden herhangi birine açıkça romantik ilgi gösterdi mi?
Karakterler: {', '.join(candidate_names)}

Romantik ilgi örnekleri: aşık olduğunu söylemek, öpmek istemek, el tutmak, flört etmek, sevdiğini belirtmek.

KONUŞMA:
{conv_text}

SADECE JSON döndür:
{{"romance_triggered": "Hermione Granger"}}
veya
{{"romance_triggered": null}}"""

    text = await _call_vertex(prompt, max_tokens=50)
    if not text:
        return

    try:
        clean = text.strip()
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean.strip())
        triggered = data.get("romance_triggered")

        if triggered and triggered in [name for name, _ in candidates]:
            female_indicators = [
                "Hermione", "McGonagall", "Ginny", "Luna", "Lavender",
                "Parvati", "Pansy", "Bellatrix", "Fleur", "Cho",
            ]
            is_female = any(ind in triggered for ind in female_indicators)

            allowed = False
            if player_attraction == "Kadınlar" and is_female:
                allowed = True
            elif player_attraction == "Erkekler" and not is_female:
                allowed = True
            elif player_attraction == "Her ikisi":
                allowed = True

            if allowed:
                update_relationship_type(session_id, triggered, "romance")
                logger.info(f"[{session_id}] Romance triggered with {triggered}!")
    except Exception as e:
        logger.error(f"check_romance_trigger error: {e}")


def build_relationship_context(session_id: str) -> str:
    """Mevcut ilişki skorlarını ve tiplerini system prompt için formatla."""
    relationships = get_relationships(session_id)
    if not relationships:
        return ""

    lines = []
    for char, data in relationships.items():
        score = data["score"] if isinstance(data, dict) else data
        rel_type = data.get("relationship_type", "neutral") if isinstance(data, dict) else "neutral"

        if rel_type == "romance":
            desc = f"romantik ilişki var — sana aşık, yakın temas ister, kıskançlık gösterebilir (skor: {score})"
        elif abs(score) <= 10:
            continue
        elif score >= 70:
            desc = f"çok yakın arkadaş, her şeyi paylaşır (skor: {score})"
        elif score >= 40:
            desc = f"arkadaş, yardımsever (skor: {score})"
        elif score >= 15:
            desc = f"olumlu tanıdık (skor: {score})"
        elif score <= -70:
            desc = f"düşman, açıkça düşmanca davranır (skor: {score})"
        elif score <= -40:
            desc = f"sevmez, mesafeli ve soğuk (skor: {score})"
        else:
            desc = f"biraz olumsuz (skor: {score})"

        lines.append(f"- {char}: {desc}")

    if not lines:
        return ""

    return (
        "## OYUNCUYLA İLİŞKİLER:\n"
        + "\n".join(lines)
        + "\n\nBu ilişki dinamiklerini karakterlerin konuşma ve davranışlarına yansıt. "
        "Romance tipindeki karakterler oyuncuya özel ilgi gösterir, flört eder, kıskanabilir."
    )
