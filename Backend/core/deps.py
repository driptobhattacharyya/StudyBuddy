from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException

from core.config import get_settings
from core.ratelimit import ai_limiter, run_limiter
from core.security import CurrentUser
from database.db import db
from models.user import User


def check_daily_cap() -> None:
    """Global (all users) AI request cap per UTC day, counted from ai_logs."""
    cap = get_settings().ai_daily_request_cap
    midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    if db.ai_logs.count_documents({"created_at": {"$gte": midnight}}) >= cap:
        raise HTTPException(
            status_code=429,
            detail="Study Buddy's AI has used up today's free demo budget. Please come back tomorrow!",
            headers={"Retry-After": "3600"},
        )


def ai_user(user: CurrentUser) -> User:
    ai_limiter.check(user.email)
    check_daily_cap()
    return user


def run_user(user: CurrentUser) -> User:
    run_limiter.check(user.email)
    return user


AIUser = Annotated[User, Depends(ai_user)]
RunUser = Annotated[User, Depends(run_user)]
