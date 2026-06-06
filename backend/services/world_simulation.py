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
import re
import threading
from datetime import datetime
from pathlib import Path

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest

from db.supabase_client import supabase
from services.house_points_service import (
    MAX_HOUSE_POINT_SPREAD,
    ORGANIC_DRIFT_HOUSE_CHANCE,
    ORGANIC_DRIFT_INTERVAL_SECONDS,
    ORGANIC_DRIFT_MIN_CHANGES,
    apply_point_delta_to_scores,
    cap_delta_for_spread,
    get_house_points,
    normalize_house_point_delta,
    pick_organic_drift_direction,
    random_house_point_delta,
    rebalance_points_spread,
    rubber_band_drift_pairs,
    RUBBER_BAND_SPREAD,
    save_house_points,
    snap_points_to_fives,
)
from services.vertex_ai import DEFAULT_LOCATION, DEFAULT_MODEL, _load_service_account

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
    current = get_house_points(session_id)
    for ch in changes:
        house = ch.get("house", "").lower()
        delta = normalize_house_point_delta(int(ch.get("delta", 0)))
        delta = cap_delta_for_spread(current, house, delta)
        if house not in HOUSES or delta == 0:
            continue
        before = current[house]
        current = apply_point_delta_to_scores(current, house, delta)
        applied = current[house] - before
        if applied == 0:
            continue
        try:
            supabase.table("house_point_events").insert({
                "session_id": session_id,
                "house": house,
                "delta": applied,
                "reason": ch.get("reason", ""),
                "source": ch.get("source", "world_event"),
            }).execute()
        except Exception as e:
            logger.error(f"[{session_id}] house_point_events insert failed: {e}")
    save_house_points(session_id, current)


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
- Oyuncu iyi/cesur/akıllı davrandıysa kendi evine +puan (delta pozitif)
- Kural ihlali, saygısızlık, ders kaçırma, öğretmen cezası varsa -puan (delta negatif)
- delta pozitif = puan kazanma, delta negatif = puan kaybetme — ikisi de geçerli
- Hiçbir olay yoksa boş liste döndür
- KRİTİK: Öğretmen sohbette açıkça bir sayı söylediyse (örn. "yirmi puan", "beş puan"), o sayıyı kullan — yine 5 veya 10'un katı olmalı
- Örnekler: "yirmi puan gidiyor" → delta: -20, "beş puan" → delta: -5, "on puan Gryffindor'a" → delta: 10
- Açık sayı yoksa delta SADECE ±5, ±10 veya nadiren ±15 olabilir
- Oran: %60 → 5 puan, %30 → 10 puan, %10 → 15 puan (15 en nadir)
- Organik değişimlerde neredeyse hep +puan (~%93 artış); açık ceza/kural ihlali hariç − verme
- Evler arası fark genelde ~30 civarı kalsın; tek seferde abartılı sıçrama yapma ama katı 30 kuralı yok
- SADECE JSON döndür, başka hiçbir şey yazma

Format örnekleri:
[{{"house": "gryffindor", "delta": 5, "reason": "Snape'e cesurca cevap verdi", "source": "conversation_event"}}]
[{{"house": "gryffindor", "delta": -5, "reason": "Snape geç kaldığı için ceza verdi", "source": "conversation_event"}}]

Değişim yoksa: []"""

    text = await _call_vertex(prompt, max_tokens=200, temperature=0.3)
    changes = _parse_json(text)
    if changes:
        logger.info(f"[{session_id}] Conversation points: {changes}")
        _apply_changes(session_id, changes)


async def simulate_world_events(session_id: str, week: int, day: int):
    """Sohbetten bağımsız, o günkü Hogwarts olaylarını simüle et."""

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe",
                 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}
    day_name = day_names.get(day, "gün")

    prompt = f"""Sen Hogwarts'ın gizli günlük kayıt büyücüsüsün. 1991-92 yılı, {week}. hafta, {day_name}.

