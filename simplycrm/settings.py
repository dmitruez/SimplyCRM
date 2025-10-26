"""Django settings for the SimplyCRM project."""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-simplycrm")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS: list[str] = [
    host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",") if host.strip()
] or ["*"]

INSTALLED_APPS = [
    "jet",
    "jet.dashboard",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "drf_spectacular",
    "simplycrm.core",
    "simplycrm.catalog",
    "simplycrm.sales",
    "simplycrm.analytics",
    "simplycrm.automation",
    "simplycrm.integrations",
    "simplycrm.assistant",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "simplycrm.core.middleware.DDoSShieldMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "simplycrm.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "simplycrm.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DJANGO_DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("DJANGO_DB_NAME", BASE_DIR / "db.sqlite3"),
        "USER": os.getenv("DJANGO_DB_USER", ""),
        "PASSWORD": os.getenv("DJANGO_DB_PASSWORD", ""),
        "HOST": os.getenv("DJANGO_DB_HOST", ""),
        "PORT": os.getenv("DJANGO_DB_PORT", ""),
    }
}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "simplycrm.core.throttling.LoginRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DJANGO_REST_ANON_RATE", "30/min"),
        "user": os.getenv("DJANGO_REST_USER_RATE", "120/min"),
        "login": os.getenv("DJANGO_REST_LOGIN_RATE", "10/min"),
        "registration": os.getenv("DJANGO_REST_REGISTRATION_RATE", "5/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SimplyCRM API",
    "DESCRIPTION": "Comprehensive API documentation for the SimplyCRM backend.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "simplycrm-cache",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

LOGIN_SECURITY = {
    "MAX_ATTEMPTS": int(os.getenv("DJANGO_LOGIN_MAX_ATTEMPTS", "5")),
    "ATTEMPT_WINDOW_SECONDS": int(os.getenv("DJANGO_LOGIN_ATTEMPT_WINDOW", "900")),
    "LOCKOUT_SECONDS": int(os.getenv("DJANGO_LOGIN_LOCKOUT_SECONDS", "900")),
}

GOOGLE_OAUTH = {
    "CLIENT_ID": os.getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
    "ALLOWED_DOMAINS": [
        domain.strip()
        for domain in os.getenv("GOOGLE_OAUTH_ALLOWED_DOMAINS", "").split(",")
        if domain.strip()
    ],
}

DDOS_SHIELD = {
    "WINDOW_SECONDS": int(os.getenv("DDOS_SHIELD_WINDOW_SECONDS", "10")),
    "BURST_LIMIT": int(os.getenv("DDOS_SHIELD_BURST_LIMIT", "60")),
    "PENALTY_SECONDS": int(os.getenv("DDOS_SHIELD_PENALTY_SECONDS", "60")),
    "SIGNATURE_TTL_SECONDS": int(os.getenv("DDOS_SHIELD_SIGNATURE_TTL", "15")),
    "PROTECTED_PATH_PREFIXES": [
        prefix.strip()
        for prefix in os.getenv("DDOS_SHIELD_PATH_PREFIXES", "/api/").split(",")
        if prefix.strip()
    ]
    or ["/api/"],
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "0") == "1"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = os.getenv("DJANGO_CSRF_COOKIE_SAMESITE", "Lax")

_raw_csrf_trusted_origins = os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "")
if _raw_csrf_trusted_origins:
    CSRF_TRUSTED_ORIGINS = [
        origin.strip()
        for origin in _raw_csrf_trusted_origins.split(",")
        if origin.strip()
    ]
elif DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
else:
    CSRF_TRUSTED_ORIGINS: list[str] = []
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", "1") == "1"
SECURE_HSTS_PRELOAD = os.getenv("DJANGO_SECURE_HSTS_PRELOAD", "0") == "1"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

GOOGLE_OAUTH_CLIENT_IDS = [
    client.strip()
    for client in os.getenv("GOOGLE_OAUTH_CLIENT_IDS", os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")).split(",")
    if client.strip()
]

JET_DEFAULT_THEME = os.getenv("DJANGO_JET_DEFAULT_THEME", "default")
JET_THEMES = [
    {"theme": "default", "color": "#1d6ee3", "title": "SimplyCRM"},
    {"theme": "light-blue", "color": "#3592e2", "title": "Light Blue"},
]
