import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
import os
import uuid
import json
from ..services.prompt_builder import build_prompt
from ..services.memory_service import generate_summary, get_memories, maybe_summarize_and_compress, save_memory
from ..services.vertex_ai import stream_vertex_ai
from ..services.house_points_service import (
    get_house_points,
    get_game_state,
    check_inactivity_advance,
    build_narrator_day_message,
    advance_day,
    advance_hour,
    increment_message_count,
    check_sleep_trigger,
    build_current_time_context,
    get_todays_schedule,
    get_missed_classes_for_prompt,
    build_missed_class_context,
)
from ..services.world_simulation import run_point_simulation
from ..services.relationship_service import analyze_relationship_changes, build_relationship_context
from ..db.supabase_client import insert_message, supabase
import traceback
from pathlib import Path
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 30


def _normalize_history_role(role: str) -> Optional[str]:
    if role in ("assistant", "ai"):
        return "assistant"
    if role == "user":
        return "user"
    return None


def _merge_history_and_current(history: list, current_user_content: str) -> list[dict]:
    """Merge client history with the current user turn; dedupe trailing user message."""
    merged: list[dict] = []

    for item in history or []:
        if not isinstance(item, dict):
            continue
        role = _normalize_history_role(str(item.get("role", "")))
        if role is None:
            continue
        content = (item.get("content") or item.get("text") or "").strip()
        if not content:
            continue
        merged.append({"role": role, "content": content})

    current = (current_user_content or "").strip()
    if current:
        if not (
            merged
            and merged[-1]["role"] == "user"
            and merged[-1]["content"] == current
        ):
            merged.append({"role": "user", "content": current})

    return merged[-MAX_HISTORY_MESSAGES:]


def detect_character(text: str) -> str:
    """Detect character name from response text based on keywords."""
    checks = [
        (["Şapka", "Hat", "Sorting"], "Sıralama Şapkası"),
        (["McGonagall"], "Profesör McGonagall"),
        (["Dumbledore"], "Profesör Dumbledore"),
        (["Snape"], "Profesör Snape"),
        (["Hermione"], "Hermione Granger"),
        (["Hagrid"], "Rubeus Hagrid"),
        (["Draco", "Malfoy"], "Draco Malfoy"),
        (["Ron"], "Ron Weasley"),
    ]
    for keywords, name in checks:
        if any(k in text for k in keywords):
            return name
    return "Hogwarts"