Bugün Hogwarts'ta yaşanan 2-3 olayı hayal et ve ev puanlarına yansıt.
Sınıflarda, koridorlarda, yemekhanede, Quidditch sahasında olabilir.
Öğretmenler puan verir/alır, öğrenciler başarı gösterir veya kural çiğner.

Kurallar:
- 1991-92 Hogwarts atmosferi (1. sınıf öğrencileri var, Harry Potter da burada)
- Her delta ±5, ±10 veya nadiren ±15 (5 en sık, 10 orta, 15 en nadir)
- Neredeyse hep +puan (~%93); gerçek ceza/kural ihlali dışında − verme
- Evler arası fark genelde ~30 civarı olsun; bir evi çok öne atma ama katı sınır yok
- Her world_events çağrısında 4 evin TÜMÜNE değin — her ev en az bir olay alsın.
- Bazı olaylar pozitif bazıları negatif olsun. Eğer bir ev sohbette hiç geçmediyse,
- o eve arka planda bir şey olmuştur — Hufflepuff bahçe dersinde başarılı oldu,
- Slytherin koridorda kavga çıkardı gibi. Hiçbir ev 0'da kalmasın.
- SADECE JSON döndür

Format (4 evin TÜMÜ dahil olmalı, eksik ev kabul edilmez):
[
  {{"house": "slytherin", "delta": 10, "reason": "Draco iksir dersinde başarılı oldu", "source": "world_event"}},
  {{"house": "hufflepuff", "delta": 5, "reason": "Hufflepuff bahçe dersinde övgü aldı", "source": "world_event"}},
  {{"house": "ravenclaw", "delta": -5, "reason": "Ravenclaw öğrencisi yasaklı kitap okurken yakalandı", "source": "world_event"}},
  {{"house": "gryffindor", "delta": -10, "reason": "Fred ve George yemek salonunda şaka yaptı", "source": "world_event"}}
]"""

    text = await _call_vertex(prompt, max_tokens=250, temperature=0.85)
    changes = _parse_json(text)
    if changes:
        logger.info(f"[{session_id}] World events w={week} d={day}: {changes}")
        _apply_changes(session_id, changes)


async def maybe_generate_surprise_event(session_id: str, week: int, day: int) -> str | None:
    """
    Haftada 1-2 kez küçük bir sürpriz olay üretir.
    Abartılı değil — günlük Hogwarts yaşamından küçük detaylar.
    %15 ihtimalle tetiklenir.
    """
    if random.random() > 0.22:
        return None

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe",
                 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}
    day_name = day_names.get(day, "gün")

    prompt = f"""1991-92 Hogwarts'ta {week}. hafta, {day_name} günü.
Bugün için küçük, sıradan ama ilginç bir okul olayı üret.
ABARTMA — büyük dramatik olaylar değil, günlük Hogwarts yaşamı.

Örnekler:
- Koridor baykuşu yanlış odaya girdi
- Kantinde garip bir yemek çıktı
- Bir öğrenci yanlış büyü yaptı, komik sonuç oldu
- Kütüphanede nadir bir kitap kayboldu
- Peeves koridorda şakalar yapıyor

SADECE tek cümle, Türkçe, narrator sesiyle yaz. JSON değil, düz metin.
Başına [NARRATOR] koy."""

    text = await _call_vertex(prompt, max_tokens=80, temperature=0.9)
    if text and len(text) > 10:
        logger.info(f"[{session_id}] Surprise event generated")
        return text.strip()
    return None


async def analyze_class_attendance(session_id: str, conversation: list, player_house: str) -> list[dict]:
    """
    Sohbete bakarak oyuncunun hangi derslere girdiğini analiz et.
    Sadece kesin kanıt varsa işlem yap. Şüphede hiçbir şey yapma.
    """
    from services.house_points_service import (
        get_past_classes_today,
        mark_class_attended,
        mark_class_missed,
    )

    pending = get_past_classes_today(session_id)
    if not pending:
        return []

    if not conversation:
        return []

    recent = conversation[-15:]
    conv_text = "\n".join(
        f"{m['role'].upper()}: {m['content'][:400]}" for m in recent
    )

    subjects = [p["subject"] for p in pending]

    prompt = f"""Aşağıdaki Hogwarts roleplay sohbetini analiz et.
