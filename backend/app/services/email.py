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
    email_to = to_email
    user = settings.MAIL_USERNAME
    password = settings.MAIL_PASSWORD
    server_host = settings.MAIL_SERVER
    port = settings.MAIL_PORT
    
    if not user or not password:
        logger.error("Email credentials not set (MAIL_USERNAME/MAIL_PASSWORD). Cannot send email.")
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = settings.MAIL_FROM or user
        msg['To'] = email_to
        msg['Subject'] = subject

        # Attach plain text version
        part1 = MIMEText(body, 'plain')
        msg.attach(part1)

        # Attach HTML version if provided
        if html_body:
            part2 = MIMEText(html_body, 'html')
            msg.attach(part2)

        # SMTP Connection Logic
        if settings.MAIL_SSL_TLS:
            # Port 465 (usually)
            server = smtplib.SMTP_SSL(server_host, port)
        else:
            # Port 587 (usually) with STARTTLS
            server = smtplib.SMTP(server_host, port)
            if settings.MAIL_STARTTLS:
                server.starttls()

        server.login(user, password)
        text = msg.as_string()
        server.sendmail(user, email_to, text)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
