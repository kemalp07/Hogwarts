#!/usr/bin/env python
import httpx
import json

# Same message multiple times
print("=== SAME MESSAGE, DIFFERENT TIMES ===")
for i in range(3):
    print(f"\nAttempt {i+1}: 'Merhaba'")
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post("http://localhost:8001/api/chat", json={"message": "Merhaba"})
            for line in resp.text.split('\n'):
                if line.startswith('data: '):
                    data_str = line[6:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            if data.get('type') == 'chunk':
                                text = data.get('text', '')
                                print(f"  -> {text[:120]}")
                                break
                        except:
                            pass
    except Exception as e:
        print(f"  Error: {e}")

# Different character, same message
print("\n\n=== DIFFERENT CHARACTERS, SAME MESSAGE ===")
for char in ["hermione", "snape"]:
    print(f"\nCharacter: {char}, Message: 'Merhaba'")
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post("http://localhost:8001/api/chat", json={"message": "Merhaba", "character_id": char})
            for line in resp.text.split('\n'):
                if line.startswith('data: '):
                    data_str = line[6:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            if data.get('type') == 'chunk':
                                text = data.get('text', '')
                                print(f"  -> {text[:120]}")
                                break
                        except:
                            pass
    except Exception as e:
        print(f"  Error: {e}")