@router.get("/history")
async def history_endpoint(session_id: str = Query(..., min_length=1)):
    """Return message history for a session, ordered by created_at ascending."""
    if not supabase:
        return JSONResponse(content={"messages": []})

    try:
        resp = (
            supabase
            .table("messages")
            .select("role,content,created_at")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        messages = getattr(resp, "data", None) or []
    except Exception:
        raise HTTPException(status_code=500, detail="Mesaj gecmisi okunamadi")

    return JSONResponse(content={"messages": messages})

# Test endpoint for fast responses (dev/debugging)
@router.post("/chat-test")
async def chat_test(request: Request):
    """Quick test endpoint returning mock response."""
    body = await request.json()
    message = body.get("message", "")
    session_id = body.get("session_id") or str(uuid.uuid4())
    user_name = body.get("user_name") or "Öğrenci"
    
    if message == "":
        mock_response = f"Merhaba {user_name}! Hogwarts'a hoş geldin. Sihir ve macera seni bekliyor. Neler yapmak istersin?"
    else:
        mock_response = f"Yaptığın harita çok ilginç. Hemen yanıt verebileceğim: '{message}' - ancak şu anda Vertex AI bağlantıda sorun yaşanıyor. Lütfen servis hesabı JSON ve proje ayarlarını kontrol et. :)"
    
    return JSONResponse(content={"response": mock_response, "model": "test", "session_id": session_id})


@router.post("/chat")
async def chat_endpoint(request: Request):
    """Receives a simple chat request and forwards to the model.

    Request body accepted fields (defaults applied):
    - message: str (required)
    - session_id: str (optional)
    - character_id: str (default: "hogwarts-narrator")
    - location_id: str (default: "great-hall")
    - user_name: str (default: "Öğrenci")
    - history: list[dict] (optional) prior turns [{"role": "user"|"assistant", "content": "..."}]
    """
    body = await request.json()
    message = body.get("message", "")
    history = body.get("history") or []
    session_id = body.get("session_id") or str(uuid.uuid4())
    character_id = body.get("character_id") or "hogwarts-narrator"
    location_id = body.get("location_id") or "great-hall"
    user_name = body.get("user_name") or "Öğrenci"
    character_profile = body.get("character_profile")

    # Inactivity kontrolü → otomatik gün geçişi
    day_advanced = check_inactivity_advance(session_id, threshold_minutes=30)

    # last_activity_at güncelle — scheduler sadece aktif sessionlara drift uygulasın
    if supabase:
        try:
            supabase.table("game_state").upsert(
                {"session_id": session_id, "last_activity_at": datetime.utcnow().isoformat()},
                on_conflict="session_id"
            ).execute()
        except Exception as e:
            logger.error(f"last_activity_at update error: {e}")

    increment_message_count(session_id)

    sleep_triggered = check_sleep_trigger(message)
    if sleep_triggered:
        advance_hour(session_id, hours=14)

    missed_context = build_missed_class_context(get_missed_classes_for_prompt(session_id))

    game_state = get_game_state(session_id)
    time_context = build_current_time_context(session_id)

    narrator_injection = None
    if game_state.get("current_hour") == 8 or sleep_triggered or day_advanced:
        narrator_injection = build_narrator_day_message(session_id)

    house_points = get_house_points(session_id)

    # allow empty message for initial opening prompts; message may be empty string

    # Vertex AI does not like empty user turns, so we supply a short opening instruction when needed.
    user_message_for_model = message if message.strip() else (
        f"Kullanıcı henüz yazmadı. Anlatıcı olarak Büyük Salon açılışını kısa tasvir et; "
        f"{user_name} adlı oyuncuyu hikâyeye davet et. Tek bir hocanın ilk şahısından sürekli konuşma."
    )

    conversation_messages = _merge_history_and_current(history, user_message_for_model)
    conversation_for_memory = _merge_history_and_current(history, message)
    memories = await get_memories(session_id)

    relationship_context = build_relationship_context(session_id)

    messages_for_model = await build_prompt(
        user_name=user_name,
        character_id=character_id,
        location_id=location_id,
        messages=conversation_messages,
        memories=memories,
        character_profile=character_profile,
        relationship_context=relationship_context,
        time_context=time_context,
        missed_context=missed_context,
    )

    model = body.get("model") or os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
    memory_state = {
        "full_text": "",
        "conversation": conversation_for_memory,
    }

    async def persist_memory_after_response(sid: str, char_id: str, state: dict):
        full_text = str(state.get("full_text") or "").strip()
        if len(full_text) <= 200:
            return

        conversation_for_summary = list(state.get("conversation") or [])
        conversation_for_summary.append({"role": "assistant", "content": full_text})

        summary = await generate_summary(conversation_for_summary)
        if summary.strip():
            await save_memory(sid, char_id, summary.strip())

        await maybe_summarize_and_compress(sid, char_id, conversation_for_summary)

    async def save_messages(sid: str, user_text: str, assistant_text: str):
        try:
            insert_message(session_id=sid, character_id=character_id, role="user", content=user_text)
        except Exception:
            pass
        try:
            insert_message(session_id=sid, character_id=character_id, role="assistant", content=assistant_text)
        except Exception:
            pass

    full_text = ""

    async def generate():
        nonlocal full_text
        out_buf = ""
        FLUSH_CHARS = 24

        meta = json.dumps({
            "type": "meta",
            "session_id": session_id,
            "character_name": "",
            "house_points": house_points,
            "game_state": {
                "week": game_state.get("current_week", 1),
                "day": game_state.get("current_day", 1),
                "player_house": game_state.get("player_house", "gryffindor"),
            },
            "narrator_injection": narrator_injection,
        })
        yield f"data: {meta}\n\n"

        try:
            system_prompt = ""
            if messages_for_model and messages_for_model[0].get("role") == "system":
                system_prompt = messages_for_model[0].get("content", "")
            print("SYSTEM PROMPT SENT:", system_prompt[:500], flush=True)
            async for chunk in stream_vertex_ai(messages_for_model, model=model):
                full_text += chunk
                out_buf += chunk

                # Vertex bazen küçük delta'lar döndürür; event sayısını azaltmak için birleştiriyoruz.
                if len(out_buf) >= FLUSH_CHARS or "\n" in out_buf:
                    payload = json.dumps({"type": "chunk", "text": out_buf})
                    yield f"data: {payload}\n\n"
                    out_buf = ""

            if out_buf:
                payload = json.dumps({"type": "chunk", "text": out_buf})
                yield f"data: {payload}\n\n"
        except Exception as exc:
            # write full traceback to logs/chat_error.log for debugging
            try:
                logs_dir = Path(__file__).resolve().parents[2] / "logs"
                logs_dir.mkdir(parents=True, exist_ok=True)
                log_path = logs_dir / "chat_error.log"
                ts = datetime.utcnow().isoformat() + "Z"
                with open(log_path, "a", encoding="utf-8") as fh:
                    fh.write(f"[{ts}] Exception in generate(): {exc}\n")
                    traceback.print_exc(file=fh)
                    fh.write("\n")
            except Exception:
                pass

            stub = f"Vertex AI yanıt üretirken hata oluştu: {exc}"
            full_text += stub
            payload = json.dumps({"type": "chunk", "text": stub})
            yield f"data: {payload}\n\n"

        memory_state["full_text"] = full_text
        char_name = detect_character(full_text)
        await save_messages(session_id, message, full_text)

        # Mevcut puanı gönder — frontend /run-simulation sonrası fetchHousePoints ile günceller
        try:
            _final_points = get_house_points(session_id)
        except Exception:
            _final_points = house_points

        done = json.dumps({
            "type": "done",
            "character_name": char_name,
            "house_points": _final_points,
            "simulation_params": {
                "session_id": session_id,
                "player_house": game_state.get("player_house", "gryffindor"),
                "week": game_state.get("current_week", 1),
                "day": game_state.get("current_day", 1),
            },
        })
        yield f"data: {done}\n\n"

    background_tasks = BackgroundTasks()
    background_tasks.add_task(persist_memory_after_response, session_id, character_id, memory_state)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
        background=background_tasks,
    )


