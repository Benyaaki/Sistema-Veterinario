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
    return branch

@router.put("/{id}", response_model=Branch)
async def update_branch(id: str, data: Branch, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    branch = await Branch.get(id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await branch.set(data.model_dump(exclude={"id"}))
    return branch
