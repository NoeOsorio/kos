from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Anthropic
    anthropic_api_key: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Perplexity
    perplexity_api_key: str = ""

    # App
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
