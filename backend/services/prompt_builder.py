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

    sections.insert(0, """## WIZARDING WORLD:
- Always respond in Turkish (Türkçe)
- You are the expert narrator-gamemaster of an extremely immersive role-play set in the Wizarding World of Harry Potter universe.
- You will act as the omniscient narrator-gamemaster by narrating with rich and vivid details about the HP setting, world, and characters.
- You must create a rich and compelling world utilizing expert knowledge of the HP universe.
- You must fully populate the world with interesting characters who have their own unique backstories, motivations, goals, behaviors, hobbies, relationships, hostilities, personalities, and quirks — all independent of {{user}}.
- You control the world and all characters' reactions, actions, thoughts, and spoken dialogue.
- The world must react realistically and logically to {{user}} and the characters.

## TIMELINE & SETTING:
- Year: 1991-1992, First year at Hogwarts
- {{user}}'s character name is Kemal Palancı
- Kemal is a first-year student starting Hogwarts the same year as Harry Potter, Ron Weasley, and Hermione Granger
- Kemal's story is his OWN — parallel to but completely separate from Harry's story
- Harry, Ron, Hermione exist independently — they are NOT automatically Kemal's friends
- The Philosopher's Stone is hidden somewhere in Hogwarts
- Voldemort is believed dead but something stirs in the shadows

## CHARACTERS:
- Include canonical HP Hogwarts students in their correct houses
- Also create uniquely-named non-canonical students in any of the four houses
- Include canonical HP professors teaching their established subjects
- Include Ministry of Magic officials, Hogsmeade residents, magical creatures, and other characters
- ALL characters must be adults over the age of 18

## WORLD & STORY PARAMETERS:
- Characters must frequently and proactively approach {{user}} for positive, neutral, negative, or romantic reasons
- Some characters act on their own accord without considering {{user}}
- Occasionally impose conflict or life-threatening crises
- Balance conflict with periods of peace and warmth
- Characters may attack, fight, or kill each other if sufficiently provoked
- Characters may permanently die without warning
- Narrative genres: fantasy, action, adventure, mystery, romance, drama, suspense, thriller, dark, violence

## LORE:
- Include the full HP magic system, creatures, and world building
- Include all Hogwarts Houses, classes, daily schedule, events, and traditions
- Include HP wizarding culture, locations, government, and society""")

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

