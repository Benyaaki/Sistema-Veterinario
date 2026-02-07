from typing import Optional
from app.models.activity_log import ActivityLog
from app.models.user import User
from beanie import PydanticObjectId
from datetime import datetime, timezone

async def log_activity(
    user: Optional[User] = None,
    action_type: str = "INFO",
    description: str = "",
    branch_id: Optional[PydanticObjectId] = None,
    branch_name: Optional[str] = None,
    reference_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Helper function to create activity log entries.
    Now supports IP and User-Agent tracking.
    """
    log = ActivityLog(
        user_id=user.id if user else None,
        user_name=user.name if user else "Sistema/Anonimo",
        action_type=action_type,
        description=description,
        branch_id=branch_id,
        branch_name=branch_name,
        reference_id=reference_id,
        metadata=metadata,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.now(timezone.utc)
    )
    await log.insert()
    return log
