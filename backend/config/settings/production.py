from .base import *

DEBUG = False

if not ALLOWED_HOSTS:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set in production. "
        'Example: ALLOWED_HOSTS="api.example.com,www.example.com"'
    )

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in production.")

# Explicit allow-list only - CORS_ALLOW_ALL_ORIGINS stays False (see base.py).
# Example: CORS_ALLOWED_ORIGINS="https://app.example.com"
if not CORS_ALLOWED_ORIGINS:
    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS must list the frontend origin(s) in production. "
        'Example: CORS_ALLOWED_ORIGINS="https://app.example.com"'
    )

# Tell Django it is behind a TLS-terminating proxy (nginx, a load balancer, a
# PaaS router) so request.is_secure() reports the truth and the redirect below
# does not turn into an infinite loop.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True

# HSTS: after the first visit, browsers refuse to talk to this host over plain
# HTTP for a year. Start with a small max-age when you first deploy - the header
# is cached by the browser and is awkward to undo.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session and CSRF cookies must not travel over plain HTTP.
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Stops the browser from guessing a response's content type, which is a common
# vector for turning an uploaded file into executable script.
SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"
