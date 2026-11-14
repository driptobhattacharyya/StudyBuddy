"""JWT handling, role resolution and FastAPI auth dependencies."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from core.config import get_settings
from database.db import db
from models.user import User

log = logging.getLogger(__name__)

STUDENT = "student"
INSTRUCTOR = "instructor"
ADMIN = "admin"
ROLES = (STUDENT, INSTRUCTOR, ADMIN)
DEMO_EMAILS = {
    STUDENT: "demo.student@studybuddy.dev",
    INSTRUCTOR: "demo.instructor@studybuddy.dev",
    ADMIN: "demo.admin@studybuddy.dev",
}
_DEMO_NAMESPACE = uuid.UUID("6f1c2f0e-0b0e-4f59-9a54-3b3b0e5a5b11")

bearer_auth = HTTPBearer(scheme_name="BearerAuth", auto_error=False)


# ---------------------------------------------------------------- roles ----
def resolve_role(email: str, roles: list[str] | None) -> str:
    """admin > instructor > student. Env lists and stored roles are both honoured."""
    settings = get_settings()
    e = email.lower()
    if e in settings.admin_emails_set or (roles and "admin" in roles):
        return ADMIN
    if e in settings.instructor_emails_set or (roles and "instructor" in roles):
        return INSTRUCTOR
    if roles:  # an explicit stored role (e.g. changed by an admin) always wins over the demo defaults
        return STUDENT
    if settings.demo_mode and e in DEMO_EMAILS.values():
        return next(r for r, m in DEMO_EMAILS.items() if m == e)
    return STUDENT


# --------------------------------------------------------------- tokens ----
def create_access_token(email: str, role: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": email, "role": role, "scopes": [role], "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


# ---------------------------------------------------------------- users ----
def load_user(email: str) -> User | None:
    doc = db.user.find_one({"email": email})
    if not doc:
        return None
    doc.pop("_id", None)
    doc["role"] = resolve_role(doc["email"], doc.get("roles"))
    return User(**doc)


def create_user(email: str, name: str | None, picture: str | None = None, roles: list[str] | None = None,
                user_id: str | None = None) -> User:
    update: dict = {
        "$setOnInsert": {
            "user_id": user_id or str(uuid.uuid4()), "email": email, "roles": roles or [STUDENT],
            "courses": [], "disabled": False,
        }
    }
    profile = {k: v for k, v in {"name": name, "picture": picture}.items() if v}
    if profile:  # Mongo rejects an empty $set
        update["$set"] = profile
    db.user.update_one({"email": email}, update, upsert=True)
    user = load_user(email)
    assert user is not None
    return user


def demo_user_id(role: str) -> str:
    return str(uuid.uuid5(_DEMO_NAMESPACE, DEMO_EMAILS[role]))


def ensure_demo_user(role: str) -> User:
    """Create (if missing) the demo user and enrol them in every course."""
    email = DEMO_EMAILS[role]
    name = f"Demo {role.title()}"
    user = create_user(email, name, roles=[role], user_id=demo_user_id(role))
    if not user.courses:
        ids = [c["course_id"] for c in db.course.find({}, {"course_id": 1})]
        if ids:
            db.user.update_one({"email": email}, {"$set": {"courses": ids}})
            user = load_user(email)  # type: ignore[assignment]
    return user


# --------------------------------------------------------- dependencies ----
def _unauthorized(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"}
    )


def user_from_token(token: str) -> User:
    try:
        payload = decode_token(token)
    except InvalidTokenError:
        raise _unauthorized() from None
    email = payload.get("sub")
    if not email:
        raise _unauthorized()
    user = load_user(email)
    if user is None:
        raise _unauthorized()
    if user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_auth)],
) -> User:
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Not authenticated")
    return user_from_token(credentials.credentials)


CurrentUser = Annotated[User, Depends(get_current_active_user)]


def require_instructor(user: CurrentUser) -> User:
    if user.role not in (INSTRUCTOR, ADMIN):
        raise HTTPException(status_code=403, detail="Instructor role required")
    return user


def require_student(user: CurrentUser) -> User:
    if user.role != STUDENT:
        raise HTTPException(status_code=403, detail="Student role required")
    return user


InstructorUser = Annotated[User, Depends(require_instructor)]
StudentUser = Annotated[User, Depends(require_student)]


def require_admin(user: CurrentUser) -> User:
    if user.role != ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
