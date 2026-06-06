"""
House Points Service
- Puan okuma/yazma (Supabase)
- Micro-drift (günlük rastgele)
- Event spike (özel olaylar)
- Player action puan değişimi
- Manipülasyon koruması: dışarıdan doğrudan puan atanamaz
"""

import json
import random
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from ..db.supabase_client import supabase

logger = logging.getLogger(__name__)

HOUSES = ["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]
CALENDAR_PATH = Path(__file__).resolve().parents[2] / "backend" / "data" / "school_calendar.json"

_CALENDAR_CACHE = None


def _load_calendar() -> dict:
    global _CALENDAR_CACHE
    if _CALENDAR_CACHE is None:
        _CALENDAR_CACHE = json.loads(CALENDAR_PATH.read_text(encoding="utf-8"))
    return _CALENDAR_CACHE


# ── READ ──────────────────────────────────────────────────────────────────────

def get_house_points(session_id: str) -> dict:
    """Returns {gryffindor: int, hufflepuff: int, ravenclaw: int, slytherin: int}"""
    if not supabase:
        return {h: 0 for h in HOUSES}
    try:
        resp = supabase.table("house_points").select("*").eq("session_id", session_id).execute()
        data = (resp.data or [{}])[0]
        return {h: int(data.get(h, 0)) for h in HOUSES}
    except Exception as e:
        logger.error(f"get_house_points error: {e}")
        return {h: 0 for h in HOUSES}


def get_game_state(session_id: str) -> dict:
    if not supabase:
        return {"current_week": 1, "current_day": 1, "current_hour": 8, "player_house": "gryffindor", "last_activity_at": None}
    try:
        resp = supabase.table("game_state").select("*").eq("session_id", session_id).execute()
        if resp.data:
            return resp.data[0]
        # İlk kez → oluştur
        default = {"session_id": session_id, "current_week": 1, "current_day": 1, "current_hour": 8, "player_house": "gryffindor"}
        supabase.table("game_state").insert(default).execute()
        return default
    except Exception as e:
        logger.error(f"get_game_state error: {e}")
        return {"current_week": 1, "current_day": 1, "current_hour": 8, "player_house": "gryffindor"}


# ── WRITE (internal only) ─────────────────────────────────────────────────────

def _apply_delta(session_id: str, house: str, delta: int, reason: str, source: str):
    """INTERNAL. Direct delta application. Never call from user-facing endpoints."""
    if not supabase:
        return
    try:
        current = get_house_points(session_id)
        new_val = max(0, current[house] + delta)  # puan 0'ın altına düşmez
        supabase.table("house_points").upsert({
            "session_id": session_id,
            house: new_val,
            "updated_at": datetime.utcnow().isoformat()
        }, on_conflict="session_id").execute()
        supabase.table("house_point_events").insert({
            "session_id": session_id,
            "house": house,
            "delta": delta,
            "reason": reason,
            "source": source
        }).execute()
        logger.info(f"[{session_id}] {house} {'+' if delta>0 else ''}{delta} ({source}): {reason}")
    except Exception as e:
        logger.error(f"_apply_delta error: {e}")


# ── PUBLIC API ────────────────────────────────────────────────────────────────

def apply_player_action(session_id: str, player_house: str, delta: int, reason: str):
    """Oyuncunun davranışından gelen puan değişimi. Max ±20 per action."""
    clamped = max(-20, min(20, delta))
    _apply_delta(session_id, player_house, clamped, reason, "player_action")


def apply_missed_class(session_id: str, player_house: str, subject: str, penalty: int):
    """Ders kaçırma cezası."""
    reason = f"{subject} dersine girilmedi"
    _apply_delta(session_id, player_house, penalty, reason, "missed_class")


def apply_micro_drift(session_id: str, player_house: str):
    """Gün geçişinde diğer evlere sessiz micro-drift uygula."""
    cal = _load_calendar()
    drift_range = cal.get("micro_drift", {}).get("range_per_day", [-3, 3])
    for house in HOUSES:
        if house == player_house:
            continue  # oyuncunun evi bu fonksiyonda etkilenmez
        delta = random.randint(drift_range[0], drift_range[1])
        if delta != 0:
            _apply_delta(session_id, house, delta, "Günlük doğal değişim", "natural_drift")


def apply_special_event_spike(session_id: str, week: int, day: int):
    """Takvimde o güne ait özel etkinlik varsa spike uygula."""
    cal = _load_calendar()
    for event in cal.get("special_events", []):
        if event["week"] == week and event["day"] == day:
            spike = event.get("spike", {})
            for house, delta in spike.items():
                if delta != 0:
                    _apply_delta(session_id, house, delta, event["label"], "event_spike")
            return event.get("label")
    return None


def get_todays_schedule(week: int, day: int) -> list:
    """O haftanın o günündeki ders listesini döner."""
    cal = _load_calendar()
    for w in cal.get("weeks", []):
        if w["week"] == week:
            return w["days"].get(str(day), [])
    # Eğer o hafta calendar'da yoksa Hafta 1 programını tekrarla (yıl boyunca sabit döngü)
    for w in cal.get("weeks", []):
        if w["week"] == 1:
            return w["days"].get(str(day), [])
    return []


def advance_day(session_id: str) -> dict:
    """
    Günü ilerlet. Micro-drift + event spike uygula.
    Yeni game_state döner.
    """
    state = get_game_state(session_id)
    player_house = state.get("player_house", "gryffindor")
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)

    # Günü ilerlet
    day += 1
    if day > 7:
        day = 1
        week += 1

    # Micro-drift
    apply_micro_drift(session_id, player_house)

    # Event spike kontrolü
    event_label = apply_special_event_spike(session_id, week, day)

    # DB güncelle
    if supabase:
        try:
            supabase.table("game_state").upsert({
                "session_id": session_id,
                "current_week": week,
                "current_day": day,
                "current_hour": 8,
                "last_activity_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }, on_conflict="session_id").execute()
        except Exception as e:
            logger.error(f"advance_day update error: {e}")

    new_state = get_game_state(session_id)
    new_state["event_triggered"] = event_label
    return new_state


def check_inactivity_advance(session_id: str, threshold_minutes: int = 30) -> bool:
    """
    Son aktiviteden threshold_minutes geçtiyse otomatik gün ilerlet.
    True döner eğer gün ilerlediyse.
    """
    state = get_game_state(session_id)
    last_activity = state.get("last_activity_at")
    if not last_activity:
        return False
    try:
        if isinstance(last_activity, str):
            last_dt = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
        else:
            last_dt = last_activity
        elapsed = (datetime.utcnow().replace(tzinfo=last_dt.tzinfo) - last_dt).total_seconds() / 60
        if elapsed >= threshold_minutes:
            advance_day(session_id)
            return True
    except Exception as e:
        logger.error(f"check_inactivity_advance error: {e}")
    return False


def build_narrator_day_message(session_id: str) -> str:
    """
    Sabah mesajı: bugünkü program + uyarılar.
    Bu metin [NARRATOR] tag'i ile chat'e enjekte edilir.
    """
    state = get_game_state(session_id)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)
    player_house = state.get("player_house", "gryffindor")

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}
    day_name = day_names.get(day, "Gün")

    schedule = get_todays_schedule(week, day)
    points = get_house_points(session_id)
    player_pts = points.get(player_house, 0)

    house_display = {
        "gryffindor": "Gryffindor",
        "hufflepuff": "Hufflepuff",
        "ravenclaw": "Ravenclaw",
        "slytherin": "Slytherin"
    }

    if not schedule:
        return f"*{day_name} sabahı. Bugün ders yok — Hogwarts koridorları serbest.*"

    lines = [f"*{day_name} sabahı, {week}. hafta. {house_display[player_house]}: {player_pts} puan.*\n"]
    lines.append("Bugünkü program:")
    for cls in schedule:
        teacher = f" — {cls['teacher']}" if cls.get("teacher") else ""
        penalty_note = ""
        if cls.get("house_penalty"):
            p = cls["house_penalty"]["delta"]
            penalty_note = f" *(gitmezsen {abs(p)} puan)*"
        hint = f" {cls['lore_hint']}" if cls.get("lore_hint") else ""
        lines.append(f"• **{cls['time']}** {cls['subject']}{teacher}{penalty_note}.{hint}")

    return "\n".join(lines)
