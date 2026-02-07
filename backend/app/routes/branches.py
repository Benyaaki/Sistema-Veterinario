from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.branch import Branch
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[Branch])
async def get_branches(user: User = Depends(get_current_user)):
    return await Branch.find_all().to_list()

@router.post("/", response_model=Branch)
async def create_branch(branch: Branch, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    await branch.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="BRANCH_ADD",
        description=f"Sucursal creada: {branch.name}",
        reference_id=str(branch.id)
    )
    return branch

@router.put("/{id}", response_model=Branch)
async def update_branch(id: str, data: Branch, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    branch = await Branch.get(id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await branch.set(data.model_dump(exclude={"id"}))
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="BRANCH_UPDATE",
        description=f"Sucursal actualizada: {branch.name}",
        reference_id=str(branch.id)
    )
    return branch

@router.delete("/{id}")
async def delete_branch(id: str, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    branch = await Branch.get(id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    name = branch.name
    await branch.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="BRANCH_DELETE",
        description=f"Sucursal eliminada: {name}",
        reference_id=id
    )
    return {"message": "Branch deleted"}
