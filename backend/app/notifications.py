"""Optional operational notifications. Customer data stays in the private dashboard."""
from email.message import EmailMessage
import logging
import smtplib
import ssl
from .config import settings


def notify(kind: str, reference: str = ''):
    if not all([settings.smtp_host,settings.smtp_from,settings.notification_email]):
        return
    message=EmailMessage()
    message['Subject']='Eagles Unbound: new ' + kind
    message['From']=settings.smtp_from
    message['To']=settings.notification_email
    message.set_content(f'A new {kind} has been saved. Reference: {reference or "See dashboard"}.\nSign in to the private administration dashboard to review and follow up.\nA booking request is not a confirmed reservation.')
    try:
        with smtplib.SMTP(settings.smtp_host,settings.smtp_port,timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if settings.smtp_username:
                smtp.login(settings.smtp_username,settings.smtp_password)
            smtp.send_message(message)
    except Exception:
        # Do not log request bodies, credentials or visitor contact details.
        logging.getLogger(__name__).error('Operational notification failed; saved request remains available in admin')
