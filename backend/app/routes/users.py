from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Annotated
from app.models.user import User
from app.routes.auth import get_current_user
from app.core.security import pwd_context
from beanie import PydanticObjectId
from app.core.limiter import limiter

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_users(role: str = None, current_user: User = Depends(get_current_user)):
    query = User.find_all()
    if role:
        query = query.find({"$or": [{"role": role}, {"roles": role}]})
        
    users = await query.to_list()
    
    return [{
        "id": str(u.id),
        "name": u.name,
        "last_name": u.last_name,
        "email": u.email,
        "role": u.role,
        "roles": u.roles,
        "phone": u.phone,
        "branch_id": str(u.branch_id) if u.branch_id else None,
        "permissions": u.permissions,
        "is_active": u.is_active,
        "is_blocked": u.is_blocked
    } for u in users]

@router.put("/{id}/full")
async def update_user_v2(id: str, data: dict, request: Request, current_user: Annotated[User, Depends(get_current_user)]):
    # Only admin/superadmin can update other users
    is_admin = "admin" in current_user.roles or "superadmin" in current_user.roles or current_user.role == "admin"
    if str(current_user.id) != id and not is_admin:
         raise HTTPException(status_code=403, detail="No autorizado para actualizar este usuario")

    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent")
    from app.services.activity_service import log_activity

    # Log status changes
    if "is_active" in data and data["is_active"] != user.is_active:
        action = "USER_ACTIVATE" if data["is_active"] else "USER_DEACTIVATE"
        await log_activity(
            user=current_user,
            action_type=action,
            description=f"{'Activó' if data['is_active'] else 'Desactivó'} cuenta de: {user.name} ({user.email})",
            reference_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent
        )
        user.is_active = data["is_active"]

    if "is_blocked" in data and data["is_blocked"] != user.is_blocked:
        if not data["is_blocked"]: # Desbloqueo manual
            await log_activity(
                user=current_user,
                action_type="USER_UNLOCK",
                description=f"Desbloqueó manualmente la cuenta de: {user.name} ({user.email})",
                reference_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent
            )
        else: # Bloqueo
            await log_activity(
                user=current_user,
                action_type="USER_BLOCK",
                description=f"Bloqueó la cuenta de: {user.name} ({user.email})",
                reference_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent
            )
        user.is_blocked = data["is_blocked"]

    # General edit log if any other field changed
    status_fields = ['is_active', 'is_blocked', 'password']
    changed_fields = [k for k in data.keys() if k not in status_fields]
    
    if changed_fields:
        field_map = {
            "name": "Nombre",
            "last_name": "Apellido",
            "email": "Correo",
            "phone": "Teléfono",
            "role": "Rol",
            "branch_id": "Sucursal",
            "permissions": "Permisos"
        }
        translated_fields = [field_map.get(f, f) for f in changed_fields]
        await log_activity(
            user=current_user,
            action_type="USER_EDIT",
            description=f"Editó información de empleado: {user.name} ({user.email}). Campos: {', '.join(translated_fields)}",
            reference_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent
        )

    # Update user object
    excluded_fields = status_fields + ['id', '_id']
    for key, value in data.items():
        if key == "branch_id":
            setattr(user, key, PydanticObjectId(value) if value else None)
        elif key == "password":
            if value and len(value) < 8:
                raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
            if value:
                user.password_hash = pwd_context.hash(value)
                # Log password change specifically
                await log_activity(
                    user=current_user,
                    action_type="USER_PASSWORD_CHANGE",
                    description=f"Cambió la contraseña del empleado: {user.name} ({user.email})",
                    reference_id=str(user.id),
                    ip_address=ip_address,
                    user_agent=user_agent
                )
        elif key in excluded_fields:
            continue # Handled above or internal
        else:
            if hasattr(user, key):
                setattr(user, key, value)
    
    await user.save()
    return {"message": "Usuario actualizado", "user": {"id": str(user.id), "name": user.name, "email": user.email}}

@router.delete("/{id}")
async def delete_user_v2(id: str, current_user: Annotated[User, Depends(get_current_user)]):
    # Only admin/superadmin can delete users
    is_admin = "admin" in current_user.roles or "superadmin" in current_user.roles or current_user.role == "admin"
    if not is_admin:
        raise HTTPException(status_code=403, detail="No autorizado para eliminar usuarios")

    if str(current_user.id) == id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    try:
        user = await User.get(id)
        if not user:
             raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user_name = f"{user.name} {user.last_name or ''}"
        user_email = user.email
        
        await user.delete()
        
        # Log Activity
        from app.services.activity_service import log_activity
        await log_activity(
            user=current_user,
            action_type="USER_DELETE",
            description=f"Usuario eliminado: {user_name} ({user_email})",
            reference_id=id
        )
        
        return {"message": "Usuario eliminado correctamente"}
    except Exception as e:
        print(f"ERROR deleting user {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar usuario: {str(e)}")
