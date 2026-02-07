from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models.user import User
from app.core.security import verify_password, create_access_token
from typing import Annotated, Optional
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from beanie import PydanticObjectId

router = APIRouter()
from app.models.session import UserSession
from app.core.security import create_refresh_token
from app.core.limiter import limiter
from datetime import datetime, timezone
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

NAME_REGEX = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"
PHONE_REGEX = r"^\+56 9 \d{4} \d{4}$"

class UserRegister(BaseModel):
    name: str = Field(..., pattern=NAME_REGEX)
    last_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    email: EmailStr
    password: str
    role: str = "assistant"
    phone: Optional[str] = Field(None, pattern=PHONE_REGEX)
    branch_id: Optional[str] = None
    permissions: Optional[list[str]] = []

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, pattern=NAME_REGEX)
    last_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    phone: Optional[str] = Field(None, pattern=PHONE_REGEX)
    branch_id: Optional[str] = None
    password: Optional[str] = None
    permissions: Optional[list[str]] = None
    is_active: Optional[bool] = None

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], request: Request = None):
    from jose import JWTError, jwt
    from app.core.config import settings
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # print("DEBUG: decoding token", token[:10])
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        sid: str = payload.get("sid")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await User.find_one(User.email == email)
    if user is None or user.is_blocked:
        raise credentials_exception

    # Session Verification
    if sid:
        if request:
            request.state.sid = sid
        session = await UserSession.get(sid)
        if not session or session.is_revoked:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión expirada o revocada",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Update last activity
        session.last_activity = datetime.now(timezone.utc)
        await session.save()

    return user

@router.post("/register")
@limiter.limit("10/hour")
async def register_user(request: Request, data: UserRegister, current_user: Annotated[User, Depends(get_current_user)]):
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    
    hashed = pwd_context.hash(data.password)
    user = User(
        name=data.name,
        last_name=data.last_name,
        email=data.email,
        password_hash=hashed,
        role=data.role,
        phone=data.phone,
        branch_id=PydanticObjectId(data.branch_id) if data.branch_id else None,
        permissions=data.permissions or []
    )
    await user.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=current_user,
        action_type="USER_ADD",
        description=f"Usuario registrado: {user.name} {user.last_name or ''} ({user.email})",
        reference_id=str(user.id)
    )
    
