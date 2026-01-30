from fastapi import APIRouter
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

router = APIRouter()

class EmailTest(BaseModel):
    to_email: str

@router.post("/email")
async def test_email(data: EmailTest):
    user = settings.MAIL_USERNAME
    password = settings.MAIL_PASSWORD
    server_host = settings.MAIL_SERVER
    port = settings.MAIL_PORT
    
    try:
        if not user or not password:
            return {"status": "error", "message": "Faltan credenciales MAIL_USERNAME o MAIL_PASSWORD"}

        msg = MIMEMultipart('alternative')
        msg['From'] = settings.MAIL_FROM or user
        msg['To'] = data.to_email
        msg['Subject'] = "Prueba de Correo - PattyVet Debug"
        
        body = f"Prueba desde {server_host}:{port} (SSL={settings.MAIL_SSL_TLS})."
        part1 = MIMEText(body, 'plain')
        msg.attach(part1)

        # SMTP Connection Logic
        if settings.MAIL_SSL_TLS:
            server = smtplib.SMTP_SSL(server_host, port)
        else:
            server = smtplib.SMTP(server_host, port)
            if settings.MAIL_STARTTLS:
                server.starttls()

        server.set_debuglevel(1)
        server.login(user, password)
        text = msg.as_string()
        server.sendmail(user, data.to_email, text)
        server.quit()
        
        return {"status": "success", "message": f"Correo enviado a {data.to_email}"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
