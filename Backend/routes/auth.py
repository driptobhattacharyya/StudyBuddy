"""Authentication: Google OAuth (code flow with state + verified ID token) and demo logins."""
from __future__ import annotations

import hmac
import logging
import secrets
from functools import lru_cache
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import RedirectResponse

from core.config import get_settings
from core.ratelimit import auth_limiter
from core.security import (
    DEMO_EMAILS,
    CurrentUser,
    create_access_token,
    create_user,
    ensure_demo_user,
    load_user,
)
from models.model import DemoLoginRequest, TokenResponse
from utils.response import responses

log = logging.getLogger(__name__)

auth = APIRouter(prefix="/auth", tags=["Auth"])
oauth = APIRouter(tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
STATE_COOKIE = "oauth_state"


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@auth.get("/config", responses=responses)
async def auth_config():
    """Public: tells the frontend which login options to show."""
    settings = get_settings()
    return {"demo_mode": settings.demo_mode, "google_login": settings.google_login_enabled,
            "ai_provider": settings.effective_ai_provider}


@auth.post("/demo", response_model=TokenResponse, responses=responses)
async def demo_login(body: DemoLoginRequest, request: Request):
    settings = get_settings()
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")
    auth_limiter.check(f"demo:{_client_ip(request)}")
    role = body.role.lower()
    if role not in DEMO_EMAILS:
        raise HTTPException(status_code=422, detail="role must be 'student', 'instructor' or 'admin'")
    user = await run_in_threadpool(ensure_demo_user, role)
    return TokenResponse(access_token=create_access_token(user.email, user.role), role=user.role)


@auth.get("/me", responses=responses)
async def me(user: CurrentUser):
    return {
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "courses": user.courses or [],
    }


# ---------------------------------------------------------------- Google ----
@oauth.get("/login/google", include_in_schema=False)
async def login_google():
    settings = get_settings()
    if not settings.google_login_enabled:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    state = secrets.token_urlsafe(32)
    query = urlencode({
        "response_type": "code",
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "scope": "openid profile email",
        "state": state,
        "prompt": "select_account",
    })
    response = RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")
    response.set_cookie(
        STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax",
        secure=settings.google_redirect_uri.startswith("https://"),
    )
    return response


@lru_cache
def _jwk_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True)


def verify_google_id_token(id_token: str) -> dict:
    """Verify signature, audience, issuer and expiry of a Google ID token."""
    settings = get_settings()
    signing_key = _jwk_client().get_signing_key_from_jwt(id_token)
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.google_client_id,
        options={"require": ["exp", "iss", "aud", "sub"]},
    )
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise jwt.InvalidIssuerError("Invalid issuer")
    return claims


@oauth.get("/oauth/callback", include_in_schema=False)
async def oauth_callback(request: Request, code: str | None = None, state: str | None = None,
                         error: str | None = None):
    settings = get_settings()
    if error:
        raise HTTPException(status_code=400, detail=f"Google sign-in failed: {error}")
    cookie_state = request.cookies.get(STATE_COOKIE)
    if not code or not state or not cookie_state or not hmac.compare_digest(state, cookie_state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    if not settings.google_login_enabled:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_res = await client.post(GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            })
        token_res.raise_for_status()
        id_token = token_res.json().get("id_token")
        if not id_token:
            raise ValueError("No id_token in response")
        claims = await run_in_threadpool(verify_google_id_token, id_token)
    except (httpx.HTTPError, ValueError, jwt.PyJWTError):
        log.warning("Google token exchange/verification failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Could not verify Google sign-in") from None

    email = (claims.get("email") or "").lower()
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    user = load_user(email) or create_user(email, claims.get("name"), claims.get("picture"))
    if user.disabled:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token(user.email, user.role)
    response = RedirectResponse(f"{settings.frontend_url.rstrip('/')}/auth/callback#token={token}")
    response.delete_cookie(STATE_COOKIE)
    log.info("User signed in via Google: role=%s", user.role)
    return response
