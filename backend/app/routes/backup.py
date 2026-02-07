from fastapi import APIRouter, HTTPException, Depends
from typing import Annotated
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.backup_service import perform_backup, get_latest_backup_status

router = APIRouter()

@router.get("/status")
async def backup_status(current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    status = await get_latest_backup_status()
    return status or {"message": "No hay respaldos registrados"}

@router.post("/run")
async def run_backup(current_user: Annotated[User, Depends(get_current_user)]):
    if "admin" not in current_user.roles and "superadmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    status = await perform_backup()
    if not status["success"]:
        raise HTTPException(status_code=500, detail=f"Error en respaldo: {status['error']}")
    
    return {"message": "Respaldo completado exitosamente", "details": status}