Oyuncu şu derslerin saatini geçirdi: {', '.join(subjects)}

SOHBET:
{conv_text}

Her ders için oyuncunun o derse girip girmediğini belirle.

Kurallar:
- Sadece sohbette AÇIKÇA o derse girildiğine dair kanıt varsa "attended" yaz
- Oyuncu o saatte AÇIKÇA başka yerdeyse (kütüphane, yemekhane, koridor vs.) "missed" yaz
- Emin değilsen, kanıt yoksa "unknown" yaz — unknown olursa ceza YOK
- Abartma, şüphede hep "unknown" seç

SADECE JSON döndür:
[
  {{"subject": "Büyülü İksirler", "status": "attended"}},
  {{"subject": "Uçuş Dersi", "status": "unknown"}}
]"""

    text = await _call_vertex(prompt, max_tokens=150, temperature=0.1)
    if not text:
        return []

    results = []
    try:
        clean = text.strip()
        if "```" in clean:
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean.strip())
        if not isinstance(data, list):
            return []

        pending_map = {p["subject"]: p for p in pending}

        for item in data:
            subject = item.get("subject", "")
            status = item.get("status", "unknown")

            if subject not in pending_map:
                continue

            cls = pending_map[subject]

            if status == "attended":
                mark_class_attended(session_id, subject, cls["week"], cls["day"])
                results.append({"subject": subject, "status": "attended"})
            elif status == "missed":
                mark_class_missed(
                    session_id, subject, cls["week"], cls["day"], cls["penalty"], player_house
                )
                results.append({
                    "subject": subject,
                    "status": "missed",
                    "penalty": cls["penalty"],
                    "teacher": cls["teacher"],
                })

    except Exception as e:
        logger.error(f"analyze_class_attendance parse error: {e}")

    return results


async def extract_time_from_response(session_id: str, ai_response: str):
    """
    AI yanıtındaki [TIME: Pazartesi 09:30 H2] tag'ini parse et.
    game_state'i güncelle.
    """
    if not ai_response:
        return

    pattern = r'\[TIME:\s*(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)\s+(\d{1,2}):(\d{2})\s+H(\d+)\]'
    match = re.search(pattern, ai_response, re.IGNORECASE)

    if not match:
        return

    day_name = match.group(1).strip()
    hour = int(match.group(2))
    week = int(match.group(4))

    day_map = {
        "pazartesi": 1, "salı": 2, "çarşamba": 3,
        "perşembe": 4, "cuma": 5, "cumartesi": 6, "pazar": 7
    }
    day = day_map.get(day_name.lower(), 1)

    if not supabase:
        return

    try:
        supabase.table("game_state").upsert({
            "session_id": session_id,
            "current_week": week,
            "current_day": day,
            "current_hour": hour,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="session_id").execute()
        logger.info(f"[{session_id}] Time from AI: {day_name} {hour:02d}:00 W{week}")
    except Exception as e:
        logger.error(f"extract_time_from_response error: {e}")


async def run_point_simulation(
    session_id: str,
    conversation: list,
    player_house: str,
    week: int = 1,
    day: int = 1,
) -> dict:
    """Ana fonksiyon. Kaçırılan dersler ve sürpriz olayı döner."""
    import asyncio

    attendance_task = asyncio.create_task(
        analyze_class_attendance(session_id, conversation, player_house)
    )
    surprise_task = asyncio.create_task(maybe_generate_surprise_event(session_id, week, day))

    await asyncio.gather(
        analyze_conversation_points(session_id, conversation, player_house),
        simulate_world_events(session_id, week, day),
        return_exceptions=True,
    )

    attendance_results = []
    try:
        attendance_results = await attendance_task
    except Exception as e:
        logger.error(f"analyze_class_attendance error: {e}")

    surprise = None
    try:
        surprise = await surprise_task
    except Exception as e:
        logger.error(f"Surprise event error: {e}")

    missed = [r for r in attendance_results if r.get("status") == "missed"]
    return {"missed": missed, "surprise": surprise}


_scheduler_started = False
_scheduler_lock = threading.Lock()


def _get_all_active_sessions() -> list[str]:
    """Son 15 dakikada aktif olan sessionları çek."""
    if not supabase:
        return []
    try:
        from datetime import timedelta
        cutoff = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
        resp = supabase.table("game_state").select("session_id").gte("last_activity_at", cutoff).execute()
        return [row["session_id"] for row in (resp.data or [])]
    except Exception as e:
        logger.error(f"_get_all_active_sessions error: {e}")
        return []


def _organic_drift_change(
    current: dict,
    house: str,
    max_points: int,
    min_points: int,
    spread: int,
    forced_direction: int | None = None,
) -> dict | None:
    direction = forced_direction if forced_direction in (-1, 1) else pick_organic_drift_direction(current, house)
    delta = random_house_point_delta(direction, organic=True)
    if delta < 0 and forced_direction != -1:
        delta = abs(delta)

    delta = cap_delta_for_spread(current, house, delta)
    if delta == 0:
        return None

    return {
        "house": house,
        "delta": delta,
        "reason": "Hogwarts'ta günlük organik değişim",
        "source": "organic_drift",
    }


def _apply_drift_change(current: dict, change: dict) -> dict:
    house = change["house"]
    return apply_point_delta_to_scores(current, house, change["delta"])


def _apply_organic_drift():
    """
    Aktif oturumlara periyodik küçük puan değişimi uygular.
    Fark açılınca rubber-band ile lider geri çekilir, geridekiler yaklaşır.
    """
    sessions = _get_all_active_sessions()
    if not sessions:
        return

    for session_id in sessions:
        try:
            current = get_house_points(session_id)

            max_points = max(current.values()) if current.values() else 0
            min_points = min(current.values()) if current.values() else 0
            spread = max_points - min_points

            changes = []

            if spread >= RUBBER_BAND_SPREAD and random.random() < 0.25:
                for house, direction in rubber_band_drift_pairs(current):
                    if any(c["house"] == house for c in changes):
                        continue
                    change = _organic_drift_change(
                        current, house, max_points, min_points, spread, forced_direction=direction,
                    )
                    if change:
                        changes.append(change)
                        current = _apply_drift_change(current, change)
                        max_points = max(current.values())
                        min_points = min(current.values())
                        spread = max_points - min_points

            for house in HOUSES:
                if random.random() > ORGANIC_DRIFT_HOUSE_CHANCE:
                    continue
                if any(c["house"] == house for c in changes):
                    continue
                change = _organic_drift_change(current, house, max_points, min_points, spread)
                if change:
                    changes.append(change)
                    current = _apply_drift_change(current, change)
                    max_points = max(current.values())
                    min_points = min(current.values())
                    spread = max_points - min_points

            if len(changes) < ORGANIC_DRIFT_MIN_CHANGES:
                remaining = [h for h in HOUSES if not any(c["house"] == h for c in changes)]
                random.shuffle(remaining)
                for house in remaining:
                    if len(changes) >= ORGANIC_DRIFT_MIN_CHANGES:
                        break
                    change = _organic_drift_change(current, house, max_points, min_points, spread)
                    if change:
                        changes.append(change)
                        current = _apply_drift_change(current, change)
                        max_points = max(current.values())
                        min_points = min(current.values())
                        spread = max_points - min_points

            if changes:
                _apply_changes(session_id, changes)
                logger.debug(f"[{session_id}] Organic drift: {[(c['house'], c['delta']) for c in changes]}")
            else:
                save_house_points(session_id, current)
        except Exception as e:
            logger.error(f"Organic drift error for {session_id}: {e}")


def start_organic_scheduler():
    """
    FastAPI startup'ta bir kez çağrılır.
    ORGANIC_DRIFT_INTERVAL_SECONDS aralığında _apply_organic_drift çalıştırır.
    """
    global _scheduler_started
    with _scheduler_lock:
        if _scheduler_started:
            return
        _scheduler_started = True

    def scheduler_loop():
        import time
        logger.info(
            f"Organic drift scheduler started — running every {ORGANIC_DRIFT_INTERVAL_SECONDS}s"
        )
        while True:
            time.sleep(ORGANIC_DRIFT_INTERVAL_SECONDS)
            try:
                _apply_organic_drift()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")

    thread = threading.Thread(target=scheduler_loop, daemon=True)
    thread.start()
    logger.info("Organic drift scheduler thread launched")


def _dormitory_for_house(house: str) -> str:
    house = (house or "gryffindor").lower()
    if house == "slytherin":
        return "slytherin_dormitory"
    if house == "ravenclaw":
        return "ravenclaw_common_room"
    if house == "hufflepuff":
        return "hufflepuff_common_room"
    return "gryffindor_dormitory"


def _extract_location_from_narrative(text: str, player_house: str = "gryffindor") -> str | None:
    if not text:
        return None

    rules = [
        (re.compile(r"yatakhane|yatakhaneye|yatağa|yataga|koğuş|kogus|koğuşuna|kogusuna|dormitory", re.I), lambda: _dormitory_for_house(player_house)),
        (re.compile(r"büyük salon|buyuk salon|great hall|yemek salonu", re.I), lambda: "great_hall"),
        (re.compile(r"kütüphane|kutuphane|library", re.I), lambda: "library"),
        (re.compile(r"iksir sınıf|iksir sinif|potions", re.I), lambda: "potions_classroom"),
        (re.compile(r"zindan|dungeon", re.I), lambda: "dungeons"),
        (re.compile(r"quidditch|saha", re.I), lambda: "quidditch_field"),
        (re.compile(r"koridor|corridor|merdiven", re.I), lambda: "corridor"),
        (re.compile(r"baykuş|owlery", re.I), lambda: "owlery"),
        (re.compile(r"hastane kanad|hospital wing", re.I), lambda: "hospital_wing"),
        (re.compile(r"yasak orman|forbidden forest", re.I), lambda: "forbidden_forest"),
        (re.compile(r"hogsmeade", re.I), lambda: "hogsmeade"),
        (re.compile(r"sera|greenhouse|herbology|bitkibilim", re.I), lambda: "herbology_greenhouse"),
        (re.compile(r"savunma sınıf|defense classroom|dada", re.I), lambda: "defense_classroom"),
    ]

    chunks = [text] + list(reversed(re.split(r"\n\n+", text)))
    for chunk in chunks:
        for pattern, resolver in rules:
            if pattern.search(chunk):
                return resolver() if callable(resolver) else resolver
    return None


async def extract_inventory_and_location(session_id: str, ai_response: str):
    """
    AI yanıtındaki [LOCATION:], [ITEM+:], [ITEM-:] tag'lerini parse et.
    """
    if not ai_response:
        return

    from services.house_points_service import add_inventory_item, remove_inventory_item, update_location, get_game_state

    # Konum — önce tag, sonra anlatı metni
    location_match = re.search(r'\[LOCATION:\s*([^\]]+)\]', ai_response, re.IGNORECASE)
    if location_match:
        location = location_match.group(1).strip().lower().replace(" ", "_")
        update_location(session_id, location)
    else:
        state = get_game_state(session_id)
        player_house = state.get("player_house", "gryffindor")
        narrative_loc = _extract_location_from_narrative(ai_response, player_house)
        if narrative_loc:
            update_location(session_id, narrative_loc)

    # Envantere ekle
    for match in re.finditer(r'\[ITEM\+:\s*([^\]]+)\]', ai_response, re.IGNORECASE):
        raw = match.group(1).strip()
        parts = [p.strip() for p in raw.split("|")]
        item_name = parts[0]
        item_type = parts[1] if len(parts) > 1 else "misc"
        description = parts[2] if len(parts) > 2 else ""
        add_inventory_item(session_id, item_name, item_type, description)

    # Envanterden çıkar
    for match in re.finditer(r'\[ITEM-:\s*([^\]]+)\]', ai_response, re.IGNORECASE):
        item_name = match.group(1).strip()
        remove_inventory_item(session_id, item_name)
