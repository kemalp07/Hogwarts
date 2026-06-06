import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers.chat import router as chat_router
from routers.locations import router as locations_router

from services.world_simulation import start_organic_scheduler

app = FastAPI()


@app.on_event("startup")
async def startup_event():
    start_organic_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(locations_router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "hp-app backend (stub)"}


@app.get("/debug/env-status")
async def env_status():
    credential_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("VERTEX_AI_SERVICE_ACCOUNT_JSON") or os.getenv("VERTEX_AI_CREDENTIALS")
    return {
        "vertex_credential_set": bool(credential_path),
        "vertex_credential_value": credential_path or "",
        "vertex_location": os.getenv("VERTEX_AI_LOCATION", "us-central1"),
        "vertex_model": os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001"),
    }
