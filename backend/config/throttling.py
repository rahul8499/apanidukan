from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, ScopedRateThrottle, SimpleRateThrottle
from django.conf import settings
from accounts.services import normalize_phone
import logging

logger = logging.getLogger(__name__)

def get_client_ip(request):
    """Utility to reliably extract client IP through Render, Cloudflare, or Nginx reverse proxies."""
    # 1. Cloudflare IP header
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip.strip()

    # 2. Standard X-Forwarded-For header (First IP is the true client)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()

    # 3. X-Real-IP header
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip.strip()

    # 4. Standard remote address fallback
    return request.META.get('REMOTE_ADDR', '').strip()

def is_ip_whitelisted(request):
    """Check if request client IP or authenticated superuser is whitelisted to bypass rate limits."""
    client_ip = get_client_ip(request)
    whitelisted_ips = getattr(settings, 'RATE_LIMIT_WHITELIST_IPS', ['127.0.0.1', '::1'])
    
    if client_ip in whitelisted_ips:
        return True
    
    # Allow staff and superusers to bypass rate limits if authenticated
    if hasattr(request, 'user') and request.user and request.user.is_authenticated:
        if getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False):
            return True
            
    return False


class WhitelistedAnonRateThrottle(AnonRateThrottle):
    """Anon Rate Throttle that respects Render proxies and whitelisted IPs."""
    def get_ident(self, request):
        return get_client_ip(request)

    def allow_request(self, request, view):
        if is_ip_whitelisted(request):
            return True
        return super().allow_request(request, view)


class WhitelistedUserRateThrottle(UserRateThrottle):
    """User Rate Throttle that bypasses rate limits for Whitelisted IPs and Staff."""
    def allow_request(self, request, view):
        if is_ip_whitelisted(request):
            return True
        return super().allow_request(request, view)


class WhitelistedScopedRateThrottle(ScopedRateThrottle):
    """Scoped Rate Throttle that respects Render proxies and whitelisted IPs."""
    def get_ident(self, request):
        return get_client_ip(request)

    def allow_request(self, request, view):
        if is_ip_whitelisted(request):
            return True
        return super().allow_request(request, view)


class PhoneRateThrottle(SimpleRateThrottle):
    """
    Anti-SMS bombing & distributed botnet protection:
    Throttles OTP requests per mobile phone number regardless of which IP or proxy the attacker uses.
    Default rate: 3 requests per minute per phone number.
    """
    scope = 'otp_phone'

    def get_cache_key(self, request, view):
        phone = (
            request.data.get('phone_number')
            or request.data.get('customer_phone')
            or request.query_params.get('phone_number')
            or ''
        )
        clean_phone = normalize_phone(str(phone).strip())
        if not clean_phone or len(clean_phone) < 10:
            return None  # Will be validated/rejected by view
        return f"throttle_otp_phone_{clean_phone}"