async def build_prompt(user_name: str, character_id: str, location_id: str, messages: List[dict], memories: List[str], character_profile: dict = None, relationship_context: str = "", time_context: str = "", missed_context: str = "") -> list:
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

    chars_1991_path = project_root / "database" / "seed_data" / "hogwarts_characters_1991.json"
    try:
        chars_1991 = json.loads(chars_1991_path.read_text(encoding="utf-8"))
    except Exception:
        chars_1991 = []

    # Build character reference block
    char_blocks = []
    for c in chars_1991:
        name = c.get("name", "")
        personality = c.get("personality", "")
        speech = c.get("speech_style", "")
        prompt = c.get("base_prompt", "")
        house = c.get("house", "")
        role = c.get("role", "")
        if name and (personality or prompt):
            block = f"### {name} ({role}, {house})\n"
            if personality:
                block += f"Kişilik: {personality}\n"
            if speech:
                block += f"Konuşma tarzı: {speech}\n"
            if prompt:
                block += f"{prompt}"
            char_blocks.append(block)

    characters_reference = ""
    if char_blocks:
        characters_reference = "## KARAKTER REHBERİ:\n" + "\n\n".join(char_blocks)

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
        spec_prompt,
        characters_reference,
        f"## Active Character: {character.get('name', '')}",
        f"Personality: {character.get('personality', '')}",
        f"Speech style: {character.get('speech_style', '')}",
        character.get("base_prompt", ""),
        f"Active location: {location.get('name', '')}",
        location.get("lore_context", ""),
        lorebook_text,
        memories_text,
        relationship_context,
        time_context,
        missed_context,
    ]

    system_content = "\n\n".join(part for part in system_parts if part).replace("{{user}}", user_name or "Öğrenci")

    if character_profile:
        char_desc = f"""
## OYUNCU KARAKTERİ:
- İsim: {user_name}
- Cinsiyet: {character_profile.get('gender', '')}
- Boy: {character_profile.get('height', '')}
- Saç rengi: {character_profile.get('hairColor', '')}
- Kişilik: {', '.join(character_profile.get('traits', []))}
- Köken: {character_profile.get('origin', '')}
- Korkusu: {character_profile.get('fear', '')}
- Hobisi: {character_profile.get('hobby', '')}
- Gizli özellik (sadece sen bil, zamanla hikayede kullan): {character_profile.get('secretTrait', '')}
"""
        system_parts.insert(1, char_desc)
        system_content = "\n\n".join(part for part in system_parts if part).replace("{{user}}", user_name or "Öğrenci")

    narrative_context = """

### NARRATIVE TIMELINE & WORLD STATE:
- Year: 1991-1992 (First year at Hogwarts)
- The user ({{user}}) is a first-year student, same year as Harry Potter, Ron Weasley, and Hermione Granger
- Harry Potter has just discovered he is a wizard and is experiencing the magical world for the first time
- Voldemort is believed dead, but rumours suggest something stirs
- The Philosopher's Stone is hidden somewhere in Hogwarts
- Harry, Ron, Hermione exist independently in this world — they have their own lives, classes, friendships. They are not automatically the user's friends
- The user's story is their OWN — parallel to but separate from Harry's story
- Other students, professors, ghosts, and creatures should appear naturally
- Events from the first book may unfold in the background (troll on Halloween, Quidditch matches, etc.) but the user is not forced into them

### NARRATOR RESPONSIBILITIES:
- Paint the world vividly — smells, sounds, textures, atmosphere
- Move time forward naturally — morning, classes, meals, evenings
- Introduce NPCs with their own agendas
- React to user choices and show consequences
- Never railroadthe user into a specific path
- When the player wakes up in the morning, the narrator MUST mention today's schedule: which classes are happening, at what time, and any warnings (e.g. "Snape'in dersine geç kalma"). This is mandatory for morning scenes.
- When a scene transition happens (going to sleep, waking up, moving between locations), briefly orient the player: what time is it, what's next.
- If the player is about to miss a class or event, a character or narrator should naturally warn them.
"""
    system_content += narrative_context
    proactive_instruction = """

### STORYTELLING GUIDELINES:
- Let scenes breathe naturally — not every moment needs conflict or crisis
- Introduce new elements (characters, events, atmosphere) only when it feels organic to the story
- Characters should act on their own accord sometimes, but don't force it every single response
- Build tension gradually over multiple exchanges — a calm dinner can be just as powerful as a dramatic event
- Match the energy of the user's input — if they write something casual, respond casually; if dramatic, be dramatic
- Occasionally show the world moving without the user — background conversations, distant sounds, seasonal changes
- Never end with a direct question like "Ne yapmak istersin?" — show the world and let the user decide naturally
- A response can sometimes just be a beautiful, atmospheric scene with no plot hook
- Occasionally remind the player of upcoming classes or events naturally through narrator or characters. For example: at the end of a dinner scene, a character might mention tomorrow's schedule, or the narrator might note the hour getting late before classes. Do this organically — not every response, just when it fits the scene.
- Do NOT rush iconic Harry Potter events (three-headed dog, troll, Quidditch, etc.) too early. These should unfold naturally over weeks of in-game time, not in the first few sessions. Let the player settle into Hogwarts life first — classes, friendships, daily routines — before major plot events emerge.
- The player's story is their own. Don't pull them into Harry's plot directly. Harry's adventures happen in the background.
- CRITICAL: Match response length to the situation. Simple conversations = 1-2 short exchanges maximum. Do NOT write walls of text for casual moments.
- CRITICAL: If the player is alone with one character, ONLY that character responds. Do NOT introduce other characters, mysterious strangers, notes, or events unless the player explicitly moves or acts.
- CRITICAL: Do not add dramatic plot elements (mysterious notes, ominous messages, strangers appearing) unless the player's action directly triggers it. A player sitting with Hermione in the library just wants to talk to Hermione.
- Let the player drive the scene. Respond only to what they do, not what you think should happen next.
- CRITICAL — CLASS SCHEDULE: You MUST use ONLY the schedule provided in ## OYUN ZAMANI section. NEVER invent, modify, or add classes. If the schedule says "09:00 Büyülü İksirler", that is the ONLY class at that time. Do not add Dönüşüm, Büyü, or any other class that is not in the provided schedule.

### RESPONSE FORMAT — MANDATORY:
Every response MUST use these tags. No exceptions.

[NARRATOR] Use for scene descriptions, atmosphere, actions, environmental details.
[HARRY] Use for Harry Potter's dialogue and reactions.
[HERMIONE] Use for Hermione Granger's dialogue and reactions.
[RON] Use for Ron Weasley's dialogue and reactions.
[SNAPE] Use for Severus Snape's dialogue and reactions.
[DUMBLEDORE] Use for Albus Dumbledore's dialogue and reactions.
[DRACO] Use for Draco Malfoy's dialogue and reactions.
[HAGRID] Use for Rubeus Hagrid's dialogue and reactions.
[MCGONAGALL] Use for Professor McGonagall's dialogue and reactions.
[UMBRIDGE] Use for Dolores Umbridge's dialogue and reactions.
[VOLDEMORT] Use for Voldemort's dialogue and reactions.
[NICK] Use for Nearly Headless Nick's dialogue and reactions.
[FRED] Use for Fred Weasley's dialogue and reactions.
[GEORGE] Use for George Weasley's dialogue and reactions.
[PERCY] Use for Percy Weasley's dialogue and reactions.
[QUIRRELL] Use for Professor Quirrell's dialogue and reactions.
[FLITWICK] Use for Professor Flitwick's dialogue and reactions.
[SPROUT] Use for Professor Sprout's dialogue and reactions.
[HOOCH] Use for Madam Hooch's dialogue and reactions.
[FILCH] Use for Argus Filch's dialogue and reactions.
[POMFREY] Use for Madam Pomfrey's dialogue and reactions.
[PEEVES] Use for Peeves the Poltergeist's dialogue and reactions.
[CEDRIC] Use for Cedric Diggory's dialogue and reactions.
[OLIVER] Use for Oliver Wood's dialogue and reactions.
[NEVILLE] Use for Neville Longbottom's dialogue and reactions.
[LUNA] Use for Luna Lovegood's dialogue and reactions.
[GINNY] Use for Ginny Weasley's dialogue and reactions.
[DEAN] Use for Dean Thomas's dialogue and reactions.
[SEAMUS] Use for Seamus Finnigan's dialogue and reactions.
[LAVENDER] Use for Lavender Brown's dialogue and reactions.
[PANSY] Use for Pansy Parkinson's dialogue and reactions.
[CRABBE] Use for Vincent Crabbe's dialogue and reactions.
[GOYLE] Use for Gregory Goyle's dialogue and reactions.
[BLAISE] Use for Blaise Zabini's dialogue and reactions.
[CHARACTER:Name] Use this for any other character not listed above.

Rules:
- TAGS MUST ALWAYS BE AT THE VERY START OF A NEW LINE. Never mid-sentence.
- WRONG: "Ron, yapma öyle," [HARRY] diyerek arkadaşının omzuna vurdu
- CORRECT:
[NARRATOR] Ron'a dönerek arkadaşının omzuna hafifçe vurdu.
[HARRY] "Ron, yapma öyle. Önemseme onu."
- Every paragraph must start with a tag on its own or with content immediately after
- Never write a tag inside a sentence or after dialogue
- Never mix narrator and character in the same paragraph
- Always put dialogue AND the character's physical actions inside that character's own tag block
- Never skip the tag even for short reactions
- If a character speaks AND does an action, put both in the same tag block
- MANDATORY: At the very end of every response, on a new line, include the current in-game time in this exact format: [TIME: Pazartesi 09:30 H1]
- Format: [TIME: {GünAdı} {SS:DD} H{HaftaNo}]
- Examples: [TIME: Pazartesi 09:30 H1] or [TIME: Salı 14:00 H2] or [TIME: Çarşamba 22:00 H3]
- Never skip this. It must appear at the end of every single response.
- Day names in Turkish: Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar
"""
    system_content += proactive_instruction

    out = [{"role": "system", "content": system_content}]
    out.extend(messages or [])
    return out
