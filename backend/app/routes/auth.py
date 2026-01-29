from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models.user import User
from app.core.security import verify_password, create_access_token
from typing import Annotated
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "assistant"

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    from jose import JWTError, jwt
    from app.core.config import settings
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await User.find_one(User.email == email)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register")
async def register_user(data: UserRegister, current_user: Annotated[User, Depends(get_current_user)]):
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed = pwd_context.hash(data.password)
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hashed,
        role=data.role
    )
    await user.insert()
    return {"message": "User created", "id": str(user.id)}

@router.post("/login")
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await User.find_one(User.email == form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "signature_file_id": current_user.signature_file_id
    }

@router.get("/users", response_model=list)
async def list_users(current_user: Annotated[User, Depends(get_current_user)]):
    users = await User.find_all().to_list()
    return [{
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "role": u.role
    } for u in users]

@router.delete("/users/{id}")
async def delete_user(id: str, current_user: Annotated[User, Depends(get_current_user)]):
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await user.delete()
    return {"message": "User deleted"}
