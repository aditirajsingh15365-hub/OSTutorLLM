from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

from core.config import settings
from main import app
from routers.chat import tutor_controller
from services import llm_service
from services.llm_service import TutorLLMResponse

client = TestClient(app)

PAYLOAD = {
    "session_id": "test_123",
    "message": "What is a process?",
    "learning_mode": "beginner",
}


class FakeClient:
    """Stands in for the Gemini client so tests never touch the network."""

    def __init__(self, result=None, error=None):
        self.calls = []
        self.models = self
        self._result = result
        self._error = error

    def generate_content(self, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self._error:
            raise self._error
        return self._result


@pytest.fixture
def real_mode(monkeypatch):
    """Switch to the non-mock code path and make retries instant."""
    monkeypatch.setattr(settings, "LLM_MODE", "gemini")
    monkeypatch.setattr(llm_service, "RETRY_DELAY_SECONDS", 0)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_mock():
    response = client.post("/api/chat", json=PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test_123"
    assert data["topic"] == "Processes"
    assert "Mock beginner response" in data["answer"]
    assert data["follow_up_question"] is not None
    assert data["suggestion"] is not None
    assert data["fallback_used"] is False
    assert data["model_used"] == "mock"


def test_chat_uses_history_to_keep_topic(monkeypatch):
    payload = {
        **PAYLOAD,
        "message": "yes",
        "conversation_history": [
            {"role": "user", "content": "What is a deadlock?"},
            {"role": "tutor", "content": "A deadlock is...", "follow_up_question": "Can you name a necessary condition?"},
        ],
    }
    data = client.post("/api/chat", json=payload).json()
    assert data["topic"] == "Deadlocks"


def test_tutor_text_does_not_hijack_topic():
    payload = {
        **PAYLOAD,
        "message": "yes",
        "conversation_history": [
            {"role": "user", "content": "What is a deadlock?"},
            {"role": "tutor", "content": "Processes wait forever for each other's resources."},
        ],
    }
    assert client.post("/api/chat", json=payload).json()["topic"] == "Deadlocks"


def test_history_and_follow_up_reach_the_model(monkeypatch, real_mode):
    fake = FakeClient(result=SimpleNamespace(parsed=TutorLLMResponse(answer="Good answer."), text=None))
    monkeypatch.setattr(tutor_controller.llm_service, "client", fake)

    payload = {
        **PAYLOAD,
        "message": "Mutual exclusion",
        "conversation_history": [
            {"role": "user", "content": "What is a deadlock?"},
            {"role": "tutor", "content": "A deadlock is...", "follow_up_question": "Name one necessary condition."},
        ],
    }
    response = client.post("/api/chat", json=payload)

    assert response.status_code == 200
    assert response.json()["answer"] == "Good answer."

    call = fake.calls[0]
    assert call["model"] == settings.GEMINI_MODEL
    roles = [c.role for c in call["contents"]]
    assert roles == ["user", "model", "user"]
    assert "Name one necessary condition." in call["contents"][1].parts[0].text
    assert call["contents"][2].parts[0].text == "Mutual exclusion"


def test_history_is_trimmed(monkeypatch, real_mode):
    fake = FakeClient(result=SimpleNamespace(parsed=TutorLLMResponse(answer="ok"), text=None))
    monkeypatch.setattr(tutor_controller.llm_service, "client", fake)
    monkeypatch.setattr(settings, "MAX_HISTORY_MESSAGES", 4)

    history = [{"role": "user" if i % 2 == 0 else "tutor", "content": f"m{i}"} for i in range(10)]
    client.post("/api/chat", json={**PAYLOAD, "conversation_history": history})

    # 4 kept history messages + the new user message
    assert len(fake.calls[0]["contents"]) == 5


def test_llm_failure_returns_502_without_leaking_details(monkeypatch, real_mode):
    fake = FakeClient(error=RuntimeError("secret-internal-detail"))
    monkeypatch.setattr(tutor_controller.llm_service, "client", fake)

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 502
    assert "secret-internal-detail" not in response.text
    assert len(fake.calls) == llm_service.MAX_ATTEMPTS  # retried, then gave up


def test_unparseable_model_output_returns_502(monkeypatch, real_mode):
    fake = FakeClient(result=SimpleNamespace(parsed=None, text="not json"))
    monkeypatch.setattr(tutor_controller.llm_service, "client", fake)

    assert client.post("/api/chat", json=PAYLOAD).status_code == 502


def test_retry_recovers_from_one_transient_failure(monkeypatch, real_mode):
    good = SimpleNamespace(parsed=TutorLLMResponse(answer="recovered"), text=None)

    class Flaky(FakeClient):
        def generate_content(self, model, contents, config):
            super().generate_content(model, contents, config)
            if len(self.calls) == 1:
                raise RuntimeError("temporary")
            return good

    fake = Flaky()
    monkeypatch.setattr(tutor_controller.llm_service, "client", fake)

    response = client.post("/api/chat", json=PAYLOAD)
    assert response.status_code == 200
    assert response.json()["answer"] == "recovered"


def test_missing_api_key_returns_503(monkeypatch, real_mode):
    monkeypatch.setattr(tutor_controller.llm_service, "client", None)

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 503
    assert "API key" in response.json()["detail"]


def test_cors_allows_configured_origin_only():
    allowed = settings.cors_origins_list[0]
    ok = client.options(
        "/api/chat",
        headers={"Origin": allowed, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert ok.status_code == 200
    assert ok.headers["access-control-allow-origin"] == allowed

    blocked = client.options(
        "/api/chat",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in blocked.headers


def test_cors_origin_regex_allows_matching_origins(monkeypatch):
    from main import create_app

    monkeypatch.setattr(settings, "CORS_ORIGIN_REGEX", r"https://ostutorllm-.*\.vercel\.app")
    regex_client = TestClient(create_app())

    def preflight(origin):
        return regex_client.options(
            "/api/chat",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
        )

    preview = "https://ostutorllm-git-feature-me.vercel.app"
    assert preflight(preview).headers["access-control-allow-origin"] == preview
    assert "access-control-allow-origin" not in preflight("https://other-site.vercel.app").headers


# ---------------------------------------------------------------------------
# Fallback model (primary 503 -> lite model for that one response)
# ---------------------------------------------------------------------------

PRIMARY = "primary-model"
FALLBACK = "fallback-model"


def overloaded():
    return genai_errors.ServerError(
        503, {"error": {"code": 503, "message": "The model is overloaded.", "status": "UNAVAILABLE"}}
    )


def ok(text):
    return SimpleNamespace(parsed=TutorLLMResponse(answer=text), text=None)


class RoutedClient:
    """Fake Gemini client whose behavior depends on which model is requested."""

    def __init__(self, routes):
        self.routes = routes
        self.models = self
        self.called_models = []

    def generate_content(self, model, contents, config):
        self.called_models.append(model)
        outcome = self.routes[model]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@pytest.fixture
def routed(monkeypatch, real_mode):
    monkeypatch.setattr(settings, "GEMINI_MODEL", PRIMARY)
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_MODEL", FALLBACK)

    def install(routes):
        fake = RoutedClient(routes)
        monkeypatch.setattr(tutor_controller.llm_service, "client", fake)
        return fake

    return install


def test_503_on_primary_uses_fallback_model(routed):
    fake = routed({PRIMARY: overloaded(), FALLBACK: ok("from the lite model")})

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "from the lite model"
    assert data["fallback_used"] is True
    assert data["model_used"] == FALLBACK
    assert data["primary_model"] == PRIMARY
    # The 503 is not retried on the primary model: straight to the fallback.
    assert fake.called_models == [PRIMARY, FALLBACK]


def test_fallback_applies_to_one_response_only(routed):
    fake = routed({PRIMARY: overloaded(), FALLBACK: ok("lite")})
    assert client.post("/api/chat", json=PAYLOAD).json()["answer"] == "lite"

    # Primary recovers: the next request goes back to it.
    fake.routes[PRIMARY] = ok("primary is back")
    fake.called_models.clear()

    data = client.post("/api/chat", json=PAYLOAD).json()
    assert data["answer"] == "primary is back"
    assert data["fallback_used"] is False
    assert data["model_used"] == PRIMARY
    assert fake.called_models == [PRIMARY]


def test_non_503_error_retries_primary_and_does_not_fall_back(routed):
    fake = routed({PRIMARY: RuntimeError("boom"), FALLBACK: ok("should not be used")})

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 502
    assert fake.called_models == [PRIMARY] * llm_service.MAX_ATTEMPTS


def test_both_models_unavailable_returns_502(routed):
    fake = routed({PRIMARY: overloaded(), FALLBACK: overloaded()})

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 502
    assert fake.called_models == [PRIMARY, FALLBACK]


def test_fallback_can_be_disabled(routed, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_FALLBACK_MODEL", "")
    fake = routed({PRIMARY: overloaded()})

    response = client.post("/api/chat", json=PAYLOAD)

    assert response.status_code == 502
    assert fake.called_models == [PRIMARY]
