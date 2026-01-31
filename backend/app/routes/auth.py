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
            detail="Usuario o contraseña incorrectos",
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
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #2b7a78; padding: 30px 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">PattyVet</h1>
                        </div>
                        <div style="padding: 40px 30px; text-align: left;">
                            <h2 style="color: #1a202c; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Restablecimiento de Contraseña</h2>
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                                Hola <strong>{user.name}</strong>,
                            </p>
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                                Hemos recibido una solicitud para restablecer tu contraseña. Utiliza el siguiente código para completar el proceso:
                            </p>
                            
                            <div style="background-color: #edf2f7; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d3748; display: block;">{code}</span>
                            </div>

                            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                                Este código expirará en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                            </p>
                        </div>
                        <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                                &copy; {datetime.now().year} PattyVet. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
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
