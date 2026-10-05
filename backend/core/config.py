from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    LLM_MODE: str = "mock"
    GEMINI_API_KEY: str = ""
    # Run `python -m scripts.list_models` to see which model IDs your key can use.
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # Comma-separated list of frontend origins allowed to call this API.
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    # Optional regex for origins that can't be listed one by one, e.g. Vercel preview
    # deployments: https://ostutorllm-.*\.vercel\.app
    # Leave empty to allow only the origins in CORS_ORIGINS. Don't make it broader
    # than your own project (a pattern like https://.*\.vercel\.app allows every
    # site hosted on Vercel).
    CORS_ORIGIN_REGEX: str = ""

    # Only the most recent N messages of the conversation are sent to the LLM.
    MAX_HISTORY_MESSAGES: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
