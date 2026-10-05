"""List the Gemini models your API key can use.

Run from the backend/ folder:
    python -m scripts.list_models

Put the model ID you want (without the "models/" prefix) in GEMINI_MODEL in .env.
"""
from google import genai

from core.config import settings


def main():
    if not settings.GEMINI_API_KEY:
        raise SystemExit("GEMINI_API_KEY is not set. Copy .env.example to .env and fill it in.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for model in client.models.list():
        actions = getattr(model, "supported_actions", None)
        if not actions or "generateContent" in actions:
            print(model.name)


if __name__ == "__main__":
    main()
