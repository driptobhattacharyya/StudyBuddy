from typing import Annotated

from fastapi import Depends

from core.ratelimit import ai_limiter, run_limiter
from core.security import CurrentUser
from models.user import User


async def ai_user(user: CurrentUser) -> User:
    ai_limiter.check(user.email)
    return user


async def run_user(user: CurrentUser) -> User:
    run_limiter.check(user.email)
    return user


AIUser = Annotated[User, Depends(ai_user)]
RunUser = Annotated[User, Depends(run_user)]
