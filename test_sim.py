import asyncio
import sys
sys.path.insert(0, '.')

from backend.services.world_simulation import _call_vertex, _parse_json, _apply_changes, _get_points

async def test():
    session = '280403d3-a4dc-4daf-9dbd-ff93797ed640'  # gercek session
    
    print("Before:", _get_points(session))
    
    changes = [
        {"house": "hufflepuff", "delta": 10, "reason": "test hufflepuff", "source": "world_event"},
        {"house": "slytherin", "delta": 8, "reason": "test slytherin", "source": "world_event"},
        {"house": "ravenclaw", "delta": 6, "reason": "test ravenclaw", "source": "world_event"},
    ]
    
    print("Applying changes:", changes)
    _apply_changes(session, changes)
    
    print("After:", _get_points(session))

asyncio.run(test())
