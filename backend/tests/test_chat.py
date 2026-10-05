from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_chat_mock():
    payload = {
        "session_id": "test_123",
        "message": "What is a process?",
        "learning_mode": "beginner"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test_123"
    assert data["topic"] == "Processes"
    assert "Mock beginner response" in data["answer"]
    assert data["follow_up_question"] is not None
    assert data["suggestion"] is not None
