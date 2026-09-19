import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
def health_check_view(request):
    """
    Production-grade Health Check for Render, Kubernetes, and uptime monitors.
    - Returns HTTP 200 when healthy.
    - Returns HTTP 503 when core database connection fails (triggering Render auto-restart).
    - Checks cache/Redis connectivity.
    - Zero-overhead JSON response without auth or CSRF hurdles.
    """
    status_code = 200
    db_status = "ok"
    cache_status = "ok"
    details = {}

    # 1. Database Health Check (SELECT 1)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as e:
        status_code = 503
        db_status = "error"
        details["database_error"] = str(e)
        logger.error(f"[HealthCheck] Database connection failure: {e}")

    # 2. Cache / Redis Health Check
    try:
        test_key = "__healthz_ping__"
        cache.set(test_key, "1", timeout=5)
        if cache.get(test_key) != "1":
            cache_status = "degraded"
    except Exception as e:
        cache_status = "error"
        details["cache_error"] = str(e)
        logger.warning(f"[HealthCheck] Cache warning: {e}")

    response_data = {
        "status": "healthy" if status_code == 200 else "unhealthy",
        "database": db_status,
        "cache": cache_status,
        "timestamp": time.time(),
    }
    if details:
        response_data["details"] = details

    return JsonResponse(response_data, status=status_code)
