"""Quick integration test for /api/chat history support."""
import json
import httpx


def chat(message: str, history: list | None = None) -> str:
    response = httpx.post(
        "http://127.0.0.1:8001/api/chat",
        json={
            "message": message,
            "history": history or [],
            "user_name": "Kemal",
        },
        timeout=120.0,
    )
    text = ""
    for line in response.text.split("\n"):
        if not line.startswith("data: "):
            continue
        try:
            payload = json.loads(line[6:])
        except json.JSONDecodeError:
            continue
        if payload.get("type") == "chunk":
            text += payload.get("text", "")
    return text


def main() -> None:
    history: list[dict] = []

    m1 = "Benim adim Kemal, bunu aklinda tut."
    a1 = chat(m1, history)
    print("MSG1 OK, len=", len(a1))

    history = [
        {"role": "user", "content": m1},
        {"role": "assistant", "content": a1},
    ]

    m2 = "Hogwarts koridorlarinda yuruyorum."
    a2 = chat(m2, history)
    print("MSG2 OK, len=", len(a2))

    history.extend([
        {"role": "user", "content": m2},
        {"role": "assistant", "content": a2},
    ])

    m3 = "Ilk mesajimda soyledigim ismim neydi? Sadece ismi soyle."
    a3 = chat(m3, history)
    print("MSG3 RESPONSE:", a3[:400])
    print("KEMAL_IN_RESPONSE=", "kemal" in a3.lower())


if __name__ == "__main__":
    main()
