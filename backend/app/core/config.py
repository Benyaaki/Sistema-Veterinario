from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    UPLOAD_DIR: str
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
