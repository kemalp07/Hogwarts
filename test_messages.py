#!/usr/bin/env python
import httpx
import json

messages = [
    {"message": "Merhaba", "character_id": "hermione"},
    {"message": "1+1 kaç?", "character_id": "hermione"},
    {"message": "Sana kimsin?", "character_id": "hermione"},
]

for msg in messages:
    print(f"\n>>> Testing: {msg['message']}")
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post("http://localhost:8001/api/chat", json=msg)
            # Parse SSE response
            for line in resp.text.split('\n'):
                if line.startswith('data: '):
                    data_str = line[6:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            if data.get('type') == 'chunk':
                                text = data.get('text', '')
                                print(f"  Response: {text[:150]}")
                                break
                        except:
                            pass
    except Exception as e:
        print(f"  Error: {e}")
