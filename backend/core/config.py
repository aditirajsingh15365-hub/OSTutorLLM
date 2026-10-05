from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LLM_MODE: str = "mock"
    GEMINI_API_KEY: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