@router.post("/run-simulation")
async def run_simulation_endpoint(request: Request):
    body = await request.json()
    session_id = body.get("session_id", "")
    player_house = body.get("player_house", "gryffindor")
    week = int(body.get("week", 1))
    day = int(body.get("day", 1))
    conversation = body.get("conversation", [])
    player_attraction = body.get("player_attraction", "Her ikisi")

    if not session_id:
        return JSONResponse(content={"status": "error", "detail": "session_id required"})

    logger.info(f"[{session_id}] Starting simulation house={player_house} w={week} d={day}")
    sim_result = {"missed": [], "surprise": None}
    try:
        sim_result = await run_point_simulation(session_id, conversation, player_house, week, day)
        logger.info(f"[{session_id}] Simulation complete")
    except Exception as e:
        logger.error(f"Simulation error: {e}", exc_info=True)

    try:
        await analyze_relationship_changes(
            session_id,
            conversation,
            body.get("player_name", "Öğrenci"),
            player_attraction,
        )
    except Exception as e:
        logger.error(f"Relationship analysis error: {e}")

    points = get_house_points(session_id)
    missed_classes = sim_result.get("missed") or []
    missed_text = ""
    if missed_classes:
        parts = [f"{m['subject']} ({m['teacher']}) -{m['penalty']} puan" for m in missed_classes]
        missed_text = "Kaçırılan dersler: " + ", ".join(parts)

    return JSONResponse(content={
        "status": "ok",
        "house_points": points,
        "surprise_event": sim_result.get("surprise"),
        "missed_classes": missed_text,
    })


