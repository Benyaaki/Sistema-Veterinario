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
    params = {
        "email": settings.MAIL_USERNAME,
        "password": settings.MAIL_PASSWORD,
        "server": "smtp.gmail.com",
        "port": 465
    }
    
    try:
        if not params["email"] or not params["password"]:
            return {"status": "error", "message": "Faltan credenciales MAIL_USERNAME o MAIL_PASSWORD"}

        msg = MIMEMultipart('alternative')
        msg['From'] = params["email"]
        msg['To'] = data.to_email
        msg['Subject'] = "Prueba de Correo - PattyVet Debug"
        
        body = "Este es un correo de prueba para verificar la configuración en Render."
        part1 = MIMEText(body, 'plain')
        msg.attach(part1)

        server = smtplib.SMTP_SSL(params["server"], params["port"])
        server.set_debuglevel(1) # Enable debug output
        # server.starttls() # Not needed for SSL
        server.login(params["email"], params["password"])
        text = msg.as_string()
        server.sendmail(params["email"], data.to_email, text)
        server.quit()
        
        return {"status": "success", "message": f"Correo enviado a {data.to_email}"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
