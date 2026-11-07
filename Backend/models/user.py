from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    student = "student"
    instructor = "instructor"
    # legacy values that may exist in older databases
    admin = "admin"
    user = "user"


class User(BaseModel):
    user_id: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    disabled: Optional[bool] = False
    roles: List[str] = Field(default_factory=lambda: ["student"])
    courses: Optional[List[str]] = Field(default_factory=list)

    # Not stored: resolved at request time from DB roles + INSTRUCTOR_EMAILS.
    role: str = "student"

    @property
    def is_instructor(self) -> bool:
        return self.role == Role.instructor.value