@router.post("/login")
@limiter.limit("20/minute")
async def login(request: Request, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    # Generic error message
    invalid_credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    ip_address = request.client.host if request.client else "desconocida"
    user_agent = request.headers.get("user-agent", "desconocido")
    from app.services.activity_service import log_activity

    try:
        print(f"DEBUG: Intento de login para {form_data.username}")
        # Case-insensitive email lookup with safe escaping
        import re
        safe_username = re.escape(form_data.username)
        user = await User.find_one({"email": {"$regex": f"^{safe_username}$", "$options": "i"}})

        # 1. Anti-Enumeration: Always use the same message
        if not user:
            # Log suspected enumeration or typo
            await log_activity(
                action_type="SECURITY_LOGIN_FAIL",
                description=f"Intento de login fallido: Email no registrado ({form_data.username})",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise invalid_credentials_exception

        # 2. Check Lockout and Account Status
        if user.is_blocked:
            # Check if it's a temporary lockout
            if user.blocked_at:
                # New refined logic:
                # 1st lockout (lockout_count=1) -> 1 min auto-unlock
                # 2nd+ lockout (lockout_count >= 2) -> Permanent (admin must unlock)
                
                if (user.lockout_count or 0) == 1:
                    from datetime import timedelta
                    # Ensure we have a timezone-aware comparison
                    u_blocked_at = user.blocked_at
                    if u_blocked_at.tzinfo is None:
                        u_blocked_at = u_blocked_at.replace(tzinfo=timezone.utc)
                    
                    unlock_time = u_blocked_at + timedelta(minutes=1)
                    now = datetime.now(timezone.utc)
                    
                    if now < unlock_time:
                        remaining_seconds = int((unlock_time - now).total_seconds())
                        minutes = remaining_seconds // 60
                        seconds = remaining_seconds % 60
                        time_msg = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
                        
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Cuenta bloqueada temporalmente. Vuelve a intentarlo en {time_msg}."
                        )
                    else:
                        # Auto-unlock
                        user.is_blocked = False
                        user.failed_attempts = 0
                        await user.save()
                else:
                    # Permanent lockout (lockout_count >= 2)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Su cuenta ha sido bloqueada por múltiples intentos fallidos. Por favor, comuníquese con el administrador para recuperar el acceso."
                    )
            else:
                # Permanent manual block
                await log_activity(
                    user=user,
                    action_type="SECURITY_BLOCKED_ACCESS",
                    description=f"Intento de acceso a cuenta bloqueada ({user.email})",
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                raise invalid_credentials_exception
        
        if not user.is_active:
            await log_activity(
                user=user,
                action_type="SECURITY_INACTIVE_ACCESS",
                description=f"Intento de acceso a cuenta desactivada ({user.email})",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta ha sido deshabilitada por un administrador."
            )

        # 3. Verify Password
        if not verify_password(form_data.password, user.password_hash):
            # Increment failed attempts
            user.failed_attempts += 1
            
            await log_activity(
                user=user,
                action_type="SECURITY_LOGIN_FAIL",
                description=f"Contraseña incorrecta para {user.email}",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"attempts": user.failed_attempts}
            )

            if user.failed_attempts >= 5:
                user.is_blocked = True
                user.blocked_at = datetime.now(timezone.utc)
                user.lockout_count += 1
                
                is_permanent = user.lockout_count >= 2
                desc = f"Cuenta bloqueada tras {user.failed_attempts} intentos fallidos (Reincidente)" if is_permanent else f"Cuenta bloqueada temporalmente por 1 min tras {user.failed_attempts} intentos fallidos"
                
                # Log Activity
                await log_activity(
                    user=user,
                    action_type="SECURITY_LOCKOUT",
                    description=desc,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            await user.save()
            raise invalid_credentials_exception

        # 4. Success - Reset attempts AND lockout_count if it was a successful login after some time?
        user.failed_attempts = 0
        user.last_login = datetime.now(timezone.utc)
        await user.save()

        # 5. Session Control (Concurrent Sessions)
        active_sessions = await UserSession.find({"user_id": user.id, "is_revoked": False}).to_list()
        
        max_sessions = 3
        if len(active_sessions) >= max_sessions:
            # Revoke oldest session
            oldest = sorted(active_sessions, key=lambda x: x.last_activity)[0]
            oldest.is_revoked = True
            await oldest.save()

        # 6. Generate Tokens
        # 7. Tracking Session
        new_session = UserSession(
            user_id=user.id,
            refresh_token="", # Temporary
            ip_address=ip_address,
            user_agent=user_agent
        )
        await new_session.insert()

        # 8. Generate Tokens with Session ID
        access_token = create_access_token(data={"sub": user.email}, sid=str(new_session.id))
        refresh_token = create_refresh_token(data={"sub": user.email}, sid=str(new_session.id))

        # 9. Update session with real refresh token
        new_session.refresh_token = refresh_token
        await new_session.save()

        # Log Successful Activity
        await log_activity(
            user=user,
            action_type="SECURITY_LOGIN_SUCCESS",
            description=f"Inicio de sesión exitoso: {user.email}",
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Capture notice flag before resetting
        should_show_notice = user.show_unlock_notice
        if should_show_notice:
            user.show_unlock_notice = False
            await user.save()

        return {
            "access_token": access_token, 
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "show_notice": should_show_notice
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )

    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "show_notice": should_show_notice
    }

@router.post("/refresh")
async def refresh_token(request: Request, refresh_token: str):
    from jose import jwt, JWTError
    from app.core.config import settings
    
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Find session and rotate
    session = await UserSession.find_one(UserSession.refresh_token == refresh_token, UserSession.is_revoked == False)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    user = await User.find_one(User.email == email)
    if not user or user.is_blocked:
        session.is_revoked = True
        await session.save()
        raise HTTPException(status_code=403, detail="Account disabled")

    # Rotate
    new_refresh = create_refresh_token(data={"sub": email}, sid=str(session.id))
    new_access = create_access_token(data={"sub": email}, sid=str(session.id))

    session.refresh_token = new_refresh
    session.last_activity = datetime.now(timezone.utc)
    await session.save()

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(current_user: Annotated[User, Depends(get_current_user)], request: Request):
    # 1. Try revoking by sid from token (most reliable)
    sid = getattr(request.state, "sid", None)
    if sid:
        session = await UserSession.get(sid)
        if session:
            session.is_revoked = True
            await session.save()
            return {"message": "Sesión cerrada por ID"}

    # 2. Fallback to refresh_token in body
    try:
        data = await request.json()
        rt = data.get("refresh_token")
        if rt:
            session = await UserSession.find_one(UserSession.refresh_token == rt)
            if session:
                session.is_revoked = True
                await session.save()
    except:
        pass
    
    return {"message": "Sesión cerrada"}

@router.get("/me")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": current_user.role,
        "roles": current_user.roles,
        "permissions": current_user.permissions,
        "phone": current_user.phone,
        "branch_id": str(current_user.branch_id) if current_user.branch_id else None,
        "signature_file_id": current_user.signature_file_id
    }

# Force reload

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
@limiter.limit("3/hour")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    user = await User.find_one(User.email == data.email)
    if not user:
        return {"message": "Si el email está registrado, recibirás un código de verificación."}

    import secrets
    from datetime import datetime, timedelta, timezone
    
    # Generate 6-digit code
    code = secrets.token_hex(3).upper() # 6 chars
    
    user.reset_token = code
    user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    await user.save()
    
    # Send Email
    try:
        from app.services.email import send_email_sync
        from app.services.templates import get_email_template

        subject = "Restablecimiento de Contraseña - CalFer"
        body = f"Hola {user.name},\n\nTu código de verificación para restablecer tu contraseña es: {code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste esto, ignora este correo."
        
        html_content = f"""
            <p>Hola <strong>{user.name}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña en <strong>CalFer</strong>.</p>
            <p>Utiliza el siguiente código para completar el proceso:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.2em; color: #2eafb0; display: block;">{code}</span>
            </div>

            <p style="color: #64748b; font-size: 14px;">Este código expirará en 15 minutos por motivos de seguridad.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura; tu cuenta seguirá protegida.</p>
        """
        
        html_body = get_email_template("Recuperar Acceso", html_content)
        
        send_email_sync(
            to_email=user.email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Error al enviar el correo")
        
    return {"message": "Código de verificación enviado"}

@router.post("/verify-reset-code")
async def verify_reset_code(data: VerifyCodeRequest):
    from datetime import datetime, timezone
    user = await User.find_one(User.email == data.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.reset_token or user.reset_token != data.code:
        raise HTTPException(status_code=400, detail="Código inválido")
        
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El código ha expirado")
        
    return {"message": "Código válido"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    from datetime import datetime, timezone
    user = await User.find_one(User.email == data.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if not user.reset_token or user.reset_token != data.code:
        raise HTTPException(status_code=400, detail="Código inválido")
        
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El código ha expirado")
    
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
    
    # Reset Password
    user.password_hash = pwd_context.hash(data.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    await user.save()
    
    return {"message": "Contraseña actualizada exitosamente"}
