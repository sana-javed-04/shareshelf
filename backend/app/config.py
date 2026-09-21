# from functools import lru_cache

# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
#     """Environment-driven configuration for the ShareShelf API."""

#     database_url: str = "postgresql+psycopg2://shareshelf:shareshelf@localhost:5432/shareshelf"
#     secret_key: str = "change-me-in-production"
#     algorithm: str = "HS256"
#     access_token_expire_minutes: int = 60 * 24 * 7
#     upload_dir: str = "uploads"
#     cors_origins: str = "http://localhost:8080,http://localhost:5173"

#     class Config:
#         env_file = ".env"

#     @property
#     def cors_origin_list(self) -> list[str]:
#         return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# @lru_cache
# def get_settings() -> Settings:
#     return Settings()



from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Environment-driven configuration for the ShareShelf API."""
    # Neon ya local Postgres URL auto-detect
    database_url: str = "postgresql+psycopg://shareshelf:shareshelf@localhost:5432/shareshelf"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:8080,http://localhost:5173,http://localhost:3000"
    
    # Cloudinary ($0 free cloud storage for item pictures)
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()