import pytest

from core.config import settings


@pytest.fixture(autouse=True)
def force_mock_llm(monkeypatch):
    """Every test runs in mock mode, whatever is in the developer's .env.

    Without this, a .env with LLM_MODE=gemini would make the test suite call the
    real API. Tests that need the real code path set LLM_MODE themselves and
    plug in a fake client instead.
    """
    monkeypatch.setattr(settings, "LLM_MODE", "mock")
