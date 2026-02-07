from beanie import Document, PydanticObjectId, Indexed
from datetime import datetime, timezone
from typing import Optional
from pydantic import Field

class UserSession(Document):
    user_id: Indexed(PydanticObjectId)
    refresh_token: Indexed(str)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_revoked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_sessions"
        # We can add a TTL index here if we want sessions to expire in Mongo
        # but we'll handle expiration via logic for now.
