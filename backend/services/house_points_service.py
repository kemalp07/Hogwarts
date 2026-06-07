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
from typing import Dict, Optional, Tuple

from db.supabase_client import supabase

logger = logging.getLogger(__name__)

HOUSES = ["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]
TARGET_HOUSE_POINT_SPREAD = 80   # yumuşak hedef — organik denge buna doğru çeker
HARD_HOUSE_POINT_SPREAD = 150    # sert üst sınır — ancak aşırı uçta devreye girer
MAX_HOUSE_POINT_SPREAD = TARGET_HOUSE_POINT_SPREAD  # geriye uyumluluk
MIN_POINTS_FLOOR_BASE = 5
POINTS_FLOOR_INTERVAL_MINUTES = 3
POINTS_FLOOR_STEP = 5
POINT_INCREASE_CHANCE = 0.60  # organik: %60 artış, %40 azalış
ORGANIC_DRIFT_INTERVAL_SECONDS = 45
ORGANIC_DRIFT_HOUSE_CHANCE = 0.85
ORGANIC_DRIFT_MIN_CHANGES = 1
SPREAD_BALANCE_THRESHOLD = 40
RUBBER_BAND_SPREAD = 100
ROUTINE_POINT_MAGNITUDES = [5, 10]
ROUTINE_POINT_WEIGHTS = [70, 30]  # 5 en sık, 10 orta
CALENDAR_PATH = Path(__file__).resolve().parents[2] / "backend" / "data" / "school_calendar.json"

_CALENDAR_CACHE = None


def random_point_sign(direction: Optional[int] = None) -> int:
    """Yön seç: zorunlu değilse %80 artış, %20 azalış."""
    if direction in (-1, 1):
        return direction
    return 1 if random.random() < POINT_INCREASE_CHANCE else -1


def random_house_point_delta(direction: Optional[int] = None, organic: bool = False) -> int:
    """Ağırlıklı rastgele puan. organic=True iken neredeyse hiç eksi vermez."""
    sign = random_point_sign(direction)
    if organic and sign < 0 and direction not in (-1,):
        sign = 1
    magnitude = random.choices(ROUTINE_POINT_MAGNITUDES, weights=ROUTINE_POINT_WEIGHTS, k=1)[0]
    return sign * magnitude


def normalize_house_point_delta(delta: int) -> int:
    """Rutin puanlar 5 / 10 / 15; öğretmenin açık söylediği büyük miktarlar 20 / 50."""
    if delta == 0:
        return 0
    sign = 1 if delta > 0 else -1
    magnitude = abs(int(delta))
    if magnitude >= 45:
        snapped = 50
    elif magnitude >= 18:
        snapped = 20
    elif magnitude >= 13:
        snapped = 15
    elif magnitude >= 8:
        snapped = 10
    else:
        snapped = 5
    return sign * snapped


def _spread_cap_magnitudes(delta: int) -> list[int]:
    magnitude = abs(int(delta))
    if magnitude >= 45:
        return [50, 15, 10, 5]
    if magnitude >= 18:
        return [20, 15, 10, 5]
    return [m for m in reversed(ROUTINE_POINT_MAGNITUDES) if m <= magnitude] or [5]


def snap_points_to_fives(points: dict) -> dict:
    return {h: int(round(int(points.get(h, 0)) / 5) * 5) for h in HOUSES}


def _parse_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    return datetime.utcnow()


def ensure_points_floor_started_at(session_id: str) -> datetime:
    """Oturum için taban sayacının başlangıç anını döner (yoksa şimdi kaydeder)."""
    state = get_game_state(session_id)
    raw = state.get("points_floor_started_at")
    if raw:
        return _parse_datetime(raw)

    now = datetime.utcnow()
    if supabase:
        try:
            supabase.table("game_state").upsert({
                "session_id": session_id,
                "points_floor_started_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }, on_conflict="session_id").execute()
        except Exception as e:
            logger.warning(f"ensure_points_floor_started_at: {e}")
    return now


def compute_minimum_points_floor(started_at: datetime, now: Optional[datetime] = None) -> int:
    """
    Her 5 dakikada taban +5.
    t=0 → 5, t=15dk → 20, t=30dk → 35
    """
    now = now or datetime.utcnow()
    elapsed_minutes = max(0.0, (now - started_at).total_seconds() / 60)
    intervals = int(elapsed_minutes // POINTS_FLOOR_INTERVAL_MINUTES)
    return MIN_POINTS_FLOOR_BASE + intervals * POINTS_FLOOR_STEP


def apply_minimum_points_floor(points: dict, floor: int) -> dict:
    """Yalnızca en düşük ev(ler)i tabana yükselt — hepsini aynı seviyeye çekme."""
    adjusted = snap_points_to_fives(points)
    floor = snap_points_to_fives({h: floor for h in HOUSES})["gryffindor"]
    current_min = min(adjusted[h] for h in HOUSES)
    if current_min >= floor:
        return adjusted
    for house in HOUSES:
        if adjusted[house] == current_min:
            adjusted[house] = floor
    return adjusted


def get_points_floor_info(session_id: str) -> dict:
    started_at = ensure_points_floor_started_at(session_id)
    floor = compute_minimum_points_floor(started_at)
    return {
        "minimum_floor": floor,
        "points_floor_started_at": started_at.isoformat() + "Z",
    }


def normalize_session_house_points(session_id: str, points: dict) -> dict:
    """5'in katı + zaman tabanı; sert dengeleme yalnızca aşırı farkta."""
    started_at = ensure_points_floor_started_at(session_id)
    floor = compute_minimum_points_floor(started_at)
    with_floor = apply_minimum_points_floor(points, floor)
    if house_points_spread(with_floor) > HARD_HOUSE_POINT_SPREAD:
        return rebalance_points_spread(with_floor, HARD_HOUSE_POINT_SPREAD)
    return snap_points_to_fives(with_floor)


def _houses_at_extreme(points: dict, extreme: str) -> list:
    values = {h: int(points.get(h, 0)) for h in HOUSES}
    target = max(values.values()) if extreme == "max" else min(values.values())
    return [h for h in HOUSES if values[h] == target]


def pick_organic_drift_direction(points: dict, house: str) -> Optional[int]:
    """Organik drift: neredeyse hep +; nadiren lider hafif geriler."""
    values = {h: int(points.get(h, 0)) for h in HOUSES}
    spread = max(values.values()) - min(values.values())
    house_pts = values[house]
    max_pts = max(values.values())

    if spread >= TARGET_HOUSE_POINT_SPREAD and house_pts >= max_pts:
        return -1 if random.random() < 0.08 else None

    return None


def rubber_band_drift_pairs(points: dict) -> list:
    """Fark çok açıldıysa yalnızca geridekine + ver; lidere zorla - verme."""
    spread = house_points_spread(points)
    if spread < RUBBER_BAND_SPREAD:
        return []

    laggers = _houses_at_extreme(points, "min")
    if laggers and random.random() < 0.45:
        return [(random.choice(laggers), 1)]
    return []


def house_points_spread(points: dict) -> int:
    values = [int(points.get(h, 0)) for h in HOUSES]
    if not values:
        return 0
    return max(values) - min(values)


def apply_point_delta_to_scores(current: dict, house: str, delta: int) -> dict:
    """Puana delta uygula; sert dengeleme yalnızca aşırı farkta."""
    updated = snap_points_to_fives({**current, house: max(0, current[house] + delta)})
    if house_points_spread(updated) > HARD_HOUSE_POINT_SPREAD:
        return rebalance_points_spread(updated, HARD_HOUSE_POINT_SPREAD)
    return updated


def rebalance_points_spread(points: dict, max_spread: int = HARD_HOUSE_POINT_SPREAD) -> dict:
    """Evler arası fark max_spread'i aşarsa liderden 5 düşür veya geriden olana 5 ekle."""
    balanced = snap_points_to_fives(points)
    guard = 0
    while house_points_spread(balanced) > max_spread and guard < 20:
        guard += 1
        leader = max(HOUSES, key=lambda h: balanced[h])
        lagger = min(HOUSES, key=lambda h: balanced[h])
        if balanced[leader] >= 5:
            balanced[leader] -= 5
        else:
            balanced[lagger] += 5
    return balanced


def _leader_and_lagger(points: dict) -> Tuple[str, str, Dict[str, int]]:
    values = {h: int(points.get(h, 0)) for h in HOUSES}
    leader = max(HOUSES, key=lambda h: values[h])
    lagger = min(HOUSES, key=lambda h: values[h])
    return leader, lagger, values


def save_house_points(session_id: str, points: dict) -> dict:
    """Puanları 5'in katına yuvarla, zaman tabanı + fark limitini uygula ve kaydet."""
    if not supabase:
        return normalize_session_house_points(session_id, points)
    balanced = normalize_session_house_points(session_id, points)
    try:
        supabase.table("house_points").upsert({
            "session_id": session_id,
            **{h: balanced[h] for h in HOUSES},
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="session_id").execute()
    except Exception as e:
        logger.error(f"save_house_points error: {e}")
    return balanced


def cap_delta_for_spread(
    current: dict,
    house: str,
    delta: int,
    max_spread: int = HARD_HOUSE_POINT_SPREAD,
) -> int:
    """Sert üst sınırı aşmayacak şekilde deltayı kırp; ~30 hedefi zorunlu değil."""
    delta = normalize_house_point_delta(delta)
    if delta == 0 or house not in HOUSES:
        return 0

    current = snap_points_to_fives({h: int(current.get(h, 0)) for h in HOUSES})
    spread = house_points_spread(current)
    leader, lagger, values = _leader_and_lagger(current)

    sign = 1 if delta > 0 else -1
    for magnitude in _spread_cap_magnitudes(delta):
        trial_delta = sign * magnitude
        trial = {h: current[h] for h in HOUSES}
        trial[house] = max(0, trial[house] + trial_delta)
        new_spread = house_points_spread(trial)
        if new_spread > max_spread:
            continue
        # Hedef (~30) üstü: liderin farkı açması zorlaşır ama yasak değil
        if (
            spread >= TARGET_HOUSE_POINT_SPREAD
            and new_spread > spread
            and trial_delta > 0
            and values[house] >= values[leader]
            and random.random() > 0.45
        ):
            continue
        return trial_delta
    return 0


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
        raw = {h: int(data.get(h, 0)) for h in HOUSES}
        snapped = snap_points_to_fives(raw)
        balanced = normalize_session_house_points(session_id, snapped)
        if balanced != snapped:
            return save_house_points(session_id, balanced)
        return balanced
    except Exception as e:
        logger.error(f"get_house_points error: {e}")
        return {h: 0 for h in HOUSES}


def get_game_state(session_id: str) -> dict:
    if not supabase:
        return {
            "current_week": 1,
            "current_day": 7,
            "current_hour": 20,
            "player_house": "gryffindor",
            "daily_message_count": 0,
            "last_activity_at": None,
        }
    try:
        resp = supabase.table("game_state").select("*").eq("session_id", session_id).execute()
        if resp.data:
            return resp.data[0]
        # İlk kez → oluştur
        default = {
            "session_id": session_id,
            "current_week": 1,
            "current_day": 7,
            "current_hour": 20,
            "player_house": "gryffindor",
            "daily_message_count": 0,
            "points_floor_started_at": datetime.utcnow().isoformat(),
        }
        supabase.table("game_state").insert(default).execute()
        return default
    except Exception as e:
        logger.error(f"get_game_state error: {e}")
        return {
            "current_week": 1,
            "current_day": 7,
            "current_hour": 20,
            "player_house": "gryffindor",
            "daily_message_count": 0,
        }


# ── WRITE (internal only) ─────────────────────────────────────────────────────

def _apply_delta(session_id: str, house: str, delta: int, reason: str, source: str):
    """INTERNAL. Direct delta application. Never call from user-facing endpoints."""
    if not supabase:
        return
    delta = normalize_house_point_delta(delta)
    if delta == 0:
        return
    try:
        current = get_house_points(session_id)
        delta = cap_delta_for_spread(current, house, delta)
        if delta == 0:
            return
        updated = apply_point_delta_to_scores(current, house, delta)
        save_house_points(session_id, updated)
        applied_delta = updated[house] - current[house]
        if applied_delta == 0:
            return
        supabase.table("house_point_events").insert({
            "session_id": session_id,
            "house": house,
            "delta": applied_delta,
            "reason": reason,
            "source": source
        }).execute()
        logger.info(
            f"[{session_id}] {house} {'+' if applied_delta > 0 else ''}{applied_delta} ({source}): {reason}"
        )
    except Exception as e:
        logger.error(f"_apply_delta error: {e}")


# ── PUBLIC API ────────────────────────────────────────────────────────────────

def apply_player_action(session_id: str, player_house: str, delta: int, reason: str):
    """Oyuncunun davranışından gelen puan değişimi. Max ±20 per action."""
    clamped = normalize_house_point_delta(max(-20, min(20, delta)))
    if clamped == 0:
        return
    _apply_delta(session_id, player_house, clamped, reason, "player_action")


def apply_missed_class(session_id: str, player_house: str, subject: str, penalty: int):
    """Ders kaçırma cezası."""
    reason = f"{subject} dersine girilmedi"
    _apply_delta(session_id, player_house, penalty, reason, "missed_class")


def apply_micro_drift(session_id: str, player_house: str):
    """Gün geçişinde diğer evlere sessiz micro-drift uygula."""
    cal = _load_calendar()
    for house in HOUSES:
        if house == player_house:
            continue  # oyuncunun evi bu fonksiyonda etkilenmez
        delta = random_house_point_delta()
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
    cal = _load_calendar()
    weekly = cal.get("weekly_schedule", {})

    # Yapı: {day_str: [...]} — haftadan bağımsız, gün bazlı
    day_str = str(day)
    day_schedule = weekly.get(day_str)

    if isinstance(day_schedule, list):
        return day_schedule

    # Alternatif yapı: {week_str: {day_str: [...]}}
    if isinstance(day_schedule, dict):
        week_str = str(week)
        result = day_schedule.get(week_str, [])
        return result if isinstance(result, list) else []

    return []


def advance_hour(session_id: str, hours: int = 1) -> dict:
    """Saati ilerlet. Gece geçince güne ilerle."""
    state = get_game_state(session_id)
    hour = state.get("current_hour", 8)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)

    hour += hours

    if hour >= 23:
        hour = 8
        day += 1
        if day > 7:
            day = 1
            week += 1

    if supabase:
        try:
            supabase.table("game_state").upsert({
                "session_id": session_id,
                "current_week": week,
                "current_day": day,
                "current_hour": hour,
                "last_activity_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }, on_conflict="session_id").execute()
        except Exception as e:
            logger.error(f"advance_hour error: {e}")

    return get_game_state(session_id)


def get_message_count(session_id: str) -> int:
    """O günkü mesaj sayısını çek."""
    if not supabase:
        return 0
    try:
        resp = supabase.table("game_state").select("daily_message_count").eq("session_id", session_id).execute()
        return (resp.data or [{}])[0].get("daily_message_count", 0)
    except Exception:
        return 0


def increment_message_count(session_id: str) -> int:
    """Mesaj sayacını artır — artık saat ilerletmiyor."""
    if not supabase:
        return 0
    try:
        count = get_message_count(session_id) + 1
        supabase.table("game_state").upsert({
            "session_id": session_id,
            "daily_message_count": count,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="session_id").execute()
        return count
    except Exception as e:
        logger.error(f"increment_message_count error: {e}")
        return 0


def check_sleep_trigger(message: str) -> bool:
    """Oyuncu uyumak istedi mi?"""
    sleep_keywords = [
        "uyumak istiyorum", "yatıyorum", "uyuyorum", "yatmak istiyorum",
        "geceyi geçir", "sabah olsun", "uyuyayım", "yatayım",
        "yoruldum yatıyorum", "odama gidiyorum",
    ]
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in sleep_keywords)


def get_past_classes_today(session_id: str) -> list[dict]:
    """
    O gün saat geçmiş ama henüz attend/miss kaydı olmayan dersleri döner.
    """
    if not supabase:
        return []

    state = get_game_state(session_id)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)
    hour = state.get("current_hour", 8)
    schedule = get_todays_schedule(week, day)

    pending = []
    for cls in schedule:
        cls_hour = int(cls["time"].split(":")[0])
        if cls_hour >= hour:
            continue
        if not cls.get("house_penalty"):
            continue

        try:
            resp = (
                supabase.table("missed_class_log")
                .select("id,attended")
                .eq("session_id", session_id)
                .eq("subject", cls["subject"])
                .eq("week", week)
                .eq("day", day)
                .execute()
            )
            if resp.data:
                continue
        except Exception:
            continue

        pending.append({
            "subject": cls["subject"],
            "teacher": cls.get("teacher", ""),
            "time": cls["time"],
            "penalty": abs(cls["house_penalty"]["delta"]),
            "week": week,
            "day": day,
        })

    return pending


def mark_class_attended(session_id: str, subject: str, week: int, day: int):
    """Derse girildi olarak işaretle — ceza yok."""
    if not supabase:
        return
    try:
        supabase.table("missed_class_log").upsert({
            "session_id": session_id,
            "subject": subject,
            "week": week,
            "day": day,
            "attended": True,
            "penalty_applied": 0,
        }, on_conflict="session_id,subject,week,day").execute()
    except Exception as e:
        logger.error(f"mark_class_attended error: {e}")


def mark_class_missed(session_id: str, subject: str, week: int, day: int, penalty: int, player_house: str):
    """Ders kaçırıldı — ceza uygula."""
    if not supabase:
        return
    try:
        supabase.table("missed_class_log").upsert({
            "session_id": session_id,
            "subject": subject,
            "week": week,
            "day": day,
            "attended": False,
            "penalty_applied": penalty,
        }, on_conflict="session_id,subject,week,day").execute()
        apply_missed_class(session_id, player_house, subject, -penalty)
        logger.info(f"[{session_id}] Missed: {subject} -{penalty}")
    except Exception as e:
        logger.error(f"mark_class_missed error: {e}")


def get_missed_classes_for_prompt(session_id: str) -> list[dict]:
    """Bugün loglanmış kaçırılan dersleri döner (system prompt enjeksiyonu için)."""
    if not supabase:
        return []

    state = get_game_state(session_id)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)

    try:
        resp = (
            supabase.table("missed_class_log")
            .select("subject, penalty_applied")
            .eq("session_id", session_id)
            .eq("week", week)
            .eq("day", day)
            .eq("attended", False)
            .gt("penalty_applied", 0)
            .execute()
        )
        schedule = get_todays_schedule(week, day)
        teacher_map = {c["subject"]: c.get("teacher", "") for c in schedule}
        return [
            {
                "subject": row["subject"],
                "teacher": teacher_map.get(row["subject"], ""),
                "penalty": row["penalty_applied"],
            }
            for row in (resp.data or [])
        ]
    except Exception as e:
        logger.error(f"get_missed_classes_for_prompt error: {e}")
        return []


def build_missed_class_context(missed: list[dict]) -> str:
    """Kaçırılan dersler için system prompt enjeksiyonu."""
    if not missed:
        return ""

    lines = ["## KAÇIRILAN DERSLER (bu mesajda öğretmen tepkisini yansıt):"]
    for m in missed:
        teacher = m.get("teacher", "öğretmen")
        lines.append(
            f"- {m['subject']} ({teacher}): -{m['penalty']} puan kesildi. "
            f"{teacher} bir sonraki karşılaşmada bunu hatırlayacak ve sitem edecek."
        )
    lines.append("Bu bilgiyi doğal bir şekilde sahneye yansıt — öğretmeni sitem ettir ama abartma.")

    return "\n".join(lines)


def build_current_time_context(session_id: str) -> str:
    """
    Mevcut zamanı ve o saat için ders/etkinlik bilgisini döner.
    System prompt'a enjekte edilir.
    """
    state = get_game_state(session_id)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)
    hour = state.get("current_hour", 8)

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe",
                 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}
    day_name = day_names.get(day, "Gün")

    schedule = get_todays_schedule(week, day)

    current_class = None
    upcoming_class = None
    missed_classes = []

    for cls in schedule:
        cls_hour = int(cls["time"].split(":")[0])
        if cls_hour == hour:
            current_class = cls
        elif cls_hour == hour + 1:
            upcoming_class = cls
        elif cls_hour < hour:
            missed_classes.append(cls)

    lines = [f"## OYUN ZAMANI: {day_name}, Saat {hour:02d}:00, {week}. Hafta"]
    lines.append("BUGÜNÜN RESMİ PROGRAMI — SADECE BUNLARI KULLAN, KENDİ EKLEME YAPMA:")
    for cls in schedule:
        teacher = cls.get("teacher", "")
        lines.append(f"  {cls['time']}: {cls['subject']}" + (f" ({teacher})" if teacher else ""))
    if not schedule:
        lines.append("  Bugün ders yok.")

    if current_class:
        lines.append(
            f"ŞU AN DERS SAATİ: {current_class['subject']} ({current_class['teacher']}) — oyuncu bu derste olmalı!"
        )

    if upcoming_class:
        lines.append(
            f"1 SAAT SONRA: {upcoming_class['subject']} ({upcoming_class['teacher']}) — yaklaşan ders"
        )

    if missed_classes and hour > 9:
        missed_names = [c["subject"] for c in missed_classes]
        lines.append(f"KAÇIRILAN DERSLER: {', '.join(missed_names)} — öğretmenler bunu hatırlıyor")

    # Konum
    location = get_location(session_id)
    location_display = location.replace("_", " ").title()
    lines.append(f"KEMAL'İN MEVCUT KONUMU: {location_display}")

    # Envanter
    inventory = get_inventory(session_id)
    if inventory:
        items = ", ".join(f"{i['item_name']}" for i in inventory)
        lines.append(f"KEMAL'İN ENVANTERİ: {items}")
    else:
        lines.append("KEMAL'İN ENVANTERİ: Asa (akasya, 11 inç), Büyücülük kitapları, Pelerin")

    return "\n".join(lines)


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


def get_inventory(session_id: str) -> list:
    if not supabase:
        return []
    try:
        resp = supabase.table("player_inventory").select("item_name, item_type, description").eq("session_id", session_id).execute()
        return resp.data or []
    except Exception as e:
        logger.error(f"get_inventory error: {e}")
        return []


def add_inventory_item(session_id: str, item_name: str, item_type: str = "misc", description: str = "") -> bool:
    if not supabase:
        return False
    try:
        supabase.table("player_inventory").upsert({
            "session_id": session_id,
            "item_name": item_name,
            "item_type": item_type,
            "description": description,
        }, on_conflict="session_id,item_name").execute()
        return True
    except Exception as e:
        logger.error(f"add_inventory_item error: {e}")
        return False


def remove_inventory_item(session_id: str, item_name: str) -> bool:
    if not supabase:
        return False
    try:
        supabase.table("player_inventory").delete().eq("session_id", session_id).eq("item_name", item_name).execute()
        return True
    except Exception as e:
        logger.error(f"remove_inventory_item error: {e}")
        return False


def update_location(session_id: str, location: str) -> bool:
    if not supabase:
        return False
    try:
        supabase.table("game_state").upsert({
            "session_id": session_id,
            "current_location": location,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="session_id").execute()
        return True
    except Exception as e:
        logger.error(f"update_location error: {e}")
        return False


def get_location(session_id: str) -> str:
    state = get_game_state(session_id)
    return state.get("current_location", "gryffindor_tower")
