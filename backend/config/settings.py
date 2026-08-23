import os
import copy
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv
import django.template.context as dtc

# Hotfix for Python 3.14 super().__copy__() compatibility bug in Django templates
def _safe_context_copy(self):
    duplicate = object.__new__(self.__class__)
    duplicate.dicts = [d.copy() if hasattr(d, 'copy') else d for d in self.dicts]
    rc = dtc.RenderContext()
    if hasattr(self, 'render_context') and hasattr(self.render_context, 'dicts'):
        rc.dicts = [d.copy() if hasattr(d, 'copy') else d for d in self.render_context.dicts]
    duplicate.render_context = rc
    for attr in ('request', 'template', 'template_name', 'autoescape', 'use_tz', 'use_l10n'):
        if hasattr(self, attr):
            setattr(duplicate, attr, getattr(self, attr))
    return duplicate

dtc.BaseContext.__copy__ = _safe_context_copy
dtc.Context.__copy__ = _safe_context_copy
dtc.RequestContext.__copy__ = _safe_context_copy

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env', override=True)

RAZORPAY_KEY_ID = (os.environ.get('RAZORPAY_KEY_ID') or '').strip(" '\"")
RAZORPAY_KEY_SECRET = (os.environ.get('RAZORPAY_KEY_SECRET') or '').strip(" '\"")
RAZORPAY_WEBHOOK_SECRET = (os.environ.get('RAZORPAY_WEBHOOK_SECRET') or '').strip(" '\"")

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
DEBUG = os.environ.get('DEBUG', '0') == '1'

_allowed_hosts = os.environ.get('ALLOWED_HOSTS')
if _allowed_hosts:
    ALLOWED_HOSTS = [host.strip() for host in _allowed_hosts.split(',') if host.strip()]
    if DEBUG and '*' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('*')
else:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['localhost', '127.0.0.1']

if not DEBUG:
    if SECRET_KEY == 'dev-secret' or len(SECRET_KEY) < 32:
        raise ImproperlyConfigured('Set a strong SECRET_KEY before running with DEBUG=False.')
    if not _allowed_hosts:
        raise ImproperlyConfigured('Set ALLOWED_HOSTS before running with DEBUG=False.')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', '1') == '1'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'accounts',
    'stores',
    'categories',
    'products',
    'downloads',
    'cart',
    'orders',
    'payments',
    'chat',
    'ai_assistant',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'config.middleware.HideApiFromBrowserMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = os.environ.get('MEDIA_URL', '/media/')
MEDIA_ROOT = os.path.join(BASE_DIR, os.environ.get('MEDIA_ROOT', 'media'))

# Storage config
S3_BUCKET = (os.environ.get('AWS_STORAGE_BUCKET_NAME') or os.environ.get('S3_BUCKET') or '').strip(" '\"")
S3_ACCESS_KEY = (os.environ.get('AWS_ACCESS_KEY_ID') or os.environ.get('S3_ACCESS_KEY') or '').strip(" '\"")
S3_SECRET_KEY = (os.environ.get('AWS_SECRET_ACCESS_KEY') or os.environ.get('S3_SECRET_KEY') or '').strip(" '\"")
S3_REGION = (os.environ.get('AWS_S3_REGION_NAME') or os.environ.get('S3_REGION', 'eu-north-1') or '').strip(" '\"")
S3_ENDPOINT = (os.environ.get('S3_ENDPOINT') or '').strip(" '\"") or None
S3_PRESIGNED_EXPIRY = int(os.environ.get('AWS_S3_PRESIGNED_URL_EXPIRY', os.environ.get('S3_PRESIGNED_EXPIRY', '3600')))

if S3_BUCKET and S3_ACCESS_KEY and S3_SECRET_KEY:
    MEDIA_STORAGE = 's3'
else:
    MEDIA_STORAGE = os.environ.get('MEDIA_STORAGE', 'local')

if MEDIA_STORAGE == 's3':
    DEFAULT_FILE_STORAGE = 'storage.S3Storage'



DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

