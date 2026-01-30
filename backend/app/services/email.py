import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email_sync(to_email: str, subject: str, body: str, html_body: str = None):
    print(f"DEBUG: Background Email Task Started. To: {to_email}")
    
    if not user or not password:
        logger.error("Email credentials not set (MAIL_USERNAME/MAIL_PASSWORD). Cannot send email.")
        print("DEBUG: Missing credentials")
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

        print(f"DEBUG: Connecting to {server_host}:{port} (SSL={settings.MAIL_SSL_TLS})...")
        
        # SMTP Connection Logic with Timeout
        timeout = 15 # seconds
        if settings.MAIL_SSL_TLS:
            # Port 465 (usually)
            print("DEBUG: connecting using SMTP_SSL")
            server = smtplib.SMTP_SSL(server_host, port, timeout=timeout)
        else:
            # Port 587 (usually) with STARTTLS
            print("DEBUG: connecting using SMTP")
            server = smtplib.SMTP(server_host, port, timeout=timeout)
            if settings.MAIL_STARTTLS:
                print("DEBUG: starting TLS")
                server.starttls()

        print("DEBUG: Logging in...")
        server.login(user, password)
        
        print(f"DEBUG: Sending email to {email_to}...")
        text = msg.as_string()
        server.sendmail(user, email_to, text)
        
        print("DEBUG: Quitting server...")
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        print(f"DEBUG: SUCCESS - Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        print(f"DEBUG: FAILED to send email. Error: {e}")
        import traceback
        traceback.print_exc()
