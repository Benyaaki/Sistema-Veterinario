import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email_sync(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Sends an email using Brevo (Sendinblue) API.
    """
    api_key = settings.BREVO_API_KEY
    if not api_key:
        logger.error("BREVO_API_KEY is not set. Cannot send email.")
        print("DEBUG: Missing BREVO_API_KEY")
        return

    # Configure API key authorization: api-key
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = api_key

    # Create an instance of the API class
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    
    # Define sender (must be verified in Brevo provided user uses that domain)
    # Using the MAIL_FROM setting or a fallback. 
    # Note: Brevo requires the sender email to be verified.
    sender = {"name": "PattyVet", "email": settings.MAIL_FROM or settings.MAIL_USERNAME or "no-reply@pattyvet.cl"}
    to = [{"email": to_email}]
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=to,
        sender=sender,
        subject=subject,
        html_content=html_body if html_body else body,
        text_content=body
    )

    print(f"DEBUG: Attempting to send email via Brevo to: {to_email}")

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"DEBUG: Brevo API Response: {api_response}")
        logger.info(f"Email sent successfully via Brevo to {to_email}")
    except ApiException as e:
        logger.error(f"Failed to send email via Brevo: {e}")
        print(f"DEBUG: FAILED to send email via Brevo. Error: {e}")
        import traceback
        traceback.print_exc()
