import asyncio
import sys
sys.path.insert(0, '.')

from backend.services.world_simulation import _call_vertex, _parse_json

async def test():
    prompt = """Sen Hogwarts'ın gizli günlük kayıt büyücüsüsün. 1991-92 yılı, 1. hafta, Pazartesi.

Bugün Hogwarts'ta yaşanan 2-3 olayı hayal et ve ev puanlarına yansıt.

Kurallar:
- 4 evin TÜMÜNE değin — gryffindor, hufflepuff, ravenclaw, slytherin hepsine
- SADECE JSON döndür

Format:
[
  {"house": "slytherin", "delta": 8, "reason": "...", "source": "world_event"},
  {"house": "hufflepuff", "delta": 5, "reason": "...", "source": "world_event"},
  {"house": "ravenclaw", "delta": -3, "reason": "...", "source": "world_event"},
  {"house": "gryffindor", "delta": 4, "reason": "...", "source": "world_event"}
]"""
    
    text = await _call_vertex(prompt, max_tokens=300, temperature=0.85)
    print("Raw:", repr(text))
    parsed = _parse_json(text)
    print("Parsed:", parsed)
    print("Houses in result:", [p['house'] for p in parsed])

asyncio.run(test())
