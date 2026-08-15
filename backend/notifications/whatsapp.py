import os
from typing import Optional

TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM')  # e.g. 'whatsapp:+1415xxxxxxx'


def send_whatsapp_message(to_number: str, message: str) -> bool:
    """Send WhatsApp message via Twilio if configured. Returns True if sent or simulated.
    Falls back to logging to DB/file if Twilio not configured.
    to_number should be in E.164 format with whatsapp: prefix optionally.
    """
    if not to_number:
        return False

    # normalize
    if not to_number.startswith('whatsapp:'):
        to = to_number
        if not to.startswith('+'):
            # assume provided plain number, add + (risky) — prefer full E.164 in env
            to = f'+{to}'
        to = f'whatsapp:{to}'
    else:
        to = to_number

    if TWILIO_SID and TWILIO_TOKEN and TWILIO_WHATSAPP_FROM:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_SID, TWILIO_TOKEN)
            msg = client.messages.create(body=message, from_=TWILIO_WHATSAPP_FROM, to=to)
            return True
        except Exception:
            # fallthrough to simulated
            pass

    # Fallback: write to local log file for manual sending/inspection
    try:
        with open('whatsapp_outbox.log', 'a', encoding='utf-8') as fh:
            fh.write(f"TO: {to}\nMESSAGE:\n{message}\n---\n")
        return True
    except Exception:
        return False
