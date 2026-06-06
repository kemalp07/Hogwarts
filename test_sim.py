import asyncio
import sys
import logging
logging.basicConfig(level=logging.INFO)
sys.path.insert(0, '.')

from backend.services.world_simulation import _call_vertex, _parse_json, _apply_changes, _get_points

async def test():
    session = 'eb1ed439-4a3f-43fe-b5f2-0e42d5c00c02'
    
    # Simulate world events manual
    prompt = """Sen Hogwarts'ın gizli günlük kayıt büyücüsüsün. 1991-92 yılı, 1. hafta, Pazartesi.

Bugün Hogwarts'ta yaşanan 2-3 olayı hayal et ve ev puanlarına yansıt.

Kurallar:
- 4 evin TÜMÜNE değin
- SADECE JSON döndür

Format (4 evin TÜMÜ dahil olmalı):
[
  {"house": "slytherin", "delta": 10, "reason": "Draco iksir dersinde başarılı oldu", "source": "world_event"},
  {"house": "hufflepuff", "delta": 5, "reason": "Hufflepuff bahçe dersinde övgü aldı", "source": "world_event"},
  {"house": "ravenclaw", "delta": -3, "reason": "Ravenclaw öğrencisi yasaklı kitap okurken yakalandı", "source": "world_event"},
  {"house": "gryffindor", "delta": -2, "reason": "Fred ve George yemek salonunda şaka yaptı", "source": "world_event"}
]"""

    print("Calling vertex...")
    text = await _call_vertex(prompt, max_tokens=300, temperature=0.85)
    print("Raw text:", repr(text[:200]))
    
    changes = _parse_json(text)
    print("Changes:", changes)
    print("Changes count:", len(changes))
    
    if changes:
        print("Before:", _get_points(session))
        _apply_changes(session, changes)
        print("After:", _get_points(session))
    else:
        print("NO CHANGES - _parse_json returned empty!")

asyncio.run(test())
