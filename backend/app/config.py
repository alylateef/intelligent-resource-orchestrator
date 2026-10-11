from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    database_url: str = "postgresql+asyncpg://gigradar:gigradar@localhost:5432/gigradar"
    redis_url: str = "redis://localhost:6379/0"
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    cors_origins: str = "http://localhost:8080"
    scan_interval_minutes: int = 30
    max_jobs_per_run: int = 60
    min_similarity: float = 0.35
    auto_draft_score: int = 85


settings = Settings()