@router.delete("/api/messages")
async def delete_messages(session_id: str = Query(..., min_length=1)):
    """Delete all messages and memories for a given session_id."""
    if supabase:
        supabase.table("messages").delete().eq("session_id", session_id).execute()
        supabase.table("user_memories").delete().eq("session_id", session_id).execute()
    return {"status": "ok"}


@router.get("/schedule")
async def schedule_endpoint(session_id: str = Query(..., min_length=1)):
    """Bugünün ve yarının ders programını döner."""
    state = get_game_state(session_id)
    week = state.get("current_week", 1)
    day = state.get("current_day", 1)
    hour = state.get("current_hour", 8)

    tomorrow_day = day + 1
    tomorrow_week = week
    if tomorrow_day > 7:
        tomorrow_day = 1
        tomorrow_week += 1

    today_schedule = get_todays_schedule(week, day)
    tomorrow_schedule = get_todays_schedule(tomorrow_week, tomorrow_day)

    day_names = {1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe",
                 5: "Cuma", 6: "Cumartesi", 7: "Pazar"}

    def build_classes(schedule, current_hour, is_today):
        classes = []
        for cls in schedule:
            cls_hour = int(cls["time"].split(":")[0])
            if is_today:
                if cls_hour < current_hour:
                    status = "done"
                elif cls_hour == current_hour:
                    status = "active"
                elif cls_hour <= current_hour + 2:
                    status = "upcoming"
                else:
                    status = "future"
            else:
                status = "future"
            classes.append({
                "time": cls["time"],
                "subject": cls["subject"],
                "teacher": cls.get("teacher", ""),
                "status": status,
                "penalty": abs(cls["house_penalty"]["delta"]) if cls.get("house_penalty") else 0,
            })
        return classes

    return JSONResponse(content={
        "week": week,
        "day": day,
        "day_name": day_names.get(day, "Gün"),
        "hour": hour,
        "schedule": build_classes(today_schedule, hour, True),
        "tomorrow_day_name": day_names.get(tomorrow_day, "Gün"),
        "tomorrow_schedule": build_classes(tomorrow_schedule, hour, False),
    })


@router.get("/house-points")
async def house_points_endpoint(session_id: str = Query(..., min_length=1)):
    """Anlık ev puanlarını döner. Frontend polling için."""
    points = get_house_points(session_id)
    state = get_game_state(session_id)
    return JSONResponse(content={
        "points": points,
        "game_state": {
            "week": state.get("current_week", 1),
            "day": state.get("current_day", 1),
            "player_house": state.get("player_house", "gryffindor"),
        }
    })


@router.post("/advance-day")
async def advance_day_endpoint(request: Request):
    """Manuel gün geçişi. Kullanıcı 'uyumak' istediğinde çağrılır."""
    body = await request.json()
    session_id = body.get("session_id", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id gerekli")
    new_state = advance_day(session_id)
    narrator_msg = build_narrator_day_message(session_id)
    points = get_house_points(session_id)
    return JSONResponse(content={
        "game_state": new_state,
        "house_points": points,
        "narrator_message": narrator_msg,
    })


@router.post("/set-house")
async def set_house_endpoint(request: Request):
    body = await request.json()
    session_id = body.get("session_id", "")
    house_raw = body.get("house", "")
    house = house_raw.lower().strip()  # "Gryffindor" → "gryffindor"

    valid = ["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]
    if not session_id or house not in valid:
        raise HTTPException(status_code=400, detail=f"Geçersiz ev: '{house_raw}'")

    if supabase:
        supabase.table("game_state").upsert(
            {
                "session_id": session_id,
                "player_house": house,
                "current_week": 1,
                "current_day": 7,
                "current_hour": 20,
                "daily_message_count": 0,
            },
            on_conflict="session_id"
        ).execute()
    return {"status": "ok", "house": house}


