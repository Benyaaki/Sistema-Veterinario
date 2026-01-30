import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email_background(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Sends an email in the background using SMTP. Supports HTML.
    """
    params = {
        "email": settings.MAIL_USERNAME,
        "password": settings.MAIL_PASSWORD,
        "server": "smtp.gmail.com",
        "port": 465
    }

    if not params["email"] or not params["password"]:
        logger.error("Email credentials not set. Cannot send email.")
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = params["email"]
        msg['To'] = to_email
        msg['Subject'] = subject

        # Attach plain text version
        part1 = MIMEText(body, 'plain')
        msg.attach(part1)

        # Attach HTML version if provided
        if html_body:
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)

        server = smtplib.SMTP_SSL(params["server"], params["port"])
        # server.starttls() # Not needed for SSL
        server.login(params["email"], params["password"])
        text = msg.as_string()
        server.sendmail(params["email"], to_email, text)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
