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

# Password Reset Flow

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await User.find_one(User.email == data.email)
    if not user:
        # Don't reveal if user exists or not for security, but for UX maybe we want to say "Email sent if registered"
        # However, for this project context, accurate feedback might be preferred by the user owner.
        # But standard practice is to return 200 OK.
        # Let's return 404 for now as per user instruction "siempre y cuando si haya estado registrada"
        raise HTTPException(status_code=404, detail="Email no registrado")

    import secrets
    from datetime import datetime, timedelta
    
    # Generate 6-digit code
    code = secrets.token_hex(3).upper() # 6 chars
    
    user.reset_token = code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
    await user.save()
    
    # Send Email
    try:
        from app.services.email import send_email_sync
        # Running sync function in async context properly? 
        # Ideally should use run_in_executor but for low traffic it's ok-ish or just call it.
        # It's blocking but simple.
        send_email_sync(
            to_email=user.email,
            subject="Restablecimiento de Contraseña - PattyVet",
            body=f"Hola {user.name},\n\nTu código de verificación para restablecer tu contraseña es: {code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste esto, ignora este correo.",
            html_body=f"""
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563EB;">Restablecimiento de Contraseña</h2>
                    <p>Hola <strong>{user.name}</strong>,</p>
                    <p>Has solicitado restablecer tu contraseña en PattyVet.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111;">{code}</span>
                    </div>
                    <p>Este código es válido por 15 minutos.</p>
                    <p style="color: #666; font-size: 12px;">Si no solicitaste este cambio, por favor ignora este correo.</p>
                </div>
            """
        )
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Error al enviar el correo")
        
    return {"message": "Código de verificación enviado"}

@router.post("/verify-reset-code")
async def verify_reset_code(data: VerifyCodeRequest):
    from datetime import datetime
    user = await User.find_one(User.email == data.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.reset_token or user.reset_token != data.code:
        raise HTTPException(status_code=400, detail="Código inválido")
        
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El código ha expirado")
        
    return {"message": "Código válido"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    from datetime import datetime
    user = await User.find_one(User.email == data.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.reset_token or user.reset_token != data.code:
        raise HTTPException(status_code=400, detail="Código inválido")
        
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El código ha expirado")
    
    # Reset Password
    user.password_hash = pwd_context.hash(data.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    await user.save()
    
    return {"message": "Contraseña actualizada exitosamente"}
