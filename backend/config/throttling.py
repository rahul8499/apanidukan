from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, ScopedRateThrottle
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_client_ip(request):
    """Utility to extract client IP from HTTP headers or REMOTE_ADDR."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '').strip()
    return ip

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
    """Anon Rate Throttle that bypasses rate limits for Whitelisted IPs."""
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
    """Scoped Rate Throttle that bypasses rate limits for Whitelisted IPs."""
    def allow_request(self, request, view):
        if is_ip_whitelisted(request):
            return True
        return super().allow_request(request, view)
