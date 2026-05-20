"""Verify /api/chat passes merged history into build_prompt (no Vertex call)."""
import asyncio
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.main import app

captured: dict = {}


async def mock_build_prompt(**kwargs):
    captured["messages"] = kwargs["messages"]
    return [{"role": "system", "content": "system"}] + kwargs["messages"]


async def mock_stream(*_args, **_kwargs):
    yield "ok"


def test_history_reaches_build_prompt() -> None:
    history = [
        {"role": "user", "content": "Benim adim Kemal"},
        {"role": "assistant", "content": "Hos geldin Kemal"},
    ]

    with (
        patch("backend.routers.chat.build_prompt", AsyncMock(side_effect=mock_build_prompt)),
        patch("backend.routers.chat.stream_vertex_ai", mock_stream),
    ):
        client = TestClient(app)
        response = client.post(
            "/api/chat",
            json={
                "message": "Ilk mesajimda soyledigim ismim neydi?",
                "history": history,
                "user_name": "Kemal",
            },
        )

    assert response.status_code == 200
    messages = captured["messages"]
    assert len(messages) == 3
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Benim adim Kemal"
    assert messages[1]["role"] == "assistant"
    assert messages[2]["role"] == "user"
    assert "ismim neydi" in messages[2]["content"]
    print("PASS: build_prompt received", len(messages), "conversation turns")


if __name__ == "__main__":
    test_history_reaches_build_prompt()
