from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter()


@router.get("/locations")
async def list_locations():
    """Return available locations from seed data for the frontend to display."""
    project_root = Path(__file__).resolve().parents[2]
    loc_path = project_root / "database" / "seed_data" / "locations.json"
    try:
        data = json.loads(loc_path.read_text(encoding="utf-8"))
    except Exception:
        data = []

    # Return minimal fields that frontend needs
    out = []
    for l in data:
        out.append({
            "id": l.get("id"),
            "name": l.get("name"),
            "description": l.get("description"),
            "background_url": l.get("background_url"),
            "lore_context": l.get("lore_context"),
        })

    return out
