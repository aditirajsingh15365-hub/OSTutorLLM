import os
import tempfile
from pathlib import Path

# Chroma's ONNX helper ignores XDG_CACHE_HOME and defaults to Path.home(). Point
# its documented class cache path at a writable temporary test location instead.
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

ONNXMiniLM_L6_V2.DOWNLOAD_PATH = Path(tempfile.gettempdir()) / "ostutorllm-chroma-cache" / "all-MiniLM-L6-v2"

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
