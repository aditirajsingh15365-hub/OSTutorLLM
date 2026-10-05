from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import chat


def create_app() -> FastAPI:
    app = FastAPI(title="OSTutorLLM Backend")

    # Only the configured frontend origins may call the API. No cookies/credentials
    # are used, so credentialed CORS stays off.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    app.include_router(chat.router, prefix="/api")

    @app.get("/api/health")
    def health_check():
        return {"status": "ok", "mock_mode": settings.LLM_MODE.lower() == "mock"}

    return app


app = create_app()
