import os
from datetime import timedelta
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", os.getenv("SECRET_KEY", "dev-insecure-key-change-me"))
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = [h for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "users",
    "finance",
    "notifications",
    "reports",
]

try:
    import whitenoise
    HAS_WHITENOISE = True
except ImportError:
    HAS_WHITENOISE = False

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
]
if HAS_WHITENOISE:
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")

MIDDLEWARE.extend([
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
])

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# Database Configuration (Supabase PostgreSQL / Cloud Postgres or Local SQLite fallback)
database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
if database_url:
    import urllib.parse
    url = urllib.parse.urlparse(database_url)
    query_params = urllib.parse.parse_qs(url.query)

    # Determine SSL requirement (Supabase, Neon, and AWS RDS require SSL)
    is_remote_postgres = any(
        hint in (url.hostname or "")
        for hint in ["supabase.co", "pooler.supabase.com", "neon.tech", "render.com", "amazonaws.com"]
    )
    sslmode = query_params.get("sslmode", [os.getenv("DB_SSLMODE", "require" if is_remote_postgres else "")])[0]

    db_options = {}
    if sslmode:
        db_options["sslmode"] = sslmode

    # Use 0 conn_max_age for transaction poolers (port 6543) to avoid holding pooler connections
    conn_max_age = int(os.getenv("CONN_MAX_AGE", "0" if url.port == 6543 else "600"))

    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": url.path.lstrip("/") or "postgres",
        "USER": urllib.parse.unquote(url.username or ""),
        "PASSWORD": urllib.parse.unquote(url.password or ""),
        "HOST": url.hostname or "localhost",
        "PORT": url.port or 5432,
        "CONN_MAX_AGE": conn_max_age,
        "OPTIONS": db_options,
    }}
elif os.getenv("DB_NAME"):
    db_options = {}
    if os.getenv("DB_SSLMODE"):
        db_options["sslmode"] = os.getenv("DB_SSLMODE")
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER", ""),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "OPTIONS": db_options,
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "users.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if HAS_WHITENOISE:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "False").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

CORS_ALLOWED_ORIGINS = sorted(set(
    origin.strip()
    for origin in (
        os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        + [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://budget-buddy-kappa-ten.vercel.app",
        ]
    )
    if origin.strip()
))
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

REST_FRAMEWORK.update({
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {
        "auth_register": "10/min",
        "auth_login": "10/min",
        "auth_oauth": "10/min",
    },
})

# Email Configuration (SMTP via Gmail or SendGrid, or Console fallback)
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend" if os.getenv("EMAIL_HOST_USER") else "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    f"BudgetBuddy Alert <{os.getenv('EMAIL_HOST_USER', 'noreply@budgetbuddy.local')}>"
)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
