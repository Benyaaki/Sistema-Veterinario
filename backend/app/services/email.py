import os
import logging
import resend

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email_sync(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Sends an email using Resend API.
    """
    api_key = settings.RESEND_API_KEY
    email_from = settings.MAIL_FROM or "PattyVet <onboarding@resend.dev>" # Fallback domain for testing
    
    if not api_key:
        logger.error("RESEND_API_KEY is not set. Cannot send email.")
        print("DEBUG: Missing RESEND_API_KEY")
        return

    print(f"DEBUG: Attempting to send email via Resend to: {to_email}")
    
    resend.api_key = api_key

    params = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    
    if html_body:
        params["html"] = html_body

    try:
        r = resend.Emails.send(params)
        print(f"DEBUG: Resend API Response: {r}")
        logger.info(f"Email sent successfully via Resend to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")
        print(f"DEBUG: FAILED to send email via Resend. Error: {e}")
        import traceback
        traceback.print_exc()
