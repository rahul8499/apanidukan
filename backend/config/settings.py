import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env', override=True)

RAZORPAY_KEY_ID = (os.environ.get('RAZORPAY_KEY_ID') or '').strip(" '\"")
RAZORPAY_KEY_SECRET = (os.environ.get('RAZORPAY_KEY_SECRET') or '').strip(" '\"")
RAZORPAY_WEBHOOK_SECRET = (os.environ.get('RAZORPAY_WEBHOOK_SECRET') or '').strip(" '\"")

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
DEBUG = os.environ.get('DEBUG', '1') == '1'

_allowed_hosts = os.environ.get('ALLOWED_HOSTS')
if _allowed_hosts:
    ALLOWED_HOSTS = [host.strip() for host in _allowed_hosts.split(',') if host.strip()]
    if DEBUG and '*' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('*')
else:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['localhost', '127.0.0.1']

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
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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
MEDIA_STORAGE = os.environ.get('MEDIA_STORAGE', 'local')
S3_BUCKET = os.environ.get('S3_BUCKET')
S3_ACCESS_KEY = os.environ.get('S3_ACCESS_KEY')
S3_SECRET_KEY = os.environ.get('S3_SECRET_KEY')
S3_ENDPOINT = os.environ.get('S3_ENDPOINT')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': ('rest_framework.throttling.AnonRateThrottle', 'rest_framework.throttling.UserRateThrottle', 'rest_framework.throttling.ScopedRateThrottle'),
    'DEFAULT_THROTTLE_RATES': {'anon': '100/hour', 'user': '1000/hour', 'auth': '10/hour', 'public_order': '30/hour', 'ai_assistant': '30/hour'},
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
# Enable private-network development URLs only while DEBUG is on. In production
# set CORS_ALLOWED_ORIGINS and ALLOWED_HOSTS to the deployed domain explicitly.
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGIN_REGEXES = [r'^http://(?:(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?|\[(?:2402:8100:3151:4947:[0-9a-fA-F:]+|fe80:[0-9a-fA-F:]+|fc[0-9a-fA-F]:[0-9a-fA-F:]+)\](?::\d+)?)$']
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@multistore.local')
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

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
