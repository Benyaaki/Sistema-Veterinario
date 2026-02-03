from typing import Optional
from app.models.activity_log import ActivityLog
from app.models.user import User
from beanie import PydanticObjectId
from datetime import datetime

async def log_activity(
    user: User,
    action_type: str,
    description: str,
    branch_id: Optional[PydanticObjectId] = None,
    branch_name: Optional[str] = None,
    reference_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """
    Helper function to create activity log entries.
    Should be used by other services/routes.
    """
    log = ActivityLog(
        user_id=user.id,
        user_name=user.name,
        action_type=action_type,
        description=description,
        branch_id=branch_id,
        branch_name=branch_name,
        reference_id=reference_id,
        metadata=metadata,
        created_at=datetime.utcnow()
    )
    await log.insert()
    return log
