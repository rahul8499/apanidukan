import os
import random
import requests
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from .models import PhoneOTP

logger = logging.getLogger(__name__)


def get_msg91_auth_key() -> str:
    return os.getenv('MSG91_AUTH_KEY', getattr(settings, 'MSG91_AUTH_KEY', ''))


def get_msg91_widget_id() -> str:
    return os.getenv('MSG91_WIDGET_ID', getattr(settings, 'MSG91_WIDGET_ID', 'SecureOTPWidget9U4D'))


def normalize_phone(phone: str) -> str:
    """Extracts 10-digit Indian phone number or standard E.164 digits."""
    digits = ''.join(c for c in str(phone) if c.isdigit())
    if len(digits) > 10 and digits.startswith('91'):
        digits = digits[2:]
    return digits[-10:] if len(digits) >= 10 else digits


def send_msg91_otp(phone_number: str, otp_code: str) -> bool:
    """
    Sends OTP via MSG91 OTP Widget API (v5) using SecureOTPWidget9U4D.
    Does NOT pass template_id or sender_id (managed by MSG91 widget).
    """
    clean_phone = normalize_phone(phone_number)
    formatted_mobile = f"91{clean_phone}"
    
    auth_key = get_msg91_auth_key()
    widget_id = get_msg91_widget_id()

    if not auth_key:
        logger.warning(f"[MSG91] No MSG91_AUTH_KEY found in environment. Logged OTP {otp_code} for {clean_phone}")
        return True

    otp_url = "https://api.msg91.com/api/v5/otp"
    params = {
        "authkey": auth_key,
        "mobile": formatted_mobile,
        "otp": otp_code,
        "widget_id": widget_id,
    }

    try:
        res = requests.get(otp_url, params=params, timeout=8)
        logger.info(f"[MSG91 WIDGET OTP] +{formatted_mobile} (Widget: {widget_id}) -> Status: {res.status_code}, Resp: {res.text}")
        print(f"[MSG91 WIDGET OTP] Status: {res.status_code} | Widget: {widget_id} | Body: {res.text}")
        return res.status_code == 200
    except Exception as e:
        logger.error(f"[MSG91 Widget OTP Error] {e}")
        print(f"[MSG91 WIDGET OTP ERROR] {e}")
        return False


def verify_msg91_widget_token(access_token: str) -> dict:
    """
    Verifies MSG91 Widget access token if widget integration is used on frontend.
    """
    auth_key = get_msg91_auth_key()
    url = getattr(
        settings, 
        'MSG91_VERIFY_ACCESS_TOKEN_URL', 
        os.getenv('MSG91_VERIFY_ACCESS_TOKEN_URL', 'https://api.msg91.com/api/v5/widget/verifyAccessToken')
    )
    
    headers = {
        "authkey": auth_key,
        "Content-Type": "application/json"
    }
    payload = {
        "accessToken": access_token
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=8)
        if res.status_code == 200:
            data = res.json()
            return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"[MSG91] Widget verification error: {e}")
    return {"success": False}


def create_and_send_otp(phone_number: str) -> tuple[bool, str, str]:
    """
    Generates 4-digit OTP matching MSG91 widget settings, stores in DB, sends via MSG91, and returns status.
    """
    clean_phone = normalize_phone(phone_number)
    if not clean_phone or len(clean_phone) < 10:
        return False, "", "Please enter a valid 10-digit mobile number."

    # Rate limit: prevent requesting another OTP for the same number within 45 seconds
    recent_otp = PhoneOTP.objects.filter(
        phone_number=clean_phone,
        created_at__gte=timezone.now() - timedelta(seconds=45)
    ).first()
    if recent_otp:
        return False, "", "Please wait 45 seconds before requesting another OTP."

    # Daily Limit Check: Max 5 OTP requests per mobile number per 24 hours
    daily_count = PhoneOTP.objects.filter(
        phone_number=clean_phone,
        created_at__gte=timezone.now() - timedelta(hours=24)
    ).count()
    if daily_count >= 5:
        return False, "", "Daily OTP limit reached for this number (Max 5 per 24 hours). Please try again later."

    # Generate 4-digit OTP matching MSG91 SecureOTPWidget9U4D widget settings
    otp_code = f"{random.randint(1000, 9999)}"
    expires_at = timezone.now() + timedelta(minutes=15)

    # Invalidate previous unverified OTPs for this number
    PhoneOTP.objects.filter(phone_number=clean_phone, is_verified=False).delete()

    # Create new OTP record
    PhoneOTP.objects.create(
        phone_number=clean_phone,
        otp_code=otp_code,
        expires_at=expires_at,
        is_verified=False
    )

    print(f"\n=======================================================")
    print(f"[OTP SERVICE - SecureOTPWidget9U4D] Sent OTP [{otp_code}] to Phone: +91 {clean_phone}")
    print(f"=======================================================\n")

    # Send SMS/WhatsApp via MSG91 Widget API
    sent = send_msg91_otp(clean_phone, otp_code)
    if not sent:
        PhoneOTP.objects.filter(phone_number=clean_phone, is_verified=False).delete()
        return False, "", "MSG91 could not send the OTP. Check the MSG91 Widget logs and server configuration."

    return True, "", f"OTP sent to +91 {clean_phone}."


def verify_otp(phone_number: str, otp_code: str) -> tuple[bool, str]:
    """
    Validates provided OTP against active DB record. Allows 1234 or 123456 as universal test OTP in dev mode.
    """
    clean_phone = normalize_phone(phone_number)
    otp_str = str(otp_code).strip()

    if not clean_phone:
        return False, "Invalid phone number."

    # Universal test OTP fallback for smooth QA
    if settings.DEBUG and otp_str in ['1234', '123456']:
        PhoneOTP.objects.filter(phone_number=clean_phone, is_verified=False).update(is_verified=True)
        return True, "OTP verified successfully."

    otp_record = PhoneOTP.objects.filter(
        phone_number=clean_phone,
        otp_code=otp_str,
        is_verified=False,
        expires_at__gte=timezone.now()
    ).order_by('-created_at').first()

    if not otp_record:
        return False, "Invalid or expired OTP code."

    otp_record.is_verified = True
    otp_record.save()
    return True, "OTP verified successfully."
