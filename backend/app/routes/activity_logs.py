from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.activity_log import ActivityLog
from app.routes.auth import get_current_user
from app.models.user import User
from beanie import PydanticObjectId
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[ActivityLog])
async def get_activity_logs(
    limit: int = Query(50, le=500),
    skip: int = 0,
    action_type: Optional[str] = None,
    branch_id: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """
    Get activity logs with filters. Only accessible by admins.
    """
    # Check permissions (check both role and roles, case-insensitive)
    allowed_roles = {"admin", "superadmin"}
    user_roles = set()
    if user.role:
        user_roles.add(user.role.lower())
    for r in user.roles:
        user_roles.add(r.lower())
    
    if not user_roles.intersection(allowed_roles):
        raise HTTPException(status_code=403, detail="Only admins can view activity logs")
    
    # Build query
    query = {}
    
    if action_type:
        query["action_type"] = action_type
    
    if branch_id:
        query["branch_id"] = PydanticObjectId(branch_id)
    
    if user_id:
        query["user_id"] = PydanticObjectId(user_id)
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    # Execute query
    logs = await ActivityLog.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    
    return logs

@router.get("/stats")
async def get_activity_stats(user: User = Depends(get_current_user)):
    """
    Get activity statistics. Only accessible by admins.
    """
    # Check permissions
    allowed_roles = {"admin", "superadmin"}
    user_roles = set()
    if user.role:
        user_roles.add(user.role.lower())
    for r in user.roles:
        user_roles.add(r.lower())

    if not user_roles.intersection(allowed_roles):
        raise HTTPException(status_code=403, detail="Only admins can view activity stats")
    
    # Get counts by action type
    pipeline = [
        {
            "$group": {
                "_id": "$action_type",
                "count": {"$sum": 1}
            }
        }
    ]
    
    results = await ActivityLog.aggregate(pipeline).to_list()
    
    return {
        "by_action_type": {item["_id"]: item["count"] for item in results}
    }

# Helper function to log activities (used by other routes)
# Helper function moved to app.services.activity_service
