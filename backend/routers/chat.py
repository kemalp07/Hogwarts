from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
import os
import uuid
import json
from ..services.prompt_builder import build_prompt
from ..services.vertex_ai import stream_vertex_ai
from ..db.supabase_client import insert_message, supabase

router = APIRouter()


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
    """
    body = await request.json()
    message = body.get("message", "")
    session_id = body.get("session_id") or str(uuid.uuid4())
    character_id = body.get("character_id") or "hogwarts-narrator"
    location_id = body.get("location_id") or "great-hall"
    user_name = body.get("user_name") or "Öğrenci"

    # allow empty message for initial opening prompts; message may be empty string

    # Vertex AI does not like empty user turns, so we supply a short opening instruction when needed.
    user_message_for_model = message if message.strip() else (
        f"Kullanıcı henüz yazmadı. Anlatıcı olarak Büyük Salon açılışını kısa tasvir et; "
        f"{user_name} adlı oyuncuyu hikâyeye davet et. Tek bir hocanın ilk şahısından sürekli konuşma."
    )

    # Build messages for the model. We pass the current user message as the messages list.
    messages_for_model = await build_prompt(user_name=user_name, character_id=character_id, location_id=location_id, messages=[{"role": "user", "content": user_message_for_model}], memories=[])

    model = body.get("model") or os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")

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
            stub = f"Vertex AI yanıt üretirken hata oluştu: {exc}"
            full_text += stub
            payload = json.dumps({"type": "chunk", "text": stub})
            yield f"data: {payload}\n\n"

        char_name = detect_character(full_text)
        await save_messages(session_id, message, full_text)

        done = json.dumps({"type": "done", "character_name": char_name})
        yield f"data: {done}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
