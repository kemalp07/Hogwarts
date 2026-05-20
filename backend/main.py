from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routers.chat import router as chat_router
from .routers.locations import router as locations_router

app = FastAPI()

# Dev CORS: frontend static server (5173) needs to call backend (8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4190",
        "http://localhost:4190",
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
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
