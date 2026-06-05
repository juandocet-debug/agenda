"""
Django settings for config project.
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Seguridad ─────────────────────────────────────────────────────────────────
# SECRET_KEY DEBE estar en las variables de entorno de Railway. Sin valor por defecto.
SECRET_KEY = os.environ['SECRET_KEY']

# DEBUG siempre False en producción. Activar solo en local con DEBUG=True en .env
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Solo aceptar requests de dominios conocidos (Railway + Vercel)
ALLOWED_HOSTS = [
    'agenda-production-ae37.up.railway.app',
    'agenda-pi-bice.vercel.app',
    'dist-nine-gold-65.vercel.app',
    '.vercel.app',           # cubre cualquier preview deploy de Vercel
    '127.0.0.1',
    'localhost',
]

# ── Aplicaciones ──────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary_storage',
    'cloudinary',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'modulos.Autenticacion.infraestructura',
    'modulos.Citas.infraestructura',
    'modulos.Empresas.infraestructura',
    'modulos.Pagos.infraestructura',
    'modulos.Reportes.infraestructura',
    'modulos.Servicios.infraestructura',
    'modulos.Usuarios.infraestructura',
    'modulos.Profesionales.infraestructura',
    'modulos.Publicaciones.infraestructura',
    'modulos.Sedes.infraestructura',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # PRIMERO — para que headers CORS se envíen incluso en errores 500
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
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
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Base de datos ─────────────────────────────────────────────────────────────
import dj_database_url
import os

if os.environ.get('DEBUG') == 'True':
    # Entorno Local: Usar SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        }
    }
else:
    # Producción (Railway): Usar Neon PostgreSQL
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# ── Validación de contraseñas ─────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internacionalización ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

# ── Archivos estáticos ────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Archivos multimedia (Uploads locales como PDFs de RUT) ────────────────────
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ── Cloudinary ────────────────────────────────────────────────────────────────
if os.environ.get('CLOUDINARY_URL'):
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# ── CORS — solo orígenes permitidos ──────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False  # Solo los orígenes listados abajo tienen acceso
_CORS_BASE = [
    'https://agenda-pi-bice.vercel.app',
    'https://dist-nine-gold-65.vercel.app',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
]
# Lee la URL del frontend desde la variable de Railway y la añade si existe
_FRONTEND_URL = os.environ.get('FRONTEND_URL', '').strip().rstrip('/')
if _FRONTEND_URL and _FRONTEND_URL not in _CORS_BASE:
    _CORS_BASE.append(_FRONTEND_URL)

CORS_ALLOWED_ORIGINS = _CORS_BASE
# Permite el token JWT en los headers CORS
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'config.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Rate limiting por defecto: 60 req/min anon, 300 req/min autenticado
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/min',
        'user': '300/min',
        # Throttles específicos definidos en las vistas públicas
        'reserva_guest': '10/min',   # Máx 10 reservas/min por IP
        'slots': '60/min',           # Máx 60 consultas de slots/min
        'upload_imagen': '20/min',   # Máx 20 uploads/min
        'recuperar_password': '5/min',
    },
}

# ── JWT — tokens más cortos para mayor seguridad ─────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),    # Antes: 1 día (inseguro)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,                  # Nuevo refresh token en cada uso
    'BLACKLIST_AFTER_ROTATION': False,              # Sin blacklist (sin Redis por ahora)
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
# NUNCA hardcodear contraseñas. Si no está en env, el email falla silenciosamente.
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
# DEFAULT_FROM_EMAIL puede definirse independientemente (útil con Resend donde el user SMTP es "resend")
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL') or EMAIL_HOST_USER or 'noreply@agenda.app'
# Timeout de 8s para la conexión SMTP — evita que gunicorn mate al worker por timeout
EMAIL_TIMEOUT = 8

# ── Resend (API HTTP para emails — funciona en Railway sin restricciones SMTP) ──
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

# ── Límite de uploads (multipart) ─────────────────────────────────────────────
DATA_UPLOAD_MAX_MEMORY_SIZE = 10_485_760  # 10MB

# ── Cabeceras de seguridad HTTP ───────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
# En Railway, HTTPS es automático via proxy — activar estas solo si usas HTTPS directo
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

# ── Wompi (variables de entorno obligatorias en Railway) ─────────────────────
WOMPI_PUBLIC_KEY    = os.environ.get('WOMPI_PUBLIC_KEY', '')
WOMPI_INTEGRITY_KEY = os.environ.get('WOMPI_INTEGRITY_KEY', '')
WOMPI_EVENTS_SECRET = os.environ.get('WOMPI_EVENTS_SECRET', '')
