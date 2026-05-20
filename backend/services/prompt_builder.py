import json
from pathlib import Path
from typing import List


async def build_prompt(user_name: str, character_id: str, location_id: str, messages: List[dict], memories: List[str]) -> list:
    """Builds system prompt from seed_data character and location JSON files."""
    project_root = Path(__file__).resolve().parents[2]
    char_path = project_root / "database" / "seed_data" / "characters.json"
    loc_path = project_root / "database" / "seed_data" / "locations.json"

    try:
        characters = json.loads(char_path.read_text(encoding="utf-8"))
    except Exception:
        characters = []

    try:
        locations = json.loads(loc_path.read_text(encoding="utf-8"))
    except Exception:
        locations = []

    character = next((c for c in characters if c.get("id") == character_id), None)
    location = next((l for l in locations if l.get("id") == location_id), None)

    if not character:
        character = {
            "name": "Hogwarts Narrator",
            "personality": "Tarafsız ve anlatıcı odaklı.",
            "speech_style": "Sahneleme ve yönlendirme odaklı, açık ve akıcı.",
            "base_prompt": "Sen Hogwarts anlatıcısısın. Sahneleri tasvir ederek rolplay akışını yönet.",
        }

    if not location:
        location = {
            "name": "Hogwarts",
            "lore_context": "Büyücülük okulunun koridorları, salonları ve gizemli atmosferi.",
        }

    memories_text = ""
    if memories:
        memories_text = "## Önceki konuşmalardan hafıza:\n" + "\n".join(f"- {m}" for m in memories)

    system_content = "\n\n".join(
        filter(
            None,
            [
                f"Aktif karakter: {character.get('name', '')}",
                f"Kişilik: {character.get('personality', '')}",
                f"Konuşma tarzı: {character.get('speech_style', '')}",
                character.get("base_prompt", ""),
                f"Aktif mekan: {location.get('name', '')}",
                location.get("lore_context", ""),
                memories_text,
            ],
        )
    ).replace("{{user}}", user_name or "Öğrenci")
    proactive_instruction = """

### PROACTIVE STORYTELLING RULES:
- You must NEVER just react to the user — you must also DRIVE the story forward
- Every response must introduce at least ONE of these: a new character approaching, an unexpected event, overheard conversation, environmental change, or a plot hook
- Characters must act on their OWN accord — Hermione might interrupt, Ron might say something awkward, a professor might walk by and notice the user
- After any user action, something in the world must also happen independently
- Build tension gradually — not every scene is calm, occasionally something unusual or mysterious should occur
- Always end your response with either an open situation or a character doing something that invites the user to react
- NEVER end with a question directed at the user like "Ne yapmak istersin?" — instead show the world reacting and let the user decide naturally
"""
    system_content += proactive_instruction

    out = [{"role": "system", "content": system_content}]
    out.extend(messages or [])
    return out
