from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.user import User
from app.routes.auth import get_current_user
from beanie import PydanticObjectId

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_users(role: str = None, current_user: User = Depends(get_current_user)):
    query = User.find_all()
    if role:
        # Check against 'role' field or 'roles' list depending on model
        # Model has 'role' string and 'roles' list. 
        # If filtering by 'delivery', check roles list if populated, or role field.
        # User model definition shows 'role' and 'roles'.
        # Let's filter loosely.
        query = query.find({"$or": [{"role": role}, {"roles": role}]})
        
    users = await query.to_list()
    
    return [{
        "id": str(u.id),
        "name": u.name,
        "last_name": u.last_name,
        "email": u.email,
        "role": u.role,
        "roles": u.roles
    } for u in users]