# Caching Configuration (Supports Redis Cluster in Production)
REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'multi-store-local-cache',
        }
    }

# IP Whitelisting Configuration for Rate Limiting (Allows trusted IPs & Razorpay servers to bypass throttling)
_whitelist_env = os.environ.get('RATE_LIMIT_WHITELIST_IPS', '127.0.0.1, ::1, localhost')
RATE_LIMIT_WHITELIST_IPS = [ip.strip() for ip in _whitelist_env.split(',') if ip.strip()]

# Django REST Framework Rate Limiting & Security Throttling (With IP Whitelisting)
REST_FRAMEWORK = {
    # Do not expose DRF's browsable API, forms or permission pages in a
    # production browser. The frontend communicates with these endpoints as
    # JSON only.
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'config.throttling.WhitelistedAnonRateThrottle',
        'config.throttling.WhitelistedUserRateThrottle',
        'config.throttling.WhitelistedScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '300/hour',          # Anonymous storefront visitors (Scraping & DDoS protection)
        'user': '3000/hour',         # Authenticated sellers & customers (High concurrency)
        'auth': '10/minute',         # Login/Auth endpoints (Brute-force protection)
        'public_order': '30/hour',   # Order placement throttling
        'ai_assistant': '30/hour',   # AI assistant request quota
        'webhook': '120/minute',     # Payment Webhooks (Razorpay callback limit)
        'public_chat': '60/hour',
        'public_tracking': '60/hour',
        'download': '60/hour',
        'public_report': '5/day'
    },
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.environ.get('JWT_SECRET', SECRET_KEY),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(',') if origin.strip()] if _cors_origins else ['http://localhost:3000', 'http://localhost:5173']
_csrf_origins = set(CORS_ALLOWED_ORIGINS)
for host in ALLOWED_HOSTS:
    if host not in {'*', 'localhost', '127.0.0.1'}:
        _csrf_origins.add(f"https://{host}")
        _csrf_origins.add(f"http://{host}")
CSRF_TRUSTED_ORIGINS = list(_csrf_origins)

WHITENOISE_MANIFEST_STRICT = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@multistore.local')
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 25))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "False") == "True"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

# Local Ollama settings. Override these through environment variables in production.
OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
OLLAMA_TEXT_MODEL = os.environ.get('OLLAMA_TEXT_MODEL', 'qwen3:4b')
OLLAMA_VISION_MODEL = os.environ.get('OLLAMA_VISION_MODEL', 'qwen2.5vl:7b')
OLLAMA_TIMEOUT_SECONDS = int(os.environ.get('OLLAMA_TIMEOUT_SECONDS', '180'))
OLLAMA_TEMPERATURE = float(os.environ.get('OLLAMA_TEMPERATURE', '0.2'))
OLLAMA_MAX_TOKENS = int(os.environ.get('OLLAMA_MAX_TOKENS', '800'))
# Keep the model resident after its first request so normal chat messages do not
# pay the model-load cost each time.  Qwen3's reasoning mode is disabled for
# short store-assistant answers.
OLLAMA_KEEP_ALIVE = os.environ.get('OLLAMA_KEEP_ALIVE', '15m')
OLLAMA_DISABLE_THINKING = os.environ.get('OLLAMA_DISABLE_THINKING', 'true').lower() in {'1', 'true', 'yes'}
# Store chat only needs a compact prompt and a short answer. A smaller context
# window reduces Qwen's memory allocation and time-to-first-response.
OLLAMA_CONTEXT_WINDOW = int(os.environ.get('OLLAMA_CONTEXT_WINDOW', '2048'))
# Qwen may spend a small number of tokens preparing an answer even with
# thinking disabled.  Forty tokens can cut the reply off before its final
# customer-facing sentence is emitted.
OLLAMA_TEXT_RESPONSE_TOKENS = int(os.environ.get('OLLAMA_TEXT_RESPONSE_TOKENS', '120'))
AI_ASSISTANT_MAX_IMAGE_BYTES = int(os.environ.get('AI_ASSISTANT_MAX_IMAGE_BYTES', str(8 * 1024 * 1024)))
