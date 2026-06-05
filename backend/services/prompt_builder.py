import json
from pathlib import Path
from typing import List


_SPEC_CARD_CACHE = None
_LOREBOOK_CACHE = None


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_json_once(path: Path, cache_name: str):
    global _SPEC_CARD_CACHE, _LOREBOOK_CACHE

    if cache_name == "spec" and _SPEC_CARD_CACHE is not None:
        return _SPEC_CARD_CACHE
    if cache_name == "lorebook" and _LOREBOOK_CACHE is not None:
        return _LOREBOOK_CACHE

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {} if cache_name == "spec" else []

    if cache_name == "spec":
        _SPEC_CARD_CACHE = data
    else:
        _LOREBOOK_CACHE = data

    return data


def _load_spec_card():
    root = _project_root()
    spec_path = root / "database" / "main_wizarding-world-3a4374295000_spec_v2.json"
    return _read_json_once(spec_path, "spec")


def _load_lorebook():
    root = _project_root()
    lorebook_path = root / "database" / "main_The Ultimate Wizarding World Book — Hogwarts, Harry Potter._world_info.json"
    return _read_json_once(lorebook_path, "lorebook")


def _extract_lorebook_records(raw_lorebook):
    if isinstance(raw_lorebook, list):
        for entry in raw_lorebook:
            if isinstance(entry, dict):
                yield entry
        return

    if isinstance(raw_lorebook, dict):
        entries = raw_lorebook.get("entries")
        if isinstance(entries, list):
            for entry in entries:
                if isinstance(entry, dict):
                    yield entry
            return
        if isinstance(entries, dict):
            for entry in entries.values():
                if isinstance(entry, dict):
                    yield entry
            return

        for value in raw_lorebook.values():
            if isinstance(value, dict) and ("content" in value or "key" in value):
                yield value


def _build_spec_prompt(user_name: str) -> str:
    spec_card = _load_spec_card()
    spec_data = spec_card.get("data", {}) if isinstance(spec_card, dict) else {}

    sections = []
    for field in ("system_prompt", "description", "scenario"):
        value = spec_data.get(field, "")
        if isinstance(value, str) and value.strip():
            sections.append(value.replace("{{user}}", user_name or "Öğrenci").strip())

    return "\n\n".join(sections)


def _format_memories(memories: List[str]) -> str:
    if not memories:
        return ""
    return "## Önceki konuşmalardan hafıza:\n" + "\n".join(f"- {memory}" for memory in memories if str(memory).strip())


def _recent_conversation_text(messages: List[dict], max_messages: int = 6) -> str:
    recent_messages = (messages or [])[-max_messages:]
    parts = []
    for message in recent_messages:
        if not isinstance(message, dict):
            continue
        role = str(message.get("role", "")).strip()
        content = str(message.get("content", "")).strip()
        if content:
            parts.append(f"{role}: {content}" if role else content)
    return "\n".join(parts)


def get_lorebook_entries(text: str, max_entries: int = 8) -> list[str]:
    if max_entries <= 0:
        return []

    raw_lorebook = _load_lorebook()
    text_lower = (text or "").lower()
    seen_contents = set()
    constant_entries = []
    matched_entries = []

    for entry in _extract_lorebook_records(raw_lorebook):
        if not entry.get("enabled", True):
            continue

        content = str(entry.get("content", "")).strip()
        if not content or content in seen_contents:
            continue

        keys = entry.get("key") or []
        if not isinstance(keys, list):
            keys = [keys]

        is_constant = bool(entry.get("constant", False))
        matches_text = False
        if not is_constant and text_lower:
            for key in keys:
                key_text = str(key).strip().lower()
                if key_text and key_text in text_lower:
                    matches_text = True
                    break

        if is_constant:
            constant_entries.append(content)
            seen_contents.add(content)
            continue

        if matches_text:
            matched_entries.append(content)
            seen_contents.add(content)

    return (constant_entries + matched_entries)[:max_entries]

async def build_prompt(user_name: str, character_id: str, location_id: str, messages: List[dict], memories: List[str]) -> list:
    """Builds the system prompt using the character card, lorebook, and seed data."""
    project_root = _project_root()
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

    spec_prompt = _build_spec_prompt(user_name)
    recent_text = _recent_conversation_text(messages)
    lorebook_entries = get_lorebook_entries(recent_text)

    lorebook_text = ""
    if lorebook_entries:
        lorebook_text = "## World Knowledge:\n" + "\n".join(f"- {entry}" for entry in lorebook_entries)

    memories_text = _format_memories(memories)

    system_parts = [
        f"Aktif karakter: {character.get('name', '')}",
        f"Kişilik: {character.get('personality', '')}",
        f"Konuşma tarzı: {character.get('speech_style', '')}",
        character.get("base_prompt", ""),
        f"Aktif mekan: {location.get('name', '')}",
        location.get("lore_context", ""),
        spec_prompt,
        lorebook_text,
        memories_text,
    ]

    system_content = "\n\n".join(part for part in system_parts if part).replace("{{user}}", user_name or "Öğrenci")
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
