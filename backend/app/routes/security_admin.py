from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Annotated, Optional
from app.models.user import User
from app.models.session import UserSession
from app.routes.auth import get_current_user
from beanie import PydanticObjectId
from datetime import datetime, timezone

router = APIRouter()

@router.get("/blocked-accounts")
async def get_blocked_accounts(current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    blocked_users = await User.find(User.is_blocked == True).to_list()
    
    result = []
    for u in blocked_users:
        # Get IPs from sessions
        sessions = await UserSession.find(UserSession.user_id == u.id).to_list()
        ips = list(set([s.ip_address for s in sessions if s.ip_address]))
        
        result.append({
            "id": str(u.id),
            "name": f"{u.name} {u.last_name or ''}",
            "email": u.email,
            "blocked_at": u.blocked_at,
            "failed_attempts": u.failed_attempts,
            "ips": ips
        })
    return result

@router.post("/unlock/{user_id}")
async def unlock_account(user_id: str, current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.is_blocked = False
    user.failed_attempts = 0
    user.blocked_at = None
    user.show_unlock_notice = True
    await user.save()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=current_user,
        action_type="USER_UNLOCK",
        description=f"Cuenta desbloqueada manualmente: {user.email}",
        reference_id=user_id
    )
    
    return {"message": "Cuenta desbloqueada correctamente"}

@router.get("/active-sessions")
async def get_active_sessions(current_user: Annotated[User, Depends(get_current_user)], request: Request):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    sessions = await UserSession.find(
        UserSession.is_revoked == False,
        UserSession.last_activity >= since
    ).sort("-last_activity").to_list()
    current_sid = getattr(request.state, "sid", None)
    
    result = []
    for s in sessions:
        user = await User.get(s.user_id)
        result.append({
            "id": str(s.id),
            "user_email": user.email if user else "Desconocido",
            "user_name": user.name if user else "Sistema",
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "last_activity": s.last_activity,
            "created_at": s.created_at,
            "is_current": str(s.id) == str(current_sid)
        })
    return result

@router.post("/revoke-session/{session_id}")
async def revoke_session(session_id: str, current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    session = await UserSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    session.is_revoked = True
    await session.save()
    
    return {"message": "Sesión revocada correctamente"}

@router.get("/security-alerts")
async def get_security_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    from app.models.activity_log import ActivityLog
    
    # Fetch security events (Login fails, lockouts, etc.)
    security_event_types = [
        "SECURITY_LOGIN_FAIL", 
        "SECURITY_LOCKOUT", 
        "SECURITY_BLOCKED_ACCESS", 
        "SECURITY_INACTIVE_ACCESS"
    ]
    
    query = {"action_type": {"$in": security_event_types}}
    
    if start_date and end_date:
        from datetime import datetime
        try:
            # Parse ISO dates
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query["created_at"] = {"$gte": start, "$lte": end}
        except ValueError:
            pass # Ignore invalid format

    alerts = await ActivityLog.find(query).sort("-created_at").limit(100).to_list()
    
    result = []
    for a in alerts:
        result.append({
            "id": str(a.id),
            "type": a.action_type,
            "description": a.description,
            "user_name": a.user_name,
            "ip_address": a.ip_address,
            "user_agent": a.user_agent,
            "created_at": a.created_at
        })
    return result

@router.delete("/clear-alerts")
async def clear_security_alerts(current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    from app.models.activity_log import ActivityLog
    
    security_event_types = [
        "SECURITY_LOGIN_FAIL", 
        "SECURITY_LOCKOUT", 
        "SECURITY_BLOCKED_ACCESS", 
        "SECURITY_INACTIVE_ACCESS"
    ]
    
    # Delete all security-related logs
    await ActivityLog.find({"action_type": {"$in": security_event_types}}).delete()
    
    return {"message": "Historial de alertas limpiado correctamente"}
